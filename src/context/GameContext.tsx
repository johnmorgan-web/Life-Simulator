// During migration we re-export the existing JS implementation to avoid duplication.
import React, { createContext, useContext, useEffect, useReducer } from 'react'
import cityData from '../constants/cityData.constants'
import jobBoard from '../constants/jobBoard.constants'
import lifeEvents from '../constants/lifeEvents.constants'
import transitOptions from '../constants/transitOptions.constants'
import academyCourses from '../constants/academyCourses.constants'
import gameValues from '../constants/gameValues.constants'
import type { Job, Application } from '../types/models.types'

type State = any

const initialState: State = {
	check: 1200.0,
	save: 0,
	debt: 0,
	credit: 600,
	month: 2,
	year: 2026,
	city: cityData[3],
	job: { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 },
	transit: { name: 'Walk/Bike', cost: 15, level: 1 },
	activeEdu: null,
	eduProgress: { 'HS Diploma': 0, 'Trade Cert': 0, 'Degree': 0 },
	ledger: [],
	name: 'John Morgan',
	tenure: 0,
	logs: [],
	careerHistory: [],
	credentials: [],
	credentialHistory: [],
	applications: [],
	pendingJob: null,
	pendingTransit: null,
	pendingCity: null,
	eventHistory: [],
	jobStartMonth: 2,
	jobStartYear: 2026,
	showSettlement: false,
	applicationResults: []
}

const GameContext = createContext<any>(null)

const fix = (n: number) => Math.round(n * 100) / 100

function reducer(state: State, action: any) {
	switch (action.type) {
		case 'INIT_LEDGER':
			return { ...state, ledger: action.payload }
		case 'CHECK_ROW': {
			const { id, done, newCheck } = action.payload
			const ledger = state.ledger.map((tx: any) => (tx.id === id ? { ...tx, done } : tx))
			return { ...state, ledger, check: newCheck ?? state.check }
		}
		case 'PROCESS_MONTH': {
			const { paySave = 0, payDebt = 0 } = action.payload
			const nextMonth = state.month === 12 ? 1 : state.month + 1
			const nextYear = state.month === 12 ? state.year + 1 : state.year
			const check = fix(state.check - (paySave + payDebt))

			const eduProgress = { ...state.eduProgress }
			let activeEdu = state.activeEdu
			const credentials = [...state.credentials]
			const credentialHistory = [...state.credentialHistory]
			const logs = [...state.logs]
			const careerHistory = [...state.careerHistory]
			let job = state.job
			let tenure = state.tenure
			if (state.activeEdu) {
				eduProgress[state.activeEdu] = (eduProgress[state.activeEdu] || 0) + 1
				const course = academyCourses.find(c => c.n === state.activeEdu)
				const needed = course ? course.m : Infinity
				if (eduProgress[state.activeEdu] >= needed) {
					const monthsStudied = eduProgress[state.activeEdu]
					credentials.push(state.activeEdu)
					credentialHistory.push({ name: state.activeEdu, month: nextMonth, year: nextYear, months: monthsStudied })
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Graduated: ${state.activeEdu} (${monthsStudied} mo)` })
					activeEdu = null
				} else {
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Continued study: ${state.activeEdu}` })
				}
			}

			let transit = state.transit
			if (state.pendingTransit) {
				transit = { name: state.pendingTransit.n, cost: state.pendingTransit.c, level: state.pendingTransit.l }
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Transit changed to ${state.pendingTransit.n}` })
			}

			// If a city relocation was requested previously, apply it now at the start of the new month.
			let city = state.city
			if (state.pendingCity) {
				city = state.pendingCity
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Relocated to ${state.pendingCity.name}` })
			}

			// If a job was accepted previously, apply it now at the start of the new month.
			if (state.pendingJob) {
				// record prior job with full dates and months (no extra month added)
				const prev = state.job
				careerHistory.push({
					title: prev.title,
					startMonth: state.jobStartMonth,
					startYear: state.jobStartYear,
					endMonth: nextMonth,
					endYear: nextYear,
					months: state.tenure
				})
				// switch to the new job
				job = state.pendingJob
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Started job: ${state.pendingJob.title}` })
				// reset tenure and start times and set new job start
				tenure = 0;
			} else {
				// no job change, increment tenure
				tenure = state.tenure + 1
			}

			return {
				...state,
				check,
				save: state.save + paySave,
				// Apply relocation cost if moving this month
				debt: fix(state.debt - payDebt + (state.pendingCity ? 1500 : 0)),
				tenure,
				showSettlement: false,
				month: nextMonth,
				year: nextYear,
				activeEdu,
				eduProgress,
				credentials,
				credentialHistory,
				transit,
				pendingTransit: null,
				city,
				pendingCity: null,
				logs,
				careerHistory,
				job,
				pendingJob: null,
				jobStartMonth: state.pendingJob ? nextMonth : state.jobStartMonth,
				jobStartYear: state.pendingJob ? nextYear : state.jobStartYear
			}
		}
		case 'TOGGLE_SETTLEMENT':
			return { ...state, showSettlement: !state.showSettlement }
		case 'APPLY_JOB': {
			const app = action.payload
			return { ...state, applications: [...state.applications, app], logs: [...state.logs, { date: `${state.month}/${state.year}`, msg: `Applied for ${app.job.title}` }] }
		}
		case 'SET_STATE':
			return { ...state, ...action.payload }
		default:
			return state
	}
}

export function GameProvider({ children }: { children: React.ReactNode }) {
	const [state, dispatch] = useReducer(reducer, initialState)

	useEffect(() => {
		buildLedger()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	function buildLedger(paySave = 0, payDebt = 0) {
		const ledger: any[] = []

		// Start with previous balance after payments
		let bal = state.check - paySave - payDebt;
		ledger.push({ id: 0, desc: 'Previous Balance', amt: 0, type: 'none', bal, done: true })
		
		// Rent/Housing cost
		const rent = fix(gameValues.rentBase * state.city.r)
		bal = fix(bal - rent)
		ledger.push({ id: 1, desc: 'Housing/Rent Payment', amt: rent, type: 'out', bal, done: false })
		
		// Transit cost
		bal = fix(bal - state.transit.cost)
		ledger.push({ id: 2, desc: `Transit: ${state.transit.name}`, amt: state.transit.cost, type: 'out', bal, done: false })
		
		// Education cost if currently studying
		if (state.activeEdu) {
			const eduCosts: any = { 'HS Diploma': gameValues.hsDiplomaCost, 'Trade Cert': gameValues.tradeCertCost, 'Degree': gameValues.degreeCost }
			const cost = eduCosts[state.activeEdu]
			bal = fix(bal - cost)
			ledger.push({ id: 5, desc: `Tuition: ${state.activeEdu}`, amt: cost, type: 'out', bal, done: false })
		}

		// Salary
		/// Get job from pendingJob if exists
		const job = state.pendingJob || state.job;
		
		const netPay = fix(job.base * state.city.p * 0.8)
		bal = fix(bal + netPay)

		ledger.push({ id: 3, desc: `Net Salary: ${job.title}`, amt: netPay, type: 'inc', bal, done: false })
		dispatch({ type: 'INIT_LEDGER', payload: ledger })
	}

	function checkRow(id: number, value: number) {
		const tx = state.ledger.find((t: any) => t.id === id)
		if (!tx) return
		const done = Math.abs(value - tx.bal) < 0.01
		const newCheck = done ? value : undefined
		dispatch({ type: 'CHECK_ROW', payload: { id, done, newCheck } })
	}

	function processMonth(paySave = 0, payDebt = 0) {
		dispatch({ type: 'PROCESS_MONTH', payload: { paySave, payDebt } })
		// Rebuild ledger after state has updated from the reducer
		setTimeout(() => buildLedger(paySave, payDebt), 0)
	}

	function evaluateApplications() {
		const apps = [...state.applications]
		const results: any[] = []
		const logs = [...state.logs]
		let changed = false

		apps.forEach(app => {
			if (app.status === 'pending' && app.decisionMonth === state.month && app.decisionYear === state.year) {
				let accepted = false
				if (app.score >= 75) accepted = Math.random() < 0.95
				else if (app.score >= 60) accepted = Math.random() < 0.65
				else if (app.score >= 50) accepted = Math.random() < 0.40
				else accepted = Math.random() < 0.15

				if (accepted) {
					app.status = 'accepted'
					results.push({ id: app.id, status: 'accepted', title: app.job.title, job: app.job })
					logs.push({ date: `${state.month}/${state.year}`, msg: `Hired for ${app.job.title}` })
				} else {
					app.status = 'rejected'
					results.push({ id: app.id, status: 'rejected', title: app.job.title, job: app.job })
					logs.push({ date: `${state.month}/${state.year}`, msg: `Application rejected for ${app.job.title}` })
				}
				changed = true
			}
		})

		if (changed) {
			dispatch({ type: 'SET_STATE', payload: { applications: apps, logs, applicationResults: results } })
		} else {
			dispatch({ type: 'SET_STATE', payload: { applicationResults: [] } })
		}
		return results
	}

	function acceptJob(appId: string) {
		const apps = state.applications.map((a: any) => ({ ...a, chosen: a.id === appId }))
		const chosen = apps.find((a: any) => a.id === appId && a.status === 'accepted')
		if (!chosen) {
			dispatch({ type: 'SET_STATE', payload: { applications: apps } })
			return
		}
		// mark the chosen application and set as pendingJob to apply at next month progression
		dispatch({ type: 'SET_STATE', payload: { applications: apps, pendingJob: chosen.job } })
	}

	function openSettlement() {
		evaluateApplications()
		dispatch({ type: 'SET_STATE', payload: { showSettlement: true } })
	}

	function scoreApplication(job: Job) {
		let score = 50
		if (job.req) {
			if (state.credentials.includes(job.req)) score += 20
			else score -= 15
		} else score += 10
		if (state.credit >= 740) score += 10
		else if (state.credit >= 670) score += 5
		else if (state.credit < 580) score -= 10
		if (state.tenure >= 12) score += 15
		else if (state.tenure >= 6) score += 10
		else if (state.tenure >= 3) score += 5
		if (state.careerHistory.length > 3) score += 10
		else if (state.careerHistory.length > 0) score += 5
		if (state.credentials.length > 0) score += 10
		score = Math.max(0, Math.min(100, score))
		score += Math.random() * 20 - 10
		return Math.round(score)
	}

	function applyForJob(job: Job) {
		const score = scoreApplication(job)
		const appliedMonth = state.month
		const appliedYear = state.year
		const decisionMonth = appliedMonth + 1 + Math.floor(Math.random() * 3)
		let dMonth = decisionMonth
		let dYear = appliedYear
		if (dMonth > 12) {
			dYear += Math.floor(dMonth / 12)
			dMonth = dMonth % 12 || 12
		}

		// Adjust job base pay to be a random +- value up to 5% to add some variability to offers
		const variability = job.base * 0.05;
		const adjustedBase = job.base + (Math.random() * variability * 2 - variability);
		job.base = adjustedBase;
		const app: Application = {
			id: `app_${Date.now()}`,
			job,
			appliedMonth,
			appliedYear,
			decisionMonth: dMonth,
			decisionYear: dYear,
			score,
			status: 'pending'
		}
		dispatch({ type: 'APPLY_JOB', payload: app })
	}

	return (
		<GameContext.Provider value={{ state, dispatch, buildLedger, checkRow, processMonth, applyForJob, openSettlement, evaluateApplications, acceptJob, jobBoard, cityData, lifeEvents, transitOptions, academyCourses }}>
			{children}
		</GameContext.Provider>
	)
}

export function useGame() {
	return useContext(GameContext)
}

export default GameContext
