// During migration we re-export the existing JS implementation to avoid duplication.
import React, { createContext, useContext, useEffect, useReducer } from 'react'
import cityData from '../constants/cityData.constants'
import jobBoard from '../constants/jobBoard.constants'
import lifeEvents from '../constants/lifeEvents.constants'
import transitOptions from '../constants/transitOptions.constants'
import academyCourses from '../constants/academyCourses.constants'
import gameValues from '../constants/gameValues.constants'
import vehicleDatabase from '../constants/vehicleDatabase.constants'
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
	transit: { name: 'L1 - Walk/Bike', cost: 15, level: 1 },
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
	pendingCity: null, // may contain scheduled relocation info: { name, lat, lon, scheduledMonth, scheduledYear, relocationCost, transportCost, sellVehicle }
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
	skippedPaymentThisMonth: false,
	// Pay negotiation tracking
	lastNegotiationMonth: null as number | null,
	lastNegotiationYear: null as number | null,
	lastAutoBumpMonth: 2,
	lastAutoBumpYear: 2026,
	// Authentication / save
	currentUser: null as string | null,
	// Vehicle state - comprehensive ownership and financing tracking
	ownsVehicle: null as any, // primary vehicle (for UI/backcompat)
	garage: [] as any[], // array of vehicles owned/leased
	vehicleHistory: [] as any[], // Array of previously owned vehicles
	// Housing & inventory
	house: { model: null, level: 0, value: 0 },
	inventory: [] as any[]
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

// Pay negotiation modifier based on credit score, tenure, and job compatibility
// Returns object with modifier amount and breakdown
function calculatePayNegotiationModifier(
	creditScore: number,
	tenure: number,
	jobCompatibilityScore: number // 0-100 scale
): { modifier: number; creditContribution: number; tenureContribution: number; compatibilityContribution: number } {
	// Credit contribution: 0-5% based on credit score
	const creditContribution = Math.min(5, (creditScore - 300) / 55) // scales from 0 to 10%
	
	// Tenure contribution: 0-3% based on months in position, capped at 36 months
	const tenureContribution = Math.min(3, (tenure / 36) * 8)
	
	// Job compatibility contribution: 0-3% based on how well matched you are (0-100)
	const compatibilityContribution = (jobCompatibilityScore / 100) * 3
	
	const modifier = creditContribution + tenureContribution + compatibilityContribution
	
	return {
		modifier: Math.min(11, modifier), // Cap at 11% max raise
		creditContribution: Math.round(creditContribution * 100) / 100,
		tenureContribution: Math.round(tenureContribution * 100) / 100,
		compatibilityContribution: Math.round(compatibilityContribution * 100) / 100
	}
}

function mulberry32(a: number) {
	return function() {
		let t = a += 0x6D2B79F5
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// Haversine distance (km)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
	const toRad = (v: number) => (v * Math.PI) / 180
	const R = 6371 // km
	const dLat = toRad(lat2 - lat1)
	const dLon = toRad(lon2 - lon1)
	const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
	return R * c
}

// Relocation cost calculation based on distance and vehicle transport
function calculateRelocationCost(current: any, target: any, ownedVehicle: any) {
	if (!current || !target || !('lat' in current) || !('lat' in target)) return { distance: 0, relocationCost: 1500, transportCost: 0, sellVehicle: false }
	const distance = haversineDistance(current.lat, current.lon, target.lat, target.lon)
	// base moving cost per km and fixed overhead
	const basePerKm = 0.8 // $0.8 per km
	const overhead = 800
	const relocationCost = Math.round((distance * basePerKm + overhead) * 100) / 100
	
	// vehicle transport cost based on vehicle being owned
	let transportCost = 0
	if (ownedVehicle && ownedVehicle.vehicleId) {
		const vehicle = vehicleDatabase.vehicles.find(v => v.id === ownedVehicle.vehicleId)
		if (vehicle) {
			transportCost = Math.round((distance * vehicle.costPerKm) * 100) / 100
		}
	}
	
	// if target is far and user doesn't have appropriate transit, suggest selling vehicle (simple heuristic)
	const sellVehicle = false // default false; UI may propose
	return { distance, relocationCost, transportCost, sellVehicle }
}

// Calculate vehicle depreciation based on age and condition
function calculateVehicleValue(vehicle: any, currentMonth: number, currentYear: number) {
	if (!vehicle) return 0
	const vehicleData = vehicleDatabase.vehicles.find(v => v.id === vehicle.vehicleId)
	if (!vehicleData) return vehicle.purchasePrice
	
	const ageMonths = (currentYear - vehicle.purchaseYear) * 12 + (currentMonth - vehicle.purchaseMonth)
	const ageYears = ageMonths / 12
	
	const classData = vehicleDatabase.classes[vehicleData.class as keyof typeof vehicleDatabase.classes]
	let currentValue = vehicle.purchasePrice
	
	// Apply depreciation for each year
	if (ageYears > 0) {
		const depreciationRate = vehicle.purchasedNew ? classData.depreciation.new : classData.depreciation.used
		currentValue = vehicle.purchasePrice * Math.pow(1 - depreciationRate, ageYears)
	}
	
	return Math.round(currentValue * 100) / 100
}

// Calculate monthly car payment based on purchase price, APR, and term
function calculateMonthlyPayment(principal: number, aprRate: number, months: number): number {
	if (months <= 0 || principal <= 0) return 0
	const monthlyRate = aprRate / 12
	if (monthlyRate === 0) return principal / months
	const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
	return Math.round(payment * 100) / 100
}

// Calculate gas cost per month based on vehicle efficiency
function calculateMonthlyGasCost(vehicle: any, milesPerMonth: number = 1000) {
	if (!vehicle) return 0
	const vehicleData = vehicleDatabase.vehicles.find(v => v.id === vehicle.vehicleId)
	if (!vehicleData) return 0
	
	const classData = vehicleDatabase.classes[vehicleData.class as keyof typeof vehicleDatabase.classes]
	const gasPricePerGallon = 3.50 // Can be made dynamic
	const gallonsNeeded = milesPerMonth / classData.gasMileage
	return Math.round(gallonsNeeded * gasPricePerGallon * 100) / 100
}

// Calculate maintenance cost per month based on vehicle age and class
function calculateMonthlyMaintenanceCost(vehicle: any, currentMonth: number, currentYear: number) {
	if (!vehicle) return 0
	const vehicleData = vehicleDatabase.vehicles.find(v => v.id === vehicle.vehicleId)
	if (!vehicleData) return 0
	
	const classData = vehicleDatabase.classes[vehicleData.class as keyof typeof vehicleDatabase.classes]
	const ageMonths = (currentYear - vehicle.purchaseYear) * 12 + (currentMonth - vehicle.purchaseMonth)
	const ageYears = ageMonths / 12
	
	// Base maintenance: $50-150 per month depending on class
	let baseMaintenance = 50 * classData.baseMaintenanceFactor
	
	// Increase with age: +20% per year after 3 years
	if (ageYears > 3) {
		baseMaintenance *= (1 + (ageYears - 3) * 0.2)
	}
	
	return Math.round(baseMaintenance * 100) / 100
}

// Save and load helpers (localStorage) - supports named saves + autosave
interface SaveFile {
	name: string
	timestamp: number
	isAutoSave: boolean
}

function saveStateForUser(user: string, state: any, saveName?: string) {
	try {
		const isAutoSave = !saveName || saveName === '__autosave__'
		const fileName = saveName || '__autosave__'
		
		// Save the game state
		localStorage.setItem(`life-sim:${user}:${fileName}`, JSON.stringify(state))
		
		// Update saves index for this user
		const savesKey = `life-sim:saves:${user}`
		let saves: SaveFile[] = JSON.parse(localStorage.getItem(savesKey) || '[]')
		
		// Remove existing entry if it's being overwritten
		saves = saves.filter(s => s.name !== fileName)
		
		// Add new save
		saves.push({
			name: fileName,
			timestamp: Date.now(),
			isAutoSave
		})
		
		// Keep only last 5 saves, prioritize autosave
		if (saves.length > 5) {
			const autoSave = saves.find(s => s.isAutoSave)
			const nonAutoSaves = saves.filter(s => !s.isAutoSave)
			const keptNonAuto = nonAutoSaves.slice(-4)
			saves = autoSave ? [autoSave, ...keptNonAuto] : keptNonAuto
			
			// Delete removed saves from storage
			for (const save of saves.filter(s => s.isAutoSave === false)) {
				const saveIndex = saves.indexOf(save)
				if (saveIndex >= 5) {
					localStorage.removeItem(`life-sim:${user}:${save.name}`)
				}
			}
		}
		
		localStorage.setItem(savesKey, JSON.stringify(saves))
		
		// maintain user index
		const users = JSON.parse(localStorage.getItem('life-sim-keys') || '[]')
		if (!users.includes(user)) {
			users.push(user)
			localStorage.setItem('life-sim-keys', JSON.stringify(users))
		}
		
		return true
	} catch (e) {
		console.error('Save failed', e)
		return false
	}
}

function loadStateForUser(user: string, saveName?: string) {
	try {
		const fileName = saveName || '__autosave__'
		const raw = localStorage.getItem(`life-sim:${user}:${fileName}`)
		if (!raw) return null
		return JSON.parse(raw)
	} catch (e) {
		console.error('Load failed', e)
		return null
	}
}

function listSavedUsers() {
	try {
		return JSON.parse(localStorage.getItem('life-sim-keys') || '[]')
	} catch (e) {
		return []
	}
}

function listSavesForUser(user: string): SaveFile[] {
	try {
		const saves = JSON.parse(localStorage.getItem(`life-sim:saves:${user}`) || '[]')
		// Sort: autosave first, then by timestamp descending
		return saves.sort((a: SaveFile, b: SaveFile) => {
			if (a.isAutoSave) return -1
			if (b.isAutoSave) return 1
			return b.timestamp - a.timestamp
		})
	} catch (e) {
		return []
	}
}

function deleteSaveForUser(user: string, saveName: string) {
	try {
		localStorage.removeItem(`life-sim:${user}:${saveName}`)
		const savesKey = `life-sim:saves:${user}`
		let saves: SaveFile[] = JSON.parse(localStorage.getItem(savesKey) || '[]')
		saves = saves.filter(s => s.name !== saveName)
		localStorage.setItem(savesKey, JSON.stringify(saves))
		return true
	} catch (e) {
		console.error('Delete save failed', e)
		return false
	}
}

function renameSaveForUser(user: string, oldName: string, newName: string) {
	try {
		// Check name doesn't already exist
		const saves = listSavesForUser(user)
		if (saves.some(s => s.name === newName)) {
			return false // Name already exists
		}
		
		// Copy state to new name
		const state = loadStateForUser(user, oldName)
		if (!state) return false
		
		// Save with new name
		saveStateForUser(user, state, newName)
		
		// Delete old
		deleteSaveForUser(user, oldName)
		return true
	} catch (e) {
		console.error('Rename save failed', e)
		return false
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

			// Calculate vehicle costs before checking calculation
			let vehicleCosts = 0
			let ownsVehicle = state.ownsVehicle
			let vehicleSaleProceeds = 0
			const logs = [...state.logs]
			const garage = state.garage || []
			let updatedGarage = garage.map((g: any) => ({ ...g }))

			// Iterate over all vehicles in garage to compute costs and update status
			for (let i = 0; i < updatedGarage.length; i++) {
				const g = updatedGarage[i]
				const vehicleData = vehicleDatabase.vehicles.find(v => v.id === g.vehicleId)
				if (!vehicleData) continue

				// Monthly payment
				if (g.monthsRemaining > 0) {
					vehicleCosts += g.monthlyPayment
				}
				// Gas and maintenance
				vehicleCosts += calculateMonthlyGasCost(g)
				vehicleCosts += calculateMonthlyMaintenanceCost(g, state.month, state.year)

				// Decrement months remaining if financing
				if (g.monthsRemaining > 0) {
					updatedGarage[i] = { ...updatedGarage[i], monthsRemaining: g.monthsRemaining - 1 }
					if (g.monthsRemaining - 1 === 0) {
						logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🚗 Vehicle loan paid off! ${g.vehicleName}` })
					}
				}

				// Handle for sale logic
				if (g.for_sale && g.monthsOnMarket !== undefined) {
					const monthsOnMarket = (g.monthsOnMarket || 0) + 1
					updatedGarage[i] = { ...updatedGarage[i], monthsOnMarket }
					const saleChance = Math.min(monthsOnMarket / 6, 0.8)
					if (Math.random() < saleChance) {
						const proceeds = g.listPrice || 0
						vehicleSaleProceeds += proceeds
						logs.push({ date: `${nextMonth}/${nextYear}`, msg: `💰 Vehicle sold after ${monthsOnMarket} months: +$${proceeds.toLocaleString()}` })
						// remove from garage
						updatedGarage[i] = null as any
					}
				}
			}
			// Filter out removed vehicles
			updatedGarage = updatedGarage.filter((x: any) => x)

			// If primary vehicle was removed, update ownsVehicle
			if (ownsVehicle && !updatedGarage.find((g: any) => g.id === ownsVehicle.id)) {
				ownsVehicle = updatedGarage.length > 0 ? updatedGarage[0] : null
			}

			const check = fix(state.check - (paySave + payDebt + vehicleCosts))

			let resultingCheck = check

			const eduProgress = { ...state.eduProgress }
			let activeEdu = state.activeEdu
			const credentials = [...state.credentials]
			const credentialHistory = [...state.credentialHistory]
			const careerHistory = [...state.careerHistory]
			let job = state.job
			let tenure = state.tenure
			let celebration = null as 'degree' | 'certification' | 'job-accepted' | 'promotion' | 'debt-paid-off' | 'car-paid-off' | 'pay-bump' | null
			
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

			// If a city relocation was planned previously, apply it only when scheduledMonth/year is reached.
			let city = state.city
			let applyRelocation = false
			let relocationCostToApply = 0
			let transportCostToApply = 0
			let debtBefore = state.debt
			// Determine if pendingCity's scheduled date matches the upcoming month
			if (state.pendingCity && state.pendingCity.scheduledMonth && state.pendingCity.scheduledYear) {
				if (state.pendingCity.scheduledMonth === nextMonth && state.pendingCity.scheduledYear === nextYear) {
					applyRelocation = true
					relocationCostToApply = state.pendingCity.relocationCost || 1500
					transportCostToApply = state.pendingCity.transportCost || 0
				}
			}
			let newDebt = fix(state.debt - payDebt + (applyRelocation ? relocationCostToApply + transportCostToApply : 0))

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

			// Apply relocation if scheduled for this upcoming month
			let pendingJobToApply = null as any
			if (applyRelocation && state.pendingCity) {
				city = { name: state.pendingCity.name, p: state.pendingCity.p, r: state.pendingCity.r, icon: state.pendingCity.icon, lat: state.pendingCity.lat, lon: state.pendingCity.lon }
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Relocated to ${state.pendingCity.name} (distance: ${state.pendingCity.distanceKm || 'N/A'} km)` })
				// When relocation happens, set pending job to Odd Jobs for next cycle
				if (!state.pendingJob) {
					pendingJobToApply = { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 }
				}
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
			let newSave = fix(saveBefore + vehicleSaleProceeds)
			if (newSave > 0) {
				const monthlySaveInterest = fix(newSave * (gameValues.hysaAPR / 12))
				newSave = fix(newSave + monthlySaveInterest)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Savings interest earned (${(gameValues.hysaAPR * 100).toFixed(2)}% APY): $${monthlySaveInterest.toFixed(2)}` })
			}

			// Check for automatic yearly pay bump (credit > 800, 12 months since last auto bump)
			let updatedJob = job
			let newLastAutoBumpMonth = state.lastAutoBumpMonth
			let newLastAutoBumpYear = state.lastAutoBumpYear
			if (credit > 800 && tenure >= 12) {
				const monthsSinceLastAutoBump = (nextYear - state.lastAutoBumpYear) * 12 + (nextMonth - state.lastAutoBumpMonth)
				if (monthsSinceLastAutoBump >= 12) {
					const autoBumpAmount = 3 // 3% annual bump for maintaining excellent credit
					updatedJob = { ...job, base: fix(job.base * (1 + autoBumpAmount / 100)) }
					const oldPay = Math.round(job.base * city.p * 0.8)
					const newPay = Math.round(updatedJob.base * city.p * 0.8)
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🎉 Automatic annual pay bump (credit > 800): $${oldPay}/mo → $${newPay}/mo (+3%)` })
					celebration = 'pay-bump'
					newLastAutoBumpMonth = nextMonth
					newLastAutoBumpYear = nextYear
				}
			}

			// Note: Car loan payoff would be tracked if we had a car loan field - adding for future use
			// if (carLoanBefore > 0 && carLoanAfter <= 0) celebration = 'car-paid-off'

			// Check job requirement: if job requires higher transit level than current, warn player
			if (job.tReq > transit.level) {
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `⚠️ WARNING: Your job requires transit level ${job.tReq} but you only have level ${transit.level}. You may lose your job!` })
			}

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
				pendingCity: applyRelocation ? null : state.pendingCity,
				ownsVehicle,
				garage: updatedGarage,
				logs,
				careerHistory,
				job: updatedJob,
				pendingJob: pendingJobToApply,
				jobStartMonth: state.pendingJob ? nextMonth : state.jobStartMonth,
				jobStartYear: state.pendingJob ? nextYear : state.jobStartYear,
				lastAutoBumpMonth: newLastAutoBumpMonth,
				lastAutoBumpYear: newLastAutoBumpYear,
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
		case 'NEGOTIATE_PAY': {
			const { negotiationModifier } = action.payload
			const newBase = fix(state.job.base * (1 + negotiationModifier / 100))
			const newJob = { ...state.job, base: newBase }
			const logs = [...state.logs]
			const oldPay = Math.round(state.job.base * state.city.p * 0.8)
			const newPay = Math.round(newBase * state.city.p * 0.8)
			logs.push({ 
				date: `${state.month}/${state.year}`, 
				msg: `Successfully negotiated pay raise: $${oldPay}/mo → $${newPay}/mo (+${negotiationModifier.toFixed(1)}%)` 
			})
			return {
				...state,
				job: newJob,
				lastNegotiationMonth: state.month,
				lastNegotiationYear: state.year,
				logs,
				celebration: 'pay-bump'
			}
		}
		case 'APPLY_AUTO_PAY_BUMP': {
			const { bumpPercentage } = action.payload
			const newBase = fix(state.job.base * (1 + bumpPercentage / 100))
			const newJob = { ...state.job, base: newBase }
			const logs = [...state.logs]
			const oldPay = Math.round(state.job.base * state.city.p * 0.8)
			const newPay = Math.round(newBase * state.city.p * 0.8)
			logs.push({
				date: `${state.month}/${state.year}`,
				msg: `Automatic annual pay bump (credit > 800): $${oldPay}/mo → $${newPay}/mo (+${bumpPercentage.toFixed(1)}%)`
			})
			return {
				...state,
				job: newJob,
				lastAutoBumpMonth: state.month,
				lastAutoBumpYear: state.year,
				logs,
				celebration: 'pay-bump'
			}
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
			
			// Gas cost (if not using L1 Walk/Bike and no vehicle owned - vehicle costs handled separately)
			if (state.transit.level > 1 && !(state.garage && state.garage.length > 0)) {
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
		
		// VEHICLE COSTS - Monthly payment, gas, maintenance
		if (state.garage && state.garage.length > 0) {
			state.garage.forEach((g: any) => {
				const vehicle = vehicleDatabase.vehicles.find(v => v.id === g.vehicleId)
				if (!vehicle) return

				// Loan payment
				if (g.monthsRemaining > 0) {
					const payment = g.monthlyPayment
					bal = fix(bal - payment)
					ledger.push({ id: id++, desc: `Vehicle Loan Payment: ${g.vehicleName}`, amt: payment, type: 'out', bal, done: false })
				}

				// Monthly gas for this vehicle
				const gasCost = calculateMonthlyGasCost(g)
				if (gasCost > 0) {
					bal = fix(bal - gasCost)
					ledger.push({ id: id++, desc: `Gas: ${g.vehicleName}`, amt: gasCost, type: 'out', bal, done: false })
				}

				// Monthly maintenance for this vehicle
				const maintCost = calculateMonthlyMaintenanceCost(g, state.month, state.year)
				if (maintCost > 0) {
					bal = fix(bal - maintCost)
					ledger.push({ id: id++, desc: `Maintenance: ${g.vehicleName}`, amt: maintCost, type: 'out', bal, done: false })
				}
			})
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
		// Rebuild ledger after state has updated from the reducer and then save
		setTimeout(() => {
			buildLedger(paySave, payDebt)
			// allow reducer to settle then save
			setTimeout(() => {
				saveGame()
			}, 60)
		}, 0)
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
		// Save after opening settlement so job application results are persisted
		setTimeout(() => {
			saveGame()
		}, 60)
	}

	// --- Save / Load / Auth ---

	function saveGame(saveName?: string) {
		const u = state.currentUser
		if (!u) return false
		const snapshot = { ...state, currentUser: u }
		return saveStateForUser(u, snapshot, saveName)
	}

	function loadGame(saveName?: string) {
		const u = state.currentUser
		if (!u) return false
		const data = loadStateForUser(u, saveName)
		if (!data) return false
		dispatch({ type: 'SET_STATE', payload: data })
		return true
	}

	function listSaves() {
		return listSavedUsers()
	}

	function getSavesForCurrentUser() {
		const u = state.currentUser
		if (!u) return []
		return listSavesForUser(u)
	}

	function deleteSave(saveName: string) {
		const u = state.currentUser
		if (!u) return false
		return deleteSaveForUser(u, saveName)
	}

	function renameSave(oldName: string, newName: string) {
		const u = state.currentUser
		if (!u) return false
		return renameSaveForUser(u, oldName, newName)
	}

	function newGame() {
		const freshState = {
			check: 1200.0,
			save: 0,
			debt: 0,
			credit: 600,
			month: 2,
			year: 2026,
			city: cityData[3],
			job: { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 },
			transit: { name: 'L1 - Walk/Bike', cost: 15, level: 1 },
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
			luxuryServices: {
				chef: false,
				housekeeper: false,
				chauffer: false,
				therapist: false,
				trainer: false,
				concierge: false
			},
			entertainmentSpending: 0,
			celebration: null,
			paymentStreak: 0,
			calculationStreak: 0,
			lastPaymentOnTime: true,
			skippedPaymentThisMonth: false,
			lastNegotiationMonth: null,
			lastNegotiationYear: null,
			lastAutoBumpMonth: 2,
			lastAutoBumpYear: 2026,
			currentUser: state.currentUser,
			ownsVehicle: null,
			garage: [],
		}
		dispatch({ type: 'SET_STATE', payload: freshState })
		
		// Build the initial month's ledger
		setTimeout(() => {
			buildLedger(0, 0)
		}, 60)
		
		return true
	}

	function login(user: string, _password?: string) {
		const data = loadStateForUser(user)
		if (data) {
			dispatch({ type: 'SET_STATE', payload: { ...data, currentUser: user } })
			return true
		}
		// No save yet, create a new slot with current initial-like state but set currentUser
		dispatch({ type: 'SET_STATE', payload: { ...state, currentUser: user } })
		saveStateForUser(user, { ...state, currentUser: user })
		return true
	}

	function logout() {
		dispatch({ type: 'SET_STATE', payload: { currentUser: null } })
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
		<GameContext.Provider value={{ state, dispatch, buildLedger, checkRow, processMonth, applyForJob, openSettlement, evaluateApplications, acceptJob, triggerCelebration, jobBoard, cityData, lifeEvents, transitOptions, academyCourses, gameValues, calculateDynamicAPR, getHousingTier, calculateCreditBonus, calculatePayNegotiationModifier, calculateRelocationCost, saveGame, loadGame, listSaves, getSavesForCurrentUser, deleteSave, renameSave, newGame, login, logout, vehicleDatabase, calculateVehicleValue, calculateMonthlyPayment, calculateMonthlyGasCost, calculateMonthlyMaintenanceCost }}>
			{children}
		</GameContext.Provider>
	)
}

export function useGame() {
	return useContext(GameContext)
}

export default GameContext
