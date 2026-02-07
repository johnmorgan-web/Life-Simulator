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

const initializeEduProgress = () => {
	const progress: any = {}
	academyCourses.forEach(course => {
		progress[course.n] = 0
	})
	return progress
}

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
	eduProgress: initializeEduProgress(),
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
	applicationResults: [],
	// Lifestyle and luxury services
	luxuryServices: {
		chef: false,
		housekeeper: false,
		chauffer: false,
		therapist: false,
		trainer: false,
		concierge: false
	},
	entertainmentSpending: 0, // How much user spends on entertainment per month
	celebration: null as 'pay-bump' | 'degree' | 'certification' | 'car-paid-off' | 'debt-paid-off' | 'promotion' | 'job-accepted' | null,
	// Credit tracking
	paymentStreak: 0, // Consecutive on-time payments
	calculationStreak: 0, // Consecutive correct balance checks
	lastPaymentOnTime: true,
	skippedPaymentThisMonth: false
}

const GameContext = createContext<any>(null)

const fix = (n: number) => Math.round(n * 100) / 100

// Dynamic APR based on credit score
// 300 credit = 21% APR, 600 credit = 10.5% APR, 850 credit = 3% APR
function calculateDynamicAPR(creditScore: number): number {
	if (creditScore < 300) return 0.21
	if (creditScore >= 850) return 0.03
	// Linear interpolation between ranges
	if (creditScore < 600) {
		// 300-600: 21% to 10.5%
		return 0.21 - ((creditScore - 300) / 300) * 0.105
	} else {
		// 600-850: 10.5% to 3%
		return 0.105 - ((creditScore - 600) / 250) * 0.075
	}
}

// Housing tier based on credit score
function getHousingTier(creditScore: number): { name: string; multiplier: number } {
	if (creditScore >= 750) return { name: 'Luxury', multiplier: 1.5 }
	if (creditScore >= 700) return { name: 'Premium', multiplier: 1.25 }
	if (creditScore >= 650) return { name: 'Standard', multiplier: 1.0 }
	if (creditScore >= 600) return { name: 'Budget', multiplier: 0.85 }
	return { name: 'Basic', multiplier: 0.7 }
}

// Salary bonus multiplier based on credit score (0-15% bonus)
function calculateCreditBonus(creditScore: number): number {
	if (creditScore < 300) return 0
	if (creditScore >= 800) return 0.15
	return ((creditScore - 300) / 550) * 0.15
}

function mulberry32(a: number) {
	return function() {
		let t = a += 0x6D2B79F5
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// Deterministic seasonal + noise multiplier based on year/month/category/cityName
function variableMultiplier(year: number, month: number, category: 'utilities' | 'food' | 'gas' | 'car' | 'entertainment', cityName: string = '') {
	const seasonal: Record<string, number[]> = {
		utilities: [0.02, 0.03, 0.02, 0.00, -0.01, -0.02, 0.03, 0.03, 0.01, 0.00, 0.01, 0.04],
		food: [0.00, 0.00, 0.00, 0.00, 0.01, 0.01, 0.00, 0.01, 0.00, 0.00, 0.03, 0.04],
		gas: [0.01, 0.01, 0.00, 0.00, 0.00, 0.03, 0.04, 0.03, 0.01, 0.00, 0.00, 0.00],
		car: [0.02, 0.02, 0.01, 0.00, 0.00, -0.01, -0.01, 0.00, 0.01, 0.02, 0.02, 0.02],
		entertainment: [0.00, 0.02, 0.03, 0.02, 0.01, 0.00, -0.01, 0.00, 0.01, 0.02, 0.03, 0.04]
	}

	const m = Math.max(1, Math.min(12, Math.floor(month)))
	const season = (seasonal[category] && seasonal[category][m - 1]) || 0

	// Build a seed from year, month, category, and city name to ensure reproducibility across playthroughs
	let catHash = 0
	for (let i = 0; i < category.length; i++) catHash = (catHash * 31 + category.charCodeAt(i)) >>> 0
	let cityHash = 0
	for (let i = 0; i < cityName.length; i++) cityHash = (cityHash * 31 + cityName.charCodeAt(i)) >>> 0
	const seed = (year * 100 + m) ^ catHash ^ cityHash
	const rnd = mulberry32(seed)()
	// deterministic noise in [-0.02, 0.02]
	const noise = rnd * 0.04 - 0.02

	let adjust = season + noise
	if (adjust > 0.05) adjust = 0.05
	if (adjust < -0.05) adjust = -0.05

	return 1 + adjust
}

function variableCost(base: number, month: number, year: number, cityMultiplier = 1, category: 'utilities' | 'food' | 'gas' | 'car' | 'entertainment', cityName: string = '') {
	const mult = variableMultiplier(year, month, category, cityName)
	return fix(base * cityMultiplier * mult)
}

function reducer(state: State, action: any) {
	switch (action.type) {
		case 'INIT_LEDGER':
			return { ...state, ledger: action.payload }
		case 'CHECK_ROW': {
			const { id, done, newCheck, expectedCheck } = action.payload
			const ledger = state.ledger.map((tx: any) => (tx.id === id ? { ...tx, done } : tx))
			let resultingCheck = newCheck ?? state.check
			let newDebt = state.debt
			let credit = state.credit
			let calculationStreak = state.calculationStreak
			const logs = [...state.logs]
			
			// Validate calculation accuracy for credit scoring
			if (expectedCheck !== undefined && newCheck !== undefined) {
				if (Math.abs(newCheck - expectedCheck) < 0.01) {
					// Correct calculation
					calculationStreak += 1
					const streakBonus = Math.min(25, Math.floor(calculationStreak / 5) * 5) // 5 points per 5 consecutive checks, max 25
					credit = Math.min(850, credit + 2 + streakBonus)
					if (calculationStreak % 5 === 0) {
						logs.push({ date: `${state.month}/${state.year}`, msg: `✅ Calculation streak (${calculationStreak}) - credit +${2 + streakBonus} (${credit})` })
					}
				} else {
					// Incorrect calculation
					const difference = Math.abs(newCheck - expectedCheck)
					const penalty = Math.min(30, Math.ceil(difference / 10)) // Higher penalties for bigger errors
					credit = Math.max(300, credit - penalty)
					calculationStreak = 0
					logs.push({ date: `${state.month}/${state.year}`, msg: `❌ Incorrect balance - error of $${difference.toFixed(2)}, credit -${penalty} (${credit})` })
				}
			}
			
			if (newCheck !== undefined && newCheck < 0) {
				const loanAmt = fix(Math.abs(newCheck))
				newDebt = fix(state.debt + loanAmt)
				logs.push({ date: `${state.month}/${state.year}`, msg: `Auto-loan taken: $${loanAmt.toFixed(2)} to cover negative checking` })
				resultingCheck = 0
			}
			return { ...state, ledger, check: resultingCheck, debt: newDebt, credit, calculationStreak, paymentStreak: state.paymentStreak, logs }
		}
		case 'PROCESS_MONTH': {
			const { paySave = 0, payDebt = 0, skippedPayment = false } = action.payload
			const nextMonth = state.month === 12 ? 1 : state.month + 1
			const nextYear = state.month === 12 ? state.year + 1 : state.year
			const check = fix(state.check - (paySave + payDebt))

			let resultingCheck = check

			const eduProgress = { ...state.eduProgress }
			let activeEdu = state.activeEdu
			const credentials = [...state.credentials]
			const credentialHistory = [...state.credentialHistory]
			const logs = [...state.logs]
			const careerHistory = [...state.careerHistory]
			let job = state.job
			let tenure = state.tenure
			let celebration = null as 'degree' | 'certification' | 'job-accepted' | 'promotion' | 'debt-paid-off' | 'car-paid-off' | null
			
			// Credit tracking
			let credit = state.credit
			let paymentStreak = state.paymentStreak

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
					// Trigger celebration for degree or certification
					const courseType = course?.type || 'degree'
					celebration = courseType === 'cert' ? 'certification' : 'degree'
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

			// Track debt/car payoff before applying new debt
			let debtBefore = state.debt
			let newDebt = fix(state.debt - payDebt + (state.pendingCity ? 1500 : 0))

			// If the player's immediate payments push checking negative, convert shortfall into an auto-loan
			if (resultingCheck < 0) {
				const shortfall = fix(Math.abs(resultingCheck))
				newDebt = fix(newDebt + shortfall)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Auto-loan taken: $${shortfall.toFixed(2)} to cover monthly payments` })
				resultingCheck = 0
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
				// Check if it's a promotion (higher salary) or job acceptance
				const isPromotion = state.pendingJob.base > state.job.base
				// switch to the new job
				job = state.pendingJob
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Started job: ${state.pendingJob.title}` })
				// reset tenure and start times and set new job start
				tenure = 0
				// Trigger celebration for job acceptance/promotion
				celebration = isPromotion ? 'promotion' : 'job-accepted'
			} else {
				// no job change, increment tenure
				tenure = state.tenure + 1
			}

			// Check for debt payoff
			if (debtBefore > 0 && newDebt <= 0) {
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: 'Debt eliminated!' })
				celebration = 'debt-paid-off'
				newDebt = 0
			}

			// Apply monthly interest on debt with dynamic APR based on credit score
			let saveBefore = state.save + paySave
			if (newDebt > 0) {
				const dynamicAPR = calculateDynamicAPR(credit)
				const monthlyDebtInterest = fix(newDebt * (dynamicAPR / 12))
				newDebt = fix(newDebt + monthlyDebtInterest)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Loan interest charged (${(dynamicAPR * 100).toFixed(2)}% APR): $${monthlyDebtInterest.toFixed(2)}` })
				
				// Track payment on-time status for credit scoring
				if (skippedPayment) {
					credit = Math.max(300, credit - 50) // Major credit hit for skipped payment
					paymentStreak = 0
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `⚠️ Payment skipped - credit score reduced by 50 points (${credit})` })
				} else if (payDebt > 0) {
					// On-time payment improves credit
					paymentStreak += 1
					const streakBonus = Math.min(30, Math.floor(paymentStreak / 3) * 5) // 5 points per 3 consecutive payments, max 30
					credit = Math.min(850, credit + 5 + streakBonus)
					if (paymentStreak % 3 === 0) {
						logs.push({ date: `${nextMonth}/${nextYear}`, msg: `✅ On-time payment streak (${paymentStreak} months) - credit +${5 + streakBonus} (${credit})` })
					} else {
						logs.push({ date: `${nextMonth}/${nextYear}`, msg: `✅ On-time payment - credit +5 (${credit})` })
					}
				} else {
					// Minimum payment required to maintain credit
					credit = Math.max(300, credit - 20)
					paymentStreak = 0
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Payment missed - credit score reduced by 20 points (${credit})` })
				}
			}


			// Apply monthly interest to savings (HYSA)
			let newSave = fix(saveBefore)
			if (saveBefore > 0) {
				const monthlySaveInterest = fix(saveBefore * (gameValues.hysaAPR / 12))
				newSave = fix(saveBefore + monthlySaveInterest)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Savings interest earned (${(gameValues.hysaAPR * 100).toFixed(2)}% APY): $${monthlySaveInterest.toFixed(2)}` })
			}

			// Note: Car loan payoff would be tracked if we had a car loan field - adding for future use
			// if (carLoanBefore > 0 && carLoanAfter <= 0) celebration = 'car-paid-off'

			return {
				...state,
				check: resultingCheck,
				save: newSave,
				debt: newDebt,
				credit,
				paymentStreak,
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
				jobStartYear: state.pendingJob ? nextYear : state.jobStartYear,
				celebration,
				skippedPaymentThisMonth: false
			}
		}
		case 'TOGGLE_SETTLEMENT':
			return { ...state, showSettlement: !state.showSettlement }
		case 'APPLY_JOB': {
			const app = action.payload
			return { ...state, applications: [...state.applications, app], logs: [...state.logs, { date: `${state.month}/${state.year}`, msg: `Applied for ${app.job.title}` }] }
		}
		case 'TRIGGER_CELEBRATION':
			return { ...state, celebration: action.payload }
		case 'CLEAR_CELEBRATION':
			return { ...state, celebration: null }
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
		let id = 0

		// Start with previous balance after payments
		let bal = state.check - paySave - payDebt;
		ledger.push({ id: id++, desc: 'Previous Balance', amt: 0, type: 'none', bal, done: true })
		
		// Get current job and calculate net salary
		const job = state.pendingJob || state.job
		const grossSalary = fix(job.base * state.city.p)
		const netSalary = fix(grossSalary * 0.8) // 80% after taxes
		
		// INCOME
		bal = fix(bal + netSalary)
		ledger.push({ id: id++, desc: `Net Salary: ${job.title}`, amt: netSalary, type: 'inc', bal, done: false })
		
		// HOUSING - Dynamic rent based on 30% of salary
		const rent = fix(netSalary * gameValues.rentPercentOfSalary * state.city.r)
		bal = fix(bal - rent)
		ledger.push({ id: id++, desc: `Housing/Rent Payment (${Math.round(gameValues.rentPercentOfSalary * 100)}% salary)`, amt: rent, type: 'out', bal, done: false })
		
		// TRANSPORTATION
		// If chauffeur hired, no gas/transit cost (chauffeur covers it)
		if (!state.luxuryServices.chauffer) {
			// Transit cost
			bal = fix(bal - state.transit.cost)
			ledger.push({ id: id++, desc: `Transit: ${state.transit.name}`, amt: state.transit.cost, type: 'out', bal, done: false })
			
			// Gas cost (if not using Walk/Bike)
				if (state.transit.level > 1) {
					const gas = variableCost(gameValues.gasCostBase * 0.5, state.month, state.year, state.city.p, 'gas', state.city.name)
					const carMaint = variableCost(gameValues.carMaintenance, state.month, state.year, state.city.p, 'car', state.city.name)
				const gasAndMaint = fix(gas + carMaint)
				bal = fix(bal - gasAndMaint)
				ledger.push({ id: id++, desc: 'Gas & Car Maintenance', amt: gasAndMaint, type: 'out', bal, done: false })
			}
		} else {
			// Chauffeur cost handled in luxury services section
		}
		
		// UTILITIES & PHONE (utilities vary seasonally)
		const utilities = variableCost(gameValues.utilitiesCostBase, state.month, state.year, state.city.p, 'utilities', state.city.name)
		const phoneInternet = gameValues.phoneInternetBase
		const totalUtilities = fix(utilities + phoneInternet)
		bal = fix(bal - totalUtilities)
		ledger.push({ id: id++, desc: 'Utilities & Phone/Internet', amt: totalUtilities, type: 'out', bal, done: false })
		
		// FOOD - If personal chef hired, no food costs (chef provides meals)
		if (!state.luxuryServices.chef) {
			const foodCost = variableCost(gameValues.foodCostBase * 0.8, state.month, state.year, state.city.p, 'food', state.city.name)
			bal = fix(bal - foodCost)
			ledger.push({ id: id++, desc: 'Food & Groceries', amt: foodCost, type: 'out', bal, done: false })
		}
		
		// ENTERTAINMENT
		if (state.entertainmentSpending > 0) {
			const entertainmentCost = variableCost(state.entertainmentSpending, state.month, state.year, 1, 'entertainment', state.city.name)
			bal = fix(bal - entertainmentCost)
			ledger.push({ id: id++, desc: 'Entertainment & Subscriptions', amt: entertainmentCost, type: 'out', bal, done: false })
		}
		
		// EDUCATION - If currently studying
		if (state.activeEdu) {
			const course = academyCourses.find(c => c.n === state.activeEdu)
			const cost = course ? course.c : 1000
			bal = fix(bal - cost)
			ledger.push({ id: id++, desc: `Tuition: ${state.activeEdu}`, amt: cost, type: 'out', bal, done: false })
		}
		
		// LUXURY SERVICES
		let luxuryCosts = 0
		const luxuryServicesList: string[] = []
		
		if (state.luxuryServices.chef) {
			const chefCost = variableCost(gameValues.foodCostBase * 15, state.month, state.year, state.city.p, 'food', state.city.name) // Personal chef scales with food costs
			luxuryCosts += chefCost
			luxuryServicesList.push(`Chef: $${chefCost}`)
		}
		if (state.luxuryServices.housekeeper) {
			const housekeeperCost = 2000
			luxuryCosts += housekeeperCost
			luxuryServicesList.push(`Housekeeper: $${housekeeperCost}`)
		}
		if (state.luxuryServices.chauffer) {
			const chauffeurCost = 3500
			luxuryCosts += chauffeurCost
			luxuryServicesList.push(`Chauffeur: $${chauffeurCost}`)
		}
		if (state.luxuryServices.therapist) {
			const therapistCost = 2500
			luxuryCosts += therapistCost
			luxuryServicesList.push(`Therapist: $${therapistCost}`)
		}
		if (state.luxuryServices.trainer) {
			const trainerCost = 1500
			luxuryCosts += trainerCost
			luxuryServicesList.push(`Trainer: $${trainerCost}`)
		}
		if (state.luxuryServices.concierge) {
			const conciergeCost = 3000
			luxuryCosts += conciergeCost
			luxuryServicesList.push(`Concierge: $${conciergeCost}`)
		}
		
		if (luxuryCosts > 0) {
			bal = fix(bal - luxuryCosts)
			ledger.push({ 
				id: id++, 
				desc: `Luxury Services (${luxuryServicesList.length})`, 
				amt: luxuryCosts, 
				type: 'out', 
				bal, 
				done: false,
				details: luxuryServicesList
			})
		}
		
		dispatch({ type: 'INIT_LEDGER', payload: ledger })
	}

	function checkRow(id: number, value: number, expectedCheck?: number) {
		const tx = state.ledger.find((t: any) => t.id === id)
		if (!tx) return
		const done = Math.abs(value - tx.bal) < 0.01
		const newCheck = done ? value : undefined
		dispatch({ type: 'CHECK_ROW', payload: { id, done, newCheck, expectedCheck } })
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
		// Trigger celebration for accepted job (celebration type will be determined in processMonth based on if it's a promotion)
		if (chosen.job.base > state.job.base) {
			triggerCelebration('promotion')
		} else {
			triggerCelebration('job-accepted')
		}
	}

	function openSettlement() {
		evaluateApplications()
		dispatch({ type: 'SET_STATE', payload: { showSettlement: true } })
	}

	function triggerCelebration(event: 'pay-bump' | 'degree' | 'certification' | 'car-paid-off' | 'debt-paid-off' | 'promotion' | 'job-accepted') {
		dispatch({ type: 'TRIGGER_CELEBRATION', payload: event })
		// Auto-clear after animation
		setTimeout(() => {
			dispatch({ type: 'CLEAR_CELEBRATION' })
		}, 3500)
	}

	function scoreApplication(job: Job) {
		let score = 50
		// Education requirement (±20 points)
		if (job.req) {
			if (state.credentials.includes(job.req)) score += 20
			else score -= 15
		} else score += 10
		
		// Certificate requirement (±15 points)
		if (job.certReq) {
			if (state.credentials.includes(job.certReq)) score += 15
			else score -= 10
		} else score += 5
		
		// Credit score (±10 points)
		if (state.credit >= 740) score += 10
		else if (state.credit >= 670) score += 5
		else if (state.credit < 580) score -= 10
		
		// Job tenure/stability (±15 points)
		if (state.tenure >= 12) score += 15
		else if (state.tenure >= 6) score += 10
		else if (state.tenure >= 3) score += 5
		
		// Career history (±10 points)
		if (state.careerHistory.length > 3) score += 10
		else if (state.careerHistory.length > 0) score += 5
		
		// Credentials count bonus (±10 points)
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
		<GameContext.Provider value={{ state, dispatch, buildLedger, checkRow, processMonth, applyForJob, openSettlement, evaluateApplications, acceptJob, triggerCelebration, jobBoard, cityData, lifeEvents, transitOptions, academyCourses, gameValues, calculateDynamicAPR, getHousingTier, calculateCreditBonus }}>
			{children}
		</GameContext.Provider>
	)
}

export function useGame() {
	return useContext(GameContext)
}

export default GameContext
