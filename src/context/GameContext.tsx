// During migration we re-export the existing JS implementation to avoid duplication.
import React, { createContext, useContext, useEffect, useReducer } from 'react'
import cityData from '../constants/cityData.constants'
import rawJobBoard from '../constants/jobBoard.constants'
import lifeEvents from '../constants/lifeEvents.constants'
import transitOptions from '../constants/transitOptions.constants'
import rawAcademyCourses from '../constants/academyCourses.constants'
import gameValues from '../constants/gameValues.constants'
import vehicleDatabase from '../constants/vehicleDatabase.constants'
import { stockMarketAssets, autoInvestProfiles } from '../constants/stockMarket.constants'
import { achievementRules, rewardWheelPrizePools, rewardWheelVehicleGrantPool } from '../constants/achievements.constants'
import type { Job, Application, LifeEvent } from '../types/models.types'

type State = any

type JobMarketState = Record<string, { capacity: number; occupied: number }>

function getRegisteredUserCount() {
	try {
		const users = JSON.parse(localStorage.getItem('life-sim-keys') || '[]')
		return Math.max(1, Array.isArray(users) ? users.length : 1)
	} catch (e) {
		return 1
	}
}

function capacityScaleForUsers(registeredUsers: number) {
	// 1 user => 1.0x capacity, 2 => 1.3x, 3 => 1.6x ... capped at 2x.
	return Math.min(2, Math.max(1, 0.7 + registeredUsers * 0.3))
}

const hasAnyKeyword = (text: string, keywords: string[]) => keywords.some(k => text.includes(k))

function explicitExperienceRequirement(jobTitle: string) {
	const ladders: Record<string, { roles: string[]; minMonths: number }> = {
		'Pilot': { roles: ['Air Traffic Controller', 'Military Pilot'], minMonths: 24 },
		'Airline Pilot': { roles: ['Pilot', 'Military Pilot'], minMonths: 36 },
		'Military Pilot': { roles: ['Air Force Airman', 'Navy Seaman'], minMonths: 18 },
		'Surgeon': { roles: ['Physician', 'Registered Nurse'], minMonths: 36 },
		'Physician': { roles: ['Registered Nurse', 'Medical Assistant'], minMonths: 36 },
		'Lawyer': { roles: ['Paralegal', 'Court Clerk'], minMonths: 24 },
		'Corporate Lawyer': { roles: ['Lawyer'], minMonths: 48 },
		'Software Architect': { roles: ['Software Dev', 'Software Tester'], minMonths: 24 },
		'Data Scientist': { roles: ['Data Analyst'], minMonths: 18 },
		'AI Researcher': { roles: ['Data Scientist', 'Research Scientist'], minMonths: 18 },
		'Investment Banker': { roles: ['Financial Analyst', 'Accountant'], minMonths: 18 },
		'University Professor': { roles: ['Lab Researcher', 'Research Scientist'], minMonths: 36 }
	}
	return ladders[jobTitle] || null
}

function roleFamilyKeywords(title: string): string[] {
	const t = title.toLowerCase()
	if (hasAnyKeyword(t, ['pilot', 'air'])) return ['pilot', 'air', 'aviation', 'air force']
	if (hasAnyKeyword(t, ['doctor', 'surgeon', 'nurse', 'physician'])) return ['doctor', 'surgeon', 'nurse', 'medical', 'physician']
	if (hasAnyKeyword(t, ['lawyer', 'court', 'legal'])) return ['lawyer', 'court', 'legal', 'paralegal']
	if (hasAnyKeyword(t, ['software', 'data', 'ai', 'architect'])) return ['software', 'data', 'ai', 'it']
	if (hasAnyKeyword(t, ['finance', 'bank', 'account', 'advisor'])) return ['finance', 'bank', 'account', 'advisor']
	if (hasAnyKeyword(t, ['engineer', 'architect'])) return ['engineer', 'architect']
	return []
}

const CERT_ALIASES: Record<string, string> = {
	'Content Marketing': 'Public Relations',
	'Special Operations': 'Special Forces',
	'Civil Engineering': 'Construction Management',
	'Welding': 'Welder',
	'Massage Therapy': 'Massage Therapist',
	'Physical Therapy': 'Physical Therapy Assistant',
	'Occupational Therapy': 'Occupational Therapy Assistant',
	'Personal Care Aide': 'Certified Nursing Assistant',
	'Home Health Aide': 'Certified Nursing Assistant',
	'Nursing Assistant': 'Certified Nursing Assistant',
	'Dental Hygienist': 'Dental Assist',
	'Radiologic Tech': 'Radiologic Technology',
	'Business Analysis': 'Project Management',
	'Financial Analyst': 'Financial Analysis',
	'Medical Research': 'Medical Laboratory Scientist',
	'Psychology': 'Mental Health Counselor',
	'Artificial Intelligence': 'Data Science'
}

const REQUIREMENT_ALIASES: Record<string, string> = {
	'Veterinary School': 'Bachelors Degree',
	'Pharmacy School': 'Bachelors Degree',
	'Dental School': 'Bachelors Degree'
}

function capacityForJob(job: Job, rankInTrack: number) {
	const baseByCategory: Record<string, number> = {
		Entry: 60,
		Skilled: 35,
		Military: 25,
		Pro: 15
	}
	const base = baseByCategory[job.cat || 'Pro'] || 80
	const drop = Math.min(55, rankInTrack * 12)
	return Math.max(3, base - drop)
}

function titleSeed(title: string) {
	let h = 0
	for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0
	return h
}

function buildAcademyCatalog() {
	return rawAcademyCourses.map(course => {
		const type = course.type || 'degree'
		return {
			...course,
			category: type === 'degree' ? 'Degree Programs' : 'Certification Programs',
			subcategory: course.subcategory || (type === 'degree' ? 'Academic Degrees' : 'General Skills')
		}
	})
}

function buildProgressiveJobBoard() {
	const academyCredentialSet = new Set(rawAcademyCourses.map(c => c.n))
	const jobTitleSet = new Set(rawJobBoard.map(j => j.title))

	const enriched = rawJobBoard.map(job => ({
		...job,
		subcat: job.subcat || (job.cat === 'Entry' ? 'General Labor' : 'General Professional'),
		expReq: null,
		capacity: 10,
		roleReqFromReq: null as string | null
	}))

	for (const job of enriched as any[]) {
		// Normalize certification requirement names to known academy credentials.
		if (job.certReq) {
			if (!academyCredentialSet.has(job.certReq) && CERT_ALIASES[job.certReq]) {
				job.certReq = CERT_ALIASES[job.certReq]
			}
			if (!academyCredentialSet.has(job.certReq)) {
				job.certReq = null
			}
		}

		// Normalize requirement names and convert role requirements into experience gates.
		if (job.req) {
			if (!academyCredentialSet.has(job.req) && REQUIREMENT_ALIASES[job.req]) {
				job.req = REQUIREMENT_ALIASES[job.req]
			}

			if (!academyCredentialSet.has(job.req) && jobTitleSet.has(job.req)) {
				job.roleReqFromReq = job.req
				job.req = null
			}

			if (job.req && !academyCredentialSet.has(job.req)) {
				job.req = null
			}
		}
	}

	const groups: Record<string, Job[]> = {}
	for (const job of enriched as any[]) {
		const key = `${job.cat || 'Unknown'}::${job.subcat || 'General'}`
		groups[key] = groups[key] || []
		groups[key].push(job)
	}

	Object.values(groups).forEach(group => {
		group.sort((a, b) => a.base - b.base)
		group.forEach((job: any, idx) => {
			const explicit = explicitExperienceRequirement(job.title)
			if (job.cat === 'Entry') {
				job.expReq = null
			} else if (job.roleReqFromReq) {
				job.expReq = {
					roles: [job.roleReqFromReq],
					minMonths: explicit?.minMonths || (idx >= 4 ? 12 : idx >= 2 ? 6 : 3)
				}
			} else if (explicit) {
				job.expReq = explicit
			} else if (idx > 0) {
				const family = roleFamilyKeywords(job.title)
				const priorInTrack = group.slice(0, idx)
				const logicalPrior = family.length
					? priorInTrack.filter(prev => hasAnyKeyword(prev.title.toLowerCase(), family))
					: priorInTrack

				const feederRoles = logicalPrior.slice(Math.max(0, logicalPrior.length - 2)).map(r => r.title)
				job.expReq = feederRoles.length
					? {
						roles: feederRoles,
						minMonths: idx >= 4 ? 12 : idx >= 2 ? 6 : 3
					}
					: null
			} else {
				job.expReq = null
			}
			delete job.roleReqFromReq
			job.capacity = capacityForJob(job, idx)
		})
	})

	return enriched
}

function initializeJobMarket(jobs: Job[]): JobMarketState {
	const market: JobMarketState = {}
	const registeredUsers = getRegisteredUserCount()
	const scale = capacityScaleForUsers(registeredUsers)
	for (const job of jobs) {
		const baseCapacity = job.capacity || 10
		const capacity = Math.max(1, Math.round(baseCapacity * scale))
		const seed = titleSeed(job.title)
		const fillRate = 0.65 + (seed % 30) / 100
		let occupied = Math.floor(capacity * fillRate)
		if (occupied >= capacity) occupied = capacity - 1
		market[job.title] = { capacity, occupied: Math.max(0, occupied) }
	}
	return market
}

function getRoleExperienceMonths(state: State, roleTitle: string) {
	let months = 0
	if (state.job?.title === roleTitle) months += state.tenure || 0
	const history = Array.isArray(state.careerHistory) ? state.careerHistory : []
	for (const role of history) {
		if (role?.title === roleTitle) months += role?.months || 0
	}
	return months
}

function getJobOpenings(state: State, job: Job) {
	const slot = state.jobMarket?.[job.title]
	const registeredUsers = getRegisteredUserCount()
	const scale = capacityScaleForUsers(registeredUsers)

	// Job capacity generated from progression rank acts as the baseline.
	const baseCapacity = job.capacity ?? slot?.capacity ?? 1
	const dynamicCapacity = Math.max(1, Math.round(baseCapacity * scale))

	const storedCapacity = slot?.capacity ?? dynamicCapacity
	const storedOccupied = slot?.occupied ?? Math.floor(dynamicCapacity * 0.75)
	const occupiedRatio = storedCapacity > 0 ? storedOccupied / storedCapacity : 0.75
	const dynamicOccupied = Math.min(dynamicCapacity, Math.max(0, Math.round(dynamicCapacity * occupiedRatio)))

	return Math.max(0, dynamicCapacity - dynamicOccupied)
}

function getJobEligibility(state: State, job: Job) {
	const educationMet = !job.req || state.credentials.includes(job.req)
	const certificationMet = !job.certReq || state.credentials.includes(job.certReq)
	const transitMet = state.transit.level >= job.tReq
	const openings = getJobOpenings(state, job)
	const capacityMet = openings > 0

	let experienceMet = true
	let experienceDetail = ''
	if (job.expReq && job.expReq.roles.length > 0) {
		experienceMet = job.expReq.roles.some(role => getRoleExperienceMonths(state, role) >= job.expReq!.minMonths)
		if (!experienceMet) {
			experienceDetail = `${job.expReq.minMonths} months in ${job.expReq.roles.join(' or ')}`
		}
	}

	return {
		canApply: educationMet && certificationMet && transitMet && experienceMet && capacityMet,
		educationMet,
		certificationMet,
		transitMet,
		experienceMet,
		capacityMet,
		experienceDetail,
		openings
	}
}

const academyCourses = buildAcademyCatalog()
const jobBoard = buildProgressiveJobBoard()

function round2(value: number) {
	return Math.round(value * 100) / 100
}

function hashString(value: string) {
	let hash = 0
	for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
	return hash
}

function initializeMarketPrices() {
	const prices: Record<string, number> = {}
	for (const asset of stockMarketAssets) {
		prices[asset.ticker] = round2(asset.basePrice)
	}
	return prices
}

function normalizeMarketPrices(prices: any) {
	const base = initializeMarketPrices()
	if (!prices || typeof prices !== 'object') return base
	for (const asset of stockMarketAssets) {
		const n = Number(prices[asset.ticker])
		if (Number.isFinite(n) && n > 0) base[asset.ticker] = round2(n)
	}
	return base
}

function advanceMarketPrices(currentPrices: any, year: number, month: number) {
	const base = normalizeMarketPrices(currentPrices)
	const next: Record<string, number> = {}
	for (const asset of stockMarketAssets) {
		const seed = hashString(`${asset.ticker}-${year}-${month}`)
		const noise = (mulberry32(seed)() - 0.5) * 2
		const monthlyMove = asset.drift + noise * asset.volatility
		const boundedMove = Math.max(-0.25, Math.min(0.25, monthlyMove))
		const updated = Math.max(1, base[asset.ticker] * (1 + boundedMove))
		next[asset.ticker] = round2(updated)
	}
	return next
}

function normalizeAutoInvestConfig(config: any) {
	const fallback = { enabled: false, monthlyAmount: 0, profileId: 'balanced' }
	if (!config || typeof config !== 'object') return fallback
	const profileExists = autoInvestProfiles.some(p => p.id === config.profileId)
	return {
		enabled: !!config.enabled,
		monthlyAmount: Math.max(0, round2(Number(config.monthlyAmount || 0))),
		profileId: profileExists ? config.profileId : fallback.profileId
	}
}

function executionPriceWithSlippage(referencePrice: number, seedText: string, maxSlippage = 0.02) {
	const seed = hashString(seedText)
	const noise = (mulberry32(seed)() - 0.5) * 2
	const pct = Math.max(-maxSlippage, Math.min(maxSlippage, noise * maxSlippage))
	return round2(Math.max(0.01, referencePrice * (1 + pct)))
}

function slippageLabel(fillPrice: number, referencePrice: number) {
	if (fillPrice >= referencePrice * 1.005) return 'ceiling fill'
	if (fillPrice <= referencePrice * 0.995) return 'floor fill'
	return 'mid fill'
}

function portfolioMarketValue(portfolio: any[], prices: Record<string, number>) {
	return round2((Array.isArray(portfolio) ? portfolio : []).reduce((sum: number, h: any) => {
		const shares = Number(h?.shares || 0)
		const price = Number(prices[h?.ticker] || 0)
		return sum + shares * price
	}, 0))
}

function portfolioCostBasis(portfolio: any[]) {
	return round2((Array.isArray(portfolio) ? portfolio : []).reduce((sum: number, h: any) => {
		const shares = Number(h?.shares || 0)
		const avgCost = Number(h?.avgCost || 0)
		return sum + shares * avgCost
	}, 0))
}

function countRelocations(logs: any[]) {
	return (Array.isArray(logs) ? logs : []).filter((l: any) => String(l?.msg || '').includes('Relocated to ')).length
}

function sumLedgerAmounts(ledger: any[], matcher: (desc: string) => boolean) {
	return round2((Array.isArray(ledger) ? ledger : []).reduce((sum: number, row: any) => {
		const desc = String(row?.desc || '')
		if (!matcher(desc)) return sum
		return sum + Number(row?.amt || 0)
	}, 0))
}

function achievementMetricValue(rule: any, snapshot: any) {
	const metric = String(rule?.metric || '')
	const garageCount = Array.isArray(snapshot.garage) ? snapshot.garage.length : 0
	const activeLuxury = Object.values(snapshot.luxuryServices || {}).filter(Boolean).length
	const prices = normalizeMarketPrices(snapshot.marketPrices)
	const marketValue = portfolioMarketValue(snapshot.portfolio || [], prices)
	const costBasis = portfolioCostBasis(snapshot.portfolio || [])
	const unrealized = round2(marketValue - costBasis)
	const netWorth = round2(Number(snapshot.check || 0) + Number(snapshot.save || 0) + Number(snapshot.house?.value || 0) + marketValue - Number(snapshot.debt || 0))
	const portfolio = Array.isArray(snapshot.portfolio) ? snapshot.portfolio : []

	switch (metric) {
		case 'vehiclesOwned':
			return garageCount
		case 'calculationStreak':
			return Number(snapshot.calculationStreak || 0)
		case 'relocationCount':
			return countRelocations(snapshot.logs || [])
		case 'lifestyleServices':
			return activeLuxury
		case 'stockUnrealizedGain':
			return unrealized
		case 'tenureMonths':
			return Number(snapshot.tenure || 0)
		case 'credentialsCount':
			return Array.isArray(snapshot.credentials) ? snapshot.credentials.length : 0
		case 'netWorth':
			return netWorth
		case 'tickerShares': {
			const ticker = String(rule?.ticker || '')
			if (!ticker) return 0
			const holding = portfolio.find((h: any) => h?.ticker === ticker)
			return Number(holding?.shares || 0)
		}
		case 'singleStockShares':
			return portfolio.reduce((max: number, h: any) => Math.max(max, Number(h?.shares || 0)), 0)
		case 'lifetimeGasPaid':
			return Number(snapshot.totalGasPaid || 0)
		case 'lifetimeUtilitiesPaid':
			return Number(snapshot.totalUtilitiesPaid || 0)
		case 'ticketStubCount':
			return Array.isArray(snapshot.entertainmentTicketStubs) ? snapshot.entertainmentTicketStubs.length : 0
		case 'monthlyLuxuryEventSpend':
			return Number(snapshot.maxMonthlyLuxuryEventSpend || 0)
		default:
			return 0
	}
}

function generateAchievementUnlocks(snapshot: any) {
	const unlockedSet = new Set<string>(Array.isArray(snapshot.achievementsUnlocked) ? snapshot.achievementsUnlocked : [])
	const unlockedNow: any[] = []
	for (const rule of achievementRules) {
		if (unlockedSet.has(rule.id)) continue
		const metricValue = achievementMetricValue(rule, snapshot)
		if (metricValue >= rule.threshold) {
			unlockedSet.add(rule.id)
			unlockedNow.push(rule)
		}
	}
	return unlockedNow
}

function addOrUpdateHolding(portfolio: any[], ticker: string, shares: number, price: number) {
	const next = Array.isArray(portfolio) ? portfolio.map((h: any) => ({ ...h })) : []
	const idx = next.findIndex((h: any) => h.ticker === ticker)
	const totalCost = round2(shares * price)
	if (idx >= 0) {
		const existing = next[idx]
		const existingShares = Number(existing.shares || 0)
		const existingAvg = Number(existing.avgCost || price)
		const totalShares = existingShares + shares
		const avgCost = totalShares > 0 ? round2(((existingShares * existingAvg) + totalCost) / totalShares) : round2(price)
		next[idx] = { ...existing, shares: totalShares, avgCost }
	} else {
		next.push({ ticker, shares, avgCost: round2(price) })
	}
	return next
}

function chooseWeightedPrize(pool: any[]) {
	const totalWeight = pool.reduce((sum, p) => sum + Number(p.weight || 1), 0)
	let roll = Math.random() * totalWeight
	let chosen = pool[pool.length - 1]
	for (const p of pool) {
		roll -= Number(p.weight || 1)
		if (roll <= 0) {
			chosen = p
			break
		}
	}
	return chosen
}

function spinRewardPrize(state: any, forcedPrize?: any) {
	const category = state.lastAchievementCategory || 'wealth'
	const pool = rewardWheelPrizePools[category] || rewardWheelPrizePools.default
	const chosen = forcedPrize || chooseWeightedPrize(pool)

	if (chosen.kind === 'vehicle') {
		const randomVehicleId = rewardWheelVehicleGrantPool[Math.floor(Math.random() * rewardWheelVehicleGrantPool.length)]
		return { ...chosen, vehicleId: randomVehicleId }
	}

	return chosen
}

function scoreStockSignal(asset: any, price: number, prevPrice: number, portfolioValue: number, positionValue: number) {
	const momentumPct = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0
	const premiumToBasePct = asset.basePrice > 0 ? ((price - asset.basePrice) / asset.basePrice) * 100 : 0
	const isETF = asset.sector === 'ETF'
	const concentrationPct = portfolioValue > 0 ? (positionValue / portfolioValue) * 100 : 0

	let score = 0

	if (asset.drift >= 0.01) score += 1.1
	else if (asset.drift >= 0.006) score += 0.6
	else if (asset.drift <= 0.004) score -= 0.35

	if (momentumPct <= -4 && asset.drift >= 0.007) score += 0.9
	else if (momentumPct >= 6) score -= 0.7
	else if (momentumPct >= 2) score -= 0.2

	if (momentumPct >= 9 && asset.drift >= 0.008) score += 0.35
	else if (momentumPct <= -9) score -= 0.45

	if (premiumToBasePct <= -8) score += 0.8
	else if (premiumToBasePct >= 18) score -= 0.9
	else if (premiumToBasePct >= 8) score -= 0.35

	if (asset.volatility >= 0.12) score -= 0.45
	else if (asset.volatility <= 0.055) score += 0.2

	if (isETF) score += 0.35

	if (concentrationPct >= 35) score -= 1
	else if (concentrationPct >= 20) score -= 0.45
	else if (concentrationPct > 0 && concentrationPct <= 8 && score > 0.5) score += 0.15

	let recommendation: 'Buy' | 'Hold' | 'Sell' = 'Hold'
	if (score >= 1.35) recommendation = 'Buy'
	else if (score <= -0.75) recommendation = 'Sell'

	return { recommendation, score }
}

function applyAutoInvestCycle(
	checkBalance: number,
	portfolio: any[],
	marketPrices: Record<string, number>,
	previousPrices: Record<string, number>,
	autoInvest: any,
	logs: any[],
	month: number,
	year: number
) {
	const config = normalizeAutoInvestConfig(autoInvest)
	if (!config.enabled || config.monthlyAmount <= 0) {
		return { checkBalance, portfolio, logs, investedAmount: 0 }
	}

	const profile = autoInvestProfiles.find(p => p.id === config.profileId)
	if (!profile) return { checkBalance, portfolio, logs, investedAmount: 0 }

	const maxInvest = Math.min(checkBalance, config.monthlyAmount)
	if (maxInvest <= 0) return { checkBalance, portfolio, logs, investedAmount: 0 }

	let newCheck = checkBalance
	let investedAmount = 0
	const nextPortfolio = Array.isArray(portfolio) ? portfolio.map((h: any) => ({ ...h })) : []
	const tradeSummary: string[] = []
	const startingPortfolioValue = portfolioMarketValue(nextPortfolio, marketPrices)

	const baseAllocEntries = Object.entries(profile.allocations || {}) as Array<[string, number]>
	const adjustedAllocEntries = baseAllocEntries.map(([ticker, baseWeight]) => {
		const asset = stockMarketAssets.find((a) => a.ticker === ticker)
		const marketPrice = Number(marketPrices[ticker] || 0)
		const prevPrice = Number(previousPrices[ticker] || marketPrice)
		const holding = nextPortfolio.find((h: any) => h.ticker === ticker)
		const positionValue = Number(holding?.shares || 0) * marketPrice

		let multiplier = 1
		if (asset && marketPrice > 0) {
			const signal = scoreStockSignal(asset, marketPrice, prevPrice, startingPortfolioValue, positionValue)
			if (signal.recommendation === 'Buy') multiplier = 1.4
			else if (signal.recommendation === 'Sell') multiplier = 0.4
		}

		return [ticker, Number(baseWeight || 0) * multiplier] as [string, number]
	})
	const adjustedWeightTotal = adjustedAllocEntries.reduce((sum, [, w]) => sum + Number(w || 0), 0)

	for (const [ticker, adjustedWeight] of adjustedAllocEntries) {
		const allocation = adjustedWeightTotal > 0 ? (maxInvest * Number(adjustedWeight || 0)) / adjustedWeightTotal : 0
		const marketPrice = Number(marketPrices[ticker] || 0)
		if (marketPrice <= 0 || allocation <= 0) continue
		const price = executionPriceWithSlippage(marketPrice, `${ticker}-${month}-${year}-${profile.id}-auto`)

		const shares = Math.floor(allocation / price)
		if (shares <= 0) continue

		const cost = round2(shares * price)
		if (cost > newCheck) continue

		const idx = nextPortfolio.findIndex((h: any) => h.ticker === ticker)
		if (idx >= 0) {
			const existing = nextPortfolio[idx]
			const existingShares = Number(existing.shares || 0)
			const existingAvg = Number(existing.avgCost || price)
			const totalShares = existingShares + shares
			const avgCost = totalShares > 0 ? round2(((existingShares * existingAvg) + cost) / totalShares) : round2(price)
			nextPortfolio[idx] = { ...existing, shares: totalShares, avgCost }
		} else {
			nextPortfolio.push({ ticker, shares, avgCost: round2(price) })
		}

		newCheck = round2(newCheck - cost)
		investedAmount = round2(investedAmount + cost)
		tradeSummary.push(`${shares} ${ticker} @ ${price.toFixed(2)}`)
	}

	if (tradeSummary.length > 0) {
		logs = [...logs, {
			date: `${month}/${year}`,
			msg: `🤖 Auto-invest (${profile.name}, signal-biased) executed: ${tradeSummary.join(', ')}`
		}]
	}

	return { checkBalance: newCheck, portfolio: nextPortfolio, logs, investedAmount }
}

function entertainmentCapForSalary(job: any, city: any) {
	const netSalary = Math.max(0, (job?.base || 0) * (city?.p || 1) * 0.8)
	return round2(netSalary * 0.15)
}

function normalizeEntertainmentBudgets(entertainment: number, subscription: number, cap: number) {
	let entertainmentBudget = Math.max(0, entertainment || 0)
	let subscriptionBudget = Math.max(0, subscription || 0)
	// Each category has its own 15% net-salary cap.
	entertainmentBudget = Math.min(entertainmentBudget, cap)
	subscriptionBudget = Math.min(subscriptionBudget, cap)
	return {
		entertainmentBudget: round2(entertainmentBudget),
		subscriptionBudget: round2(subscriptionBudget)
	}
}

function autoAdjustEntertainmentBudgets(
	entertainment: number,
	subscription: number,
	year: number,
	month: number,
	jobTitle: string,
	cityName: string,
	cap: number
) {
	if ((entertainment || 0) <= 0 && (subscription || 0) <= 0) {
		return { entertainmentBudget: 0, subscriptionBudget: 0 }
	}
	const seedBase = `${year}-${month}-${jobTitle}-${cityName}`
	const entRnd = mulberry32(hashString(`${seedBase}-ent`))()
	const subRnd = mulberry32(hashString(`${seedBase}-sub`))()
	const entFactor = 0.92 + entRnd * 0.18
	const subFactor = 0.92 + subRnd * 0.18
	const adjustedEntertainment = round2(Math.max(0, (entertainment || 0) * entFactor))
	const adjustedSubscription = round2(Math.max(0, (subscription || 0) * subFactor))
	return normalizeEntertainmentBudgets(adjustedEntertainment, adjustedSubscription, cap)
}

function comfortableEntertainmentDefaults(job: any, city: any) {
	const netSalary = Math.max(0, (job?.base || 0) * (city?.p || 1) * 0.8)
	const targetTotal = round2(netSalary * 0.09)
	return {
		entertainmentSpending: round2(targetTotal * 0.65),
		subscriptionEntertainmentSpending: round2(targetTotal * 0.35)
	}
}

function calculateLuxuryServiceMonthlyPay(serviceId: string, netMonthlyIncome: number) {
	const income = Math.max(0, Number(netMonthlyIncome || 0))
	const rules: Record<string, { base: number; pct: number; min: number; max: number }> = {
		chef: { base: 2200, pct: 0.08, min: 3000, max: 20000 },
		housekeeper: { base: 1200, pct: 0.03, min: 1600, max: 9000 },
		chauffer: { base: 2000, pct: 0.05, min: 2800, max: 18000 },
		therapist: { base: 1600, pct: 0.025, min: 2000, max: 11000 },
		trainer: { base: 900, pct: 0.02, min: 1200, max: 7000 },
		concierge: { base: 2500, pct: 0.04, min: 3000, max: 25000 },
		accountant: { base: 250000, pct: 0.02, min: 1250000, max: 5000000 }
	}

	const rule = rules[serviceId]
	if (!rule) return 0

	const raw = rule.base + (income * rule.pct)
	return round2(Math.min(rule.max, Math.max(rule.min, raw)))
}

function totalLuxuryServiceDiscretionary(state: any) {
	const netMonthlyIncome = Math.max(0, Number(state?.job?.base || 0) * Number(state?.city?.p || 1) * 0.8)
	const services = state?.luxuryServices || {}
	return round2(Object.entries(services).reduce((sum, [serviceId, active]) => {
		if (!active) return sum
		return sum + calculateLuxuryServiceMonthlyPay(serviceId, netMonthlyIncome)
	}, 0))
}

function subscriptionBadgeMilestones() {
	return [
		{ months: 3, id: 'sub-3', name: 'Binge Apprentice', icon: '📺' },
		{ months: 6, id: 'sub-6', name: 'Fancy Pants Club Member', icon: '🎩' },
		{ months: 12, id: 'sub-12', name: 'Streaming Sensei', icon: '🎖️' },
		{ months: 24, id: 'sub-24', name: 'Legendary Subscription Overlord', icon: '👑' }
	]
}

function entertainmentHostCount(budget: number) {
	const thresholds = [30, 75, 100, 140, 220, 1200, 5000, 12000, 25000, 50000, 90000, 150000]
	let count = 0
	for (const t of thresholds) {
		if (budget >= t) count += 1
	}
	return count
}

function ticketStubForHostCount(hostCount: number) {
	if (hostCount >= 12) return { title: 'Lunar Theme Park Buyout', icon: '🌕' }
	if (hostCount >= 11) return { title: 'Orbital Zero-Gravity Party', icon: '🛰️' }
	if (hostCount >= 10) return { title: 'Cruise Ship Esports Festival', icon: '🛳️' }
	if (hostCount >= 9) return { title: 'Private Island Weekend Carnival', icon: '🏝️' }
	if (hostCount >= 8) return { title: 'Stadium Fireworks Spectacular', icon: '🎆' }
	if (hostCount >= 7) return { title: 'Desert Supercar Treasure Rally', icon: '🏎️' }
	if (hostCount >= 6) return { title: 'Chartered Yacht Game Night', icon: '🛥️' }
	if (hostCount >= 5) return { title: 'Private Theme Park After-Hours', icon: '🎢' }
	if (hostCount >= 4) return { title: 'Ballpark Gaming Takeover', icon: '🏟️' }
	if (hostCount >= 3) return { title: 'VIP Laser Tag Bracket', icon: '🔫' }
	return { title: 'Arcade + Pizza Night', icon: '🕹️' }
}

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
	jobMarket: initializeJobMarket(jobBoard),
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
		concierge: false,
		accountant: false
	},
	entertainmentSpending: comfortableEntertainmentDefaults({ title: 'Odd Jobs', base: 600 }, cityData[3]).entertainmentSpending,
	subscriptionEntertainmentSpending: comfortableEntertainmentDefaults({ title: 'Odd Jobs', base: 600 }, cityData[3]).subscriptionEntertainmentSpending,
	subscriptionStreakMonths: 0,
	subscriptionBadges: [] as any[],
	entertainmentTicketStubs: [] as any[],
	happiness: 70,
	workPenaltyPercent: 0,
	celebration: null as 'pay-bump' | 'degree' | 'certification' | 'car-paid-off' | 'debt-paid-off' | 'promotion' | 'job-accepted' | 'achievement' | 'rainbow' | null,
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
	inventory: [] as any[],
	// Stock market
	marketPrices: initializeMarketPrices(),
	marketPricesPrevious: initializeMarketPrices(),
	portfolio: [] as any[],
	marketLearningLevel: 'adult',
	marketUsePlainLanguage: false,
	autoInvest: {
		enabled: false,
		monthlyAmount: 0,
		profileId: 'balanced'
	},
	stockInvestedThisMonth: 0,
	stockInvestedLastMonth: 0,
	totalGasPaid: 0,
	totalUtilitiesPaid: 0,
	maxMonthlyLuxuryEventSpend: 0,
	achievementsUnlocked: [] as string[],
	achievementHistory: [] as any[],
	rewardTokens: 0,
	lastAchievementCategory: null as string | null,
	unlockedThemes: ['default'],
	activeTheme: 'default',
	rewardHistory: [] as any[]
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
		modifier: Math.min(3, modifier), // Cap at 3% max raise
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
	let baseMaintenance = 80 * classData.baseMaintenanceFactor
	
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

function transitStateByName(name: string) {
	const selected = transitOptions.find(t => t.n === name)
	if (!selected) {
		return { name: 'L1 - Walk/Bike', cost: 15, level: 1 }
	}
	return { name: selected.n, cost: selected.c, level: selected.l }
}

function garageHasHelicopter(garage: any[]) {
	return garage.some(g => {
		const vehicle = vehicleDatabase.vehicles.find(v => v.id === g.vehicleId)
		if (!vehicle) return false
		const body = (vehicle.body || '').toLowerCase()
		return body.includes('helicopter') || vehicle.icon === '🚁'
	})
}

function preferredTransitFromGarage(garage: any[]) {
	if (!garage || garage.length === 0) return null
	if (garageHasHelicopter(garage)) {
		return transitStateByName('L5 - Helicopter')
	}
	return transitStateByName('L4 - Owned Vehicle')
}

function syncTransitWithGarage(currentTransit: any, garage: any[]) {
	const vehicleTransit = preferredTransitFromGarage(garage)
	if (vehicleTransit) return vehicleTransit
	if ((currentTransit?.level || 1) >= 4) {
		return transitStateByName('L3 - Rideshare - Uber/Lyft')
	}
	return currentTransit
}

function pickInterMonthEvent(state: State): LifeEvent | null {
	// Roughly half of months have an event that lands between statements.
	if (Math.random() > 0.5) return null

	const triggers = new Set<string>(['none', 'job'])
	if (state.activeEdu) triggers.add('academy')
	if ((state.garage || []).length > 0) triggers.add('car')
	if ((state.credit || 600) < 620 || (state.paymentStreak || 0) === 0) triggers.add('burnout')
	if ((state.job?.cat || '') === 'Military' || (state.job?.cat || '') === 'Skilled') triggers.add('hazard')
	if (Math.random() < 0.35) triggers.add('health')
	if (Math.random() < 0.25) triggers.add('family')

	const pool = lifeEvents.filter(e => triggers.has(e.trigger))
	if (!pool.length) return null
	return pool[Math.floor(Math.random() * pool.length)]
}

function scaleLifeEventAmount(event: LifeEvent, netMonthlyIncome: number) {
	const baseAmount = Number(event?.amt || 0)
	if (!Number.isFinite(baseAmount) || baseAmount <= 0) return 0

	const income = Math.max(0, Number(netMonthlyIncome || 0))
	const ruleTable: Record<string, { inPct: number; outPct: number; minMult: number; maxMult: number }> = {
		none: { inPct: 0.015, outPct: 0.01, minMult: 0.8, maxMult: 2.5 },
		job: { inPct: 0.12, outPct: 0.045, minMult: 0.9, maxMult: 8 },
		car: { inPct: 0.06, outPct: 0.06, minMult: 0.9, maxMult: 8 },
		academy: { inPct: 0.08, outPct: 0.05, minMult: 0.8, maxMult: 6 },
		burnout: { inPct: 0.025, outPct: 0.03, minMult: 0.85, maxMult: 5 },
		hazard: { inPct: 0.03, outPct: 0.04, minMult: 0.85, maxMult: 7 },
		health: { inPct: 0.035, outPct: 0.04, minMult: 0.85, maxMult: 5.5 },
		family: { inPct: 0.04, outPct: 0.035, minMult: 0.85, maxMult: 5.5 }
	}

	const rule = ruleTable[event.trigger] || ruleTable.none
	const pct = event.type === 'in' ? rule.inPct : rule.outPct
	const incomeAnchored = income * pct
	const blended = (baseAmount * 0.45) + (incomeAnchored * 0.55)
	const minAmount = baseAmount * rule.minMult
	const maxAmount = baseAmount * rule.maxMult
	return round2(Math.max(minAmount, Math.min(maxAmount, blended)))
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
			let logs = [...state.logs]
			
			// Validate calculation accuracy for credit scoring
			if (expectedCheck !== undefined && newCheck !== undefined) {
				if (Math.abs(newCheck - expectedCheck) < 0.01) {
					// Correct calculation
					calculationStreak += 1
					const streakBonus = Math.min(10, Math.floor(calculationStreak / 5) * 5) // 5 points per 5 consecutive checks, max 25
					credit = Math.min(850, credit + 2 + streakBonus)
					if (calculationStreak % 1 === 0) {
						logs.push({ date: `${state.month}/${state.year}`, msg: `✅ Calculation streak (${calculationStreak}) - credit +${2 + streakBonus} (${credit})` })
					}
				} else {
					// Incorrect calculation
					const difference = Math.abs(newCheck - expectedCheck)
					const penalty = Math.min(300, Math.ceil(difference / 10)) // Higher penalties for bigger errors
					credit = Math.max(300, credit - penalty)
					calculationStreak = 0
					logs.push({ date: `${state.month}/${state.year}`, msg: `❌ Incorrect balance, credit -${penalty} (${credit})` })
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
			const chauffeurHired = !!state.luxuryServices?.chauffer
			let ownsVehicle = state.ownsVehicle
			let vehicleSaleProceeds = 0
			let logs = [...state.logs]
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
				// Gas and maintenance (chauffeur service covers these running costs)
				if (!chauffeurHired) {
					vehicleCosts += calculateMonthlyGasCost(g)
					vehicleCosts += calculateMonthlyMaintenanceCost(g, state.month, state.year)
				}

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
						const noPayoutSale = !!g.financed || g.condition === 'lease' || (g.monthsRemaining || 0) > 0
						const proceeds = noPayoutSale ? 0 : (g.listPrice || 0)
						vehicleSaleProceeds += proceeds
						if (noPayoutSale) {
							logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🚗 Financed/leased vehicle sold after ${monthsOnMarket} months: no savings payout` })
						} else {
							logs.push({ date: `${nextMonth}/${nextYear}`, msg: `💰 Vehicle sold after ${monthsOnMarket} months: +$${proceeds.toLocaleString()}` })
						}
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
			} else if (ownsVehicle) {
				// Keep primary vehicle in sync with monthly loan/sale updates stored in garage.
				const refreshedPrimary = updatedGarage.find((g: any) => g.id === ownsVehicle.id)
				if (refreshedPrimary) ownsVehicle = refreshedPrimary
			}

			const check = fix(state.check - (paySave + payDebt + vehicleCosts))
			const monthlyGasPaid = sumLedgerAmounts(state.ledger, (desc) => desc.includes('Gas'))
			const monthlyUtilitiesPaid = sumLedgerAmounts(state.ledger, (desc) => desc.includes('Utilities & Phone/Internet'))
			const monthlyLuxuryEventSpend = sumLedgerAmounts(state.ledger, (desc) => desc === 'Entertainment' || desc === 'Subscription Entertainment')
			const totalGasPaid = round2(Number(state.totalGasPaid || 0) + monthlyGasPaid)
			const totalUtilitiesPaid = round2(Number(state.totalUtilitiesPaid || 0) + monthlyUtilitiesPaid)
			const maxMonthlyLuxuryEventSpend = Math.max(Number(state.maxMonthlyLuxuryEventSpend || 0), Number(monthlyLuxuryEventSpend || 0))

			let resultingCheck = check

			const eduProgress = { ...state.eduProgress }
			let activeEdu = state.activeEdu
			const credentials = [...state.credentials]
			const credentialHistory = [...state.credentialHistory]
			const eventHistory = [...(state.eventHistory || [])]
			const careerHistory = [...state.careerHistory]
			const nextJobMarket = { ...(state.jobMarket || {}) }
			let job = state.job
			let tenure = state.tenure
			let celebration = null as 'degree' | 'certification' | 'job-accepted' | 'promotion' | 'debt-paid-off' | 'car-paid-off' | 'pay-bump' | 'achievement' | 'rainbow' | null
			
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
			const syncedTransit = syncTransitWithGarage(transit, updatedGarage)
			if (syncedTransit.name !== transit.name) {
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Transit auto-adjusted to ${syncedTransit.name} based on owned vehicles` })
			}
			transit = syncedTransit

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
				// Free one slot in old role and occupy one in the new role.
				if (nextJobMarket[prev.title]) {
					nextJobMarket[prev.title] = {
						...nextJobMarket[prev.title],
						occupied: Math.max(0, nextJobMarket[prev.title].occupied - 1)
					}
				}
				if (nextJobMarket[state.pendingJob.title]) {
					nextJobMarket[state.pendingJob.title] = {
						...nextJobMarket[state.pendingJob.title],
						occupied: Math.min(nextJobMarket[state.pendingJob.title].capacity, nextJobMarket[state.pendingJob.title].occupied + 1)
					}
				}
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
					const streakBonus = Math.min(10, Math.floor(paymentStreak / 3) * 5) // 5 points per 3 consecutive payments, max 10
					credit = Math.min(850, credit + 3 + streakBonus)
					if (paymentStreak % 1 === 0) {
						logs.push({ date: `${nextMonth}/${nextYear}`, msg: `✅ On-time payment streak (${paymentStreak} months) - credit +${1 + streakBonus} (${credit})` })
					} else {
						logs.push({ date: `${nextMonth}/${nextYear}`, msg: `✅ On-time payment - credit +1 (${credit})` })
					}
				} else {
					// Minimum payment required to maintain credit
					credit = Math.max(300, credit - 50)
					paymentStreak = 0
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Payment missed - credit score reduced by 50 points (${credit})` })
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
			if (credit > 825 && tenure >= 12) {
				const monthsSinceLastAutoBump = (nextYear - state.lastAutoBumpYear) * 12 + (nextMonth - state.lastAutoBumpMonth)
				if (monthsSinceLastAutoBump >= 12) {
					const autoBumpAmount = 1 // 1% annual bump for maintaining excellent credit
					updatedJob = { ...job, base: fix(job.base * (1 + autoBumpAmount / 100)) }
					const oldPay = Math.round(job.base * city.p * 0.8)
					const newPay = Math.round(updatedJob.base * city.p * 0.8)
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🎉 Automatic annual pay bump (credit > 800): $${oldPay}/mo → $${newPay}/mo (+1%)` })
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

			// Between-month random event: applies after settlement and before the next statement.
			const interMonthEvent = pickInterMonthEvent({ ...state, job: updatedJob, activeEdu, garage: updatedGarage, credit, paymentStreak })
			if (interMonthEvent) {
				const scaledEventAmount = scaleLifeEventAmount(interMonthEvent, Math.max(0, updatedJob.base * city.p * 0.8))
				const delta = interMonthEvent.type === 'in' ? scaledEventAmount : -scaledEventAmount
				resultingCheck = fix(resultingCheck + delta)
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: `${interMonthEvent.icon} Mid-month event: ${interMonthEvent.title} (${interMonthEvent.type === 'in' ? '+' : '-'}$${scaledEventAmount.toFixed(2)})`
				})
				eventHistory.push({
					id: interMonthEvent.id,
					title: interMonthEvent.title,
					amount: scaledEventAmount,
					type: interMonthEvent.type,
					icon: interMonthEvent.icon,
					desc: interMonthEvent.desc,
					trigger: interMonthEvent.trigger,
					month: nextMonth,
					year: nextYear
				})

				if (resultingCheck < 0) {
					const eventShortfall = fix(Math.abs(resultingCheck))
					newDebt = fix(newDebt + eventShortfall)
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Auto-loan taken: $${eventShortfall.toFixed(2)} to cover event shortfall` })
					resultingCheck = 0
				}
			}

			const nextEntertainmentBudgets = autoAdjustEntertainmentBudgets(
				state.entertainmentSpending || 0,
				state.subscriptionEntertainmentSpending || 0,
				nextYear,
				nextMonth,
				updatedJob.title,
				city.name,
				entertainmentCapForSalary(updatedJob, city)
			)

			const currentMonthEntertainmentBudgets = autoAdjustEntertainmentBudgets(
				state.entertainmentSpending || 0,
				state.subscriptionEntertainmentSpending || 0,
				state.year,
				state.month,
				job.title,
				state.city.name,
				entertainmentCapForSalary(job, state.city)
			)

			let nextSubscriptionStreakMonths = (state.subscriptionStreakMonths || 0)
			if ((currentMonthEntertainmentBudgets.subscriptionBudget || 0) > 0) {
				nextSubscriptionStreakMonths += 1
			} else {
				nextSubscriptionStreakMonths = 0
			}

			const nextSubscriptionBadges = [...(state.subscriptionBadges || [])]
			for (const milestone of subscriptionBadgeMilestones()) {
				if (nextSubscriptionStreakMonths >= milestone.months && !nextSubscriptionBadges.some((b: any) => b.id === milestone.id)) {
					nextSubscriptionBadges.push({
						id: milestone.id,
						name: milestone.name,
						icon: milestone.icon,
						months: milestone.months,
						awardedMonth: nextMonth,
						awardedYear: nextYear
					})
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `${milestone.icon} Badge earned: ${milestone.name} (${milestone.months} month subscription streak)` })
				}
			}

			const hostCount = entertainmentHostCount(currentMonthEntertainmentBudgets.entertainmentBudget || 0)
			const wentIntoDebtThisMonth = debtBefore <= 0 && newDebt > 0
			let nextEntertainmentTicketStubs = [...(state.entertainmentTicketStubs || [])]
			if (hostCount >= 2 && !wentIntoDebtThisMonth) {
				const stub = ticketStubForHostCount(hostCount)
				nextEntertainmentTicketStubs.unshift({
					id: `stub-${nextYear}-${nextMonth}-${hostCount}`,
					title: stub.title,
					icon: stub.icon,
					hostedCount: hostCount,
					month: nextMonth,
					year: nextYear
				})
				nextEntertainmentTicketStubs = nextEntertainmentTicketStubs.slice(0, 24)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `${stub.icon} Ticket stub collected: ${stub.title} (hosted ${hostCount} entertainment events)` })
			} else if (hostCount >= 2 && wentIntoDebtThisMonth) {
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🎟️ Ticket stub not awarded: entertainment spending pushed you into debt this month.` })
			}

			const monthsSinceVehiclePurchase = (() => {
				if (!updatedGarage.length) return Number.MAX_SAFE_INTEGER
				let best = Number.MAX_SAFE_INTEGER
				for (const g of updatedGarage) {
					if (typeof g.purchaseMonth !== 'number' || typeof g.purchaseYear !== 'number') continue
					const months = (nextYear - g.purchaseYear) * 12 + (nextMonth - g.purchaseMonth)
					if (months < best) best = months
				}
				return best
			})()

			const netMonthlyIncome = Math.max(0, updatedJob.base * city.p * 0.8)
			const luxuryDiscretionary = totalLuxuryServiceDiscretionary({ ...state, job: updatedJob, city })
			const discretionarySpend = (nextEntertainmentBudgets.entertainmentBudget || 0) + (nextEntertainmentBudgets.subscriptionBudget || 0) + luxuryDiscretionary
			let happinessDelta = 0
			let negativeMoodDebuffs = 0

			if (newDebt > 0) negativeMoodDebuffs += 5
			if (tenure >= 12 && netMonthlyIncome < 3200) negativeMoodDebuffs += 4
			if (netMonthlyIncome >= 10000) negativeMoodDebuffs += 2
			if (netMonthlyIncome >= 20000) negativeMoodDebuffs += 2
			if (monthsSinceVehiclePurchase > 6) negativeMoodDebuffs += 3
			if (discretionarySpend < netMonthlyIncome * 0.03) negativeMoodDebuffs += 2

			happinessDelta -= negativeMoodDebuffs

			if (state.luxuryServices?.housekeeper) happinessDelta += 2
			if (state.luxuryServices?.concierge) happinessDelta += 3
			if (state.luxuryServices?.trainer) happinessDelta += 1
			if (state.luxuryServices?.therapist) {
				// Therapist nearly neutralizes monthly mood debuffs without completely erasing consequences.
				const therapistOffset = Math.floor(negativeMoodDebuffs * 0.85)
				happinessDelta += therapistOffset + 1
			}

			const nextHappiness = Math.max(0, Math.min(100, Math.round((state.happiness ?? 70) + happinessDelta)))

			const workRiskBase = 0.12
			const debtRisk = newDebt > 0 ? 0.06 : 0
			const lowHappinessRisk = nextHappiness < 45 ? 0.08 : nextHappiness < 60 ? 0.04 : 0
			const trainerRelief = state.luxuryServices?.trainer ? 0.07 : 0
			const missWorkRisk = Math.max(0.01, Math.min(0.35, workRiskBase + debtRisk + lowHappinessRisk - trainerRelief))

			const workSeed = hashString(`${nextYear}-${nextMonth}-${updatedJob.title}-${city.name}-work`)
			const workRoll = mulberry32(workSeed)()
			let nextWorkPenaltyPercent = 0
			if (workRoll < missWorkRisk) {
				nextWorkPenaltyPercent = round2(0.06 + mulberry32(workSeed ^ 0x9e3779b9)() * 0.12)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `⚠️ Missed work this month. Next statement salary reduced by ${(nextWorkPenaltyPercent * 100).toFixed(1)}%` })
			} else if (state.luxuryServices?.trainer) {
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: '💪 Personal trainer kept your consistency high this month.' })
			}

			if (state.luxuryServices?.therapist) {
				const rainbowSeed = hashString(`${nextYear}-${nextMonth}-${updatedJob.title}-${city.name}-rainbow`)
				if (mulberry32(rainbowSeed)() < 0.35) {
					celebration = 'rainbow' as any
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: '🌈 Therapy breakthrough! A rainbow moment boosted your mood.' })
				}
			}

			const previousMarketPrices = normalizeMarketPrices(state.marketPrices)
			const autoInvestResult = applyAutoInvestCycle(
				resultingCheck,
				Array.isArray(state.portfolio) ? state.portfolio : [],
				previousMarketPrices,
				normalizeMarketPrices(state.marketPricesPrevious || previousMarketPrices),
				state.autoInvest,
				logs,
				nextMonth,
				nextYear
			)
			resultingCheck = autoInvestResult.checkBalance
			const nextPortfolio = autoInvestResult.portfolio
			logs = autoInvestResult.logs
			const stockInvestedLastMonth = round2(Number(state.stockInvestedThisMonth || 0) + Number(autoInvestResult.investedAmount || 0))
			const nextMarketPrices = advanceMarketPrices(previousMarketPrices, nextYear, nextMonth)

			const achievementSnapshot = {
				...state,
				check: resultingCheck,
				save: newSave,
				debt: newDebt,
				tenure,
				credentials,
				garage: updatedGarage,
				portfolio: nextPortfolio,
				marketPrices: nextMarketPrices,
				logs,
				luxuryServices: state.luxuryServices,
				calculationStreak: state.calculationStreak,
				house: state.house,
				totalGasPaid,
				totalUtilitiesPaid,
				maxMonthlyLuxuryEventSpend
			}
			const unlockedNow = generateAchievementUnlocks(achievementSnapshot)
			const achievementsUnlocked = Array.from(new Set([...(state.achievementsUnlocked || []), ...unlockedNow.map((a: any) => a.id)]))
			const achievementHistory = [...(state.achievementHistory || [])]
			let rewardTokens = Number(state.rewardTokens || 0)
			let lastAchievementCategory = state.lastAchievementCategory || null
			for (const ach of unlockedNow) {
				rewardTokens += Number(ach.tokenReward || 1)
				lastAchievementCategory = ach.category
				achievementHistory.unshift({ id: ach.id, title: ach.title, category: ach.category, month: nextMonth, year: nextYear })
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🏆 Achievement unlocked: ${ach.title} (+${ach.tokenReward || 1} reward spin)` })
			}
			if (unlockedNow.length > 0) {
				celebration = 'achievement'
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
				jobMarket: nextJobMarket,
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
				eventHistory,
				pendingJob: pendingJobToApply,
				jobStartMonth: state.pendingJob ? nextMonth : state.jobStartMonth,
				jobStartYear: state.pendingJob ? nextYear : state.jobStartYear,
				lastAutoBumpMonth: newLastAutoBumpMonth,
				lastAutoBumpYear: newLastAutoBumpYear,
				entertainmentSpending: nextEntertainmentBudgets.entertainmentBudget,
				subscriptionEntertainmentSpending: nextEntertainmentBudgets.subscriptionBudget,
				subscriptionStreakMonths: nextSubscriptionStreakMonths,
				subscriptionBadges: nextSubscriptionBadges,
				entertainmentTicketStubs: nextEntertainmentTicketStubs,
				happiness: nextHappiness,
				workPenaltyPercent: nextWorkPenaltyPercent,
				marketPricesPrevious: previousMarketPrices,
				marketPrices: nextMarketPrices,
				portfolio: nextPortfolio,
				stockInvestedThisMonth: 0,
				stockInvestedLastMonth,
				totalGasPaid,
				totalUtilitiesPaid,
				maxMonthlyLuxuryEventSpend,
				achievementsUnlocked,
				achievementHistory: achievementHistory.slice(0, 40),
				rewardTokens,
				lastAchievementCategory,
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
				date: state.tenure >= 6 ? `${state.month}/${state.year}` : `~${state.month}/${state.year}`, // if tenure < 6 months, show approximate date since negotiation may take time
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
				msg: `Automatic annual pay bump (credit > 825): $${oldPay}/mo → $${newPay}/mo (+${bumpPercentage.toFixed(1)}%)`
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
		case 'BUY_STOCK': {
			const { ticker, shares } = action.payload || {}
			const quantity = Math.max(0, Math.floor(Number(shares || 0)))
			if (!ticker || quantity <= 0) return state

			const asset = stockMarketAssets.find(a => a.ticker === ticker)
			if (!asset) return state

			const marketPrice = Number(state.marketPrices?.[ticker] || asset.basePrice)
			const price = executionPriceWithSlippage(marketPrice, `${ticker}-${state.month}-${state.year}-${Date.now()}-buy`)
			const totalCost = round2(price * quantity)
			if (state.check < totalCost) {
				const logs = [...state.logs, { date: `${state.month}/${state.year}`, msg: `Stock buy blocked for ${ticker}: insufficient checking balance.` }]
				return { ...state, logs }
			}

			const portfolio = Array.isArray(state.portfolio) ? [...state.portfolio] : []
			const idx = portfolio.findIndex((h: any) => h.ticker === ticker)
			if (idx >= 0) {
				const existing = portfolio[idx]
				const existingShares = Number(existing.shares || 0)
				const existingAvg = Number(existing.avgCost || price)
				const newShares = existingShares + quantity
				const newAvg = newShares > 0 ? round2(((existingShares * existingAvg) + totalCost) / newShares) : price
				portfolio[idx] = { ...existing, shares: newShares, avgCost: newAvg }
			} else {
				portfolio.push({ ticker, shares: quantity, avgCost: round2(price) })
			}

			const fillType = slippageLabel(price, marketPrice)
			const logs = [...state.logs, { date: `${state.month}/${state.year}`, msg: `📈 Bought ${quantity} ${ticker} @ $${price.toFixed(2)} (${fillType}, ${totalCost.toFixed(2)})` }]
			return {
				...state,
				check: round2(state.check - totalCost),
				stockInvestedThisMonth: round2(Number(state.stockInvestedThisMonth || 0) + totalCost),
				portfolio,
				logs
			}
		}
		case 'SELL_STOCK': {
			const { ticker, shares } = action.payload || {}
			const quantity = Math.max(0, Math.floor(Number(shares || 0)))
			if (!ticker || quantity <= 0) return state

			const asset = stockMarketAssets.find(a => a.ticker === ticker)
			if (!asset) return state

			const portfolio = Array.isArray(state.portfolio) ? [...state.portfolio] : []
			const idx = portfolio.findIndex((h: any) => h.ticker === ticker)
			if (idx < 0) {
				const logs = [...state.logs, { date: `${state.month}/${state.year}`, msg: `Stock sale blocked for ${ticker}: no shares owned.` }]
				return { ...state, logs }
			}

			const holding = portfolio[idx]
			const ownedShares = Math.max(0, Math.floor(Number(holding.shares || 0)))
			const sellShares = Math.min(quantity, ownedShares)
			if (sellShares <= 0) return state

			const marketPrice = Number(state.marketPrices?.[ticker] || asset.basePrice)
			const price = executionPriceWithSlippage(marketPrice, `${ticker}-${state.month}-${state.year}-${Date.now()}-sell`)
			const proceeds = round2(price * sellShares)
			const remainingShares = ownedShares - sellShares
			if (remainingShares > 0) {
				portfolio[idx] = { ...holding, shares: remainingShares }
			} else {
				portfolio.splice(idx, 1)
			}

			const fillType = slippageLabel(price, marketPrice)
			const logs = [...state.logs, { date: `${state.month}/${state.year}`, msg: `📉 Sold ${sellShares} ${ticker} @ $${price.toFixed(2)} (${fillType}, +$${proceeds.toFixed(2)})` }]
			return {
				...state,
				check: round2(state.check + proceeds),
				portfolio,
				logs
			}
		}
		case 'SPIN_REWARD_WHEEL': {
			if (Number(state.rewardTokens || 0) <= 0) return state
			const prize = spinRewardPrize(state, action.payload?.forcedPrize)
			let check = Number(state.check || 0)
			let portfolio = Array.isArray(state.portfolio) ? [...state.portfolio] : []
			let garage = Array.isArray(state.garage) ? [...state.garage] : []
			let ownsVehicle = state.ownsVehicle
			let unlockedThemes = Array.isArray(state.unlockedThemes) ? [...state.unlockedThemes] : ['default']
			const logs = [...state.logs]
			const rewardHistory = Array.isArray(state.rewardHistory) ? [...state.rewardHistory] : []

			if (prize.kind === 'cash') {
				check = round2(check + Number(prize.value || 0))
				logs.push({ date: `${state.month}/${state.year}`, msg: `🎁 Reward wheel: ${prize.label}` })
			} else if (prize.kind === 'theme') {
				if (!unlockedThemes.includes(prize.value)) unlockedThemes.push(prize.value)
				logs.push({ date: `${state.month}/${state.year}`, msg: `🎨 Reward wheel: unlocked theme ${prize.value}` })
			} else if (prize.kind === 'stock') {
				const marketPrice = Number(state.marketPrices?.[prize.ticker] || 0)
				if (marketPrice > 0 && Number(prize.shares || 0) > 0) {
					portfolio = addOrUpdateHolding(portfolio, prize.ticker, Number(prize.shares), marketPrice)
					logs.push({ date: `${state.month}/${state.year}`, msg: `🎁 Reward wheel: granted ${prize.shares} ${prize.ticker} shares` })
				}
			} else if (prize.kind === 'vehicle') {
				const vehicle = vehicleDatabase.vehicles.find((v: any) => v.id === prize.vehicleId)
				if (vehicle) {
					const rewardCar = {
						id: `reward-${prize.vehicleId}-${Date.now()}`,
						vehicleId: vehicle.id,
						vehicleName: vehicle.name,
						purchasePrice: vehicle.newPrice,
						currentValue: vehicle.newPrice,
						condition: 'new',
						financed: false,
						monthsRemaining: 0,
						monthlyPayment: 0,
						purchaseMonth: state.month,
						purchaseYear: state.year,
						for_sale: false
					}
					garage.push(rewardCar)
					if (!ownsVehicle) ownsVehicle = rewardCar
					logs.push({ date: `${state.month}/${state.year}`, msg: `🎁 Reward wheel: gifted vehicle ${vehicle.name}` })
				}
			}

			rewardHistory.unshift({ month: state.month, year: state.year, label: prize.label || prize.kind, category: state.lastAchievementCategory || 'general' })
			return {
				...state,
				check,
				portfolio,
				garage,
				ownsVehicle,
				unlockedThemes: Array.from(new Set(unlockedThemes)),
				rewardTokens: Math.max(0, Number(state.rewardTokens || 0) - 1),
				rewardHistory: rewardHistory.slice(0, 40),
				logs
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
		const applyLedgerDecimalVariance = (amount: number, key: string) => {
			if (amount <= 0) return 0
			const seedText = `${state.year}-${state.month}-${state.city.name}-${job.title}-${key}`
			let hash = 0
			for (let i = 0; i < seedText.length; i++) hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0
			const offset = ((hash % 91) - 45) / 100 // deterministic +/- $0.45 variance
			return fix(Math.max(0.01, amount + offset))
		}
		const grossSalary = fix(job.base * state.city.p)
		const baseNetSalary = fix(grossSalary * 0.8)
		const workPenaltyPercent = Math.max(0, Math.min(0.35, state.workPenaltyPercent || 0))
		const netSalary = applyLedgerDecimalVariance(fix(baseNetSalary * (1 - workPenaltyPercent)), 'net-salary') // 80% after taxes + attendance adjustment
		
		// INCOME
		bal = fix(bal + netSalary)
		ledger.push({ id: id++, desc: `Net Salary: ${job.title}${workPenaltyPercent > 0 ? ` (${(workPenaltyPercent * 100).toFixed(1)}% attendance impact)` : ''}`, amt: netSalary, type: 'inc', bal, done: false })
		
		// HOUSING - Dynamic rent based on 30% of salary
		const rent = applyLedgerDecimalVariance(fix(netSalary * gameValues.rentPercentOfSalary * state.city.r), 'rent')
		bal = fix(bal - rent)
		ledger.push({ id: id++, desc: `Housing/Rent Payment (${Math.round(gameValues.rentPercentOfSalary * 100)}% salary)`, amt: rent, type: 'out', bal, done: false })
		const mortgagePayment = Math.max(
			0,
			Number(state.house?.mortgagePayment ?? state.house?.monthlyPayment ?? state.house?.mortgage ?? 0)
		)
		const housingPaymentForUtilities = mortgagePayment > 0 ? mortgagePayment : rent
		
		// TRANSPORTATION
		// If chauffeur hired, no gas/transit cost (chauffeur covers it)
		if (!state.luxuryServices.chauffer) {
			// Transit cost
			const transitCost = applyLedgerDecimalVariance(state.transit.cost, `transit-${state.transit.name}`)
			bal = fix(bal - transitCost)
			ledger.push({ id: id++, desc: `Transit: ${state.transit.name}`, amt: transitCost, type: 'out', bal, done: false })
			
			// Gas cost (if not using L1 Walk/Bike and no vehicle owned - vehicle costs handled separately)
			if (state.transit.level > 1 && !(state.garage && state.garage.length > 0)) {
				const gas = variableCost(gameValues.gasCostPercentOfSalary * 0.5, state.month, state.year, state.city.p, 'gas', state.city.name)
				const carMaint = variableCost(gameValues.carMaintenance, state.month, state.year, state.city.p, 'car', state.city.name)
				const gasAndMaint = applyLedgerDecimalVariance(fix(gas + carMaint), 'gas-maint-no-vehicle')
				bal = fix(bal - gasAndMaint)
				ledger.push({ id: id++, desc: 'Gas & Car Maintenance', amt: gasAndMaint, type: 'out', bal, done: false })
			}
		} else {
			// Chauffeur cost handled in luxury services section
		}
		
		// UTILITIES & PHONE (utilities track your rent/mortgage burden and vary seasonally)
		const utilitiesBase = fix(housingPaymentForUtilities * 0.12)
		const utilities = variableCost(utilitiesBase, state.month, state.year, 1, 'utilities', state.city.name)
		const phoneInternet = gameValues.phoneInternetBase
		const totalUtilities = applyLedgerDecimalVariance(fix(utilities + phoneInternet), 'utilities-phone')
		bal = fix(bal - totalUtilities)
		ledger.push({ id: id++, desc: 'Utilities & Phone/Internet', amt: totalUtilities, type: 'out', bal, done: false })
		
		// FOOD - If personal chef hired, no food costs (chef provides meals)
		if (!state.luxuryServices.chef) {
			const foodCost = applyLedgerDecimalVariance(variableCost(gameValues.FoodCostPercentOfSalary * 0.8, state.month, state.year, state.city.p, 'food', state.city.name), 'food')
			bal = fix(bal - foodCost)
			ledger.push({ id: id++, desc: 'Food & Groceries', amt: foodCost, type: 'out', bal, done: false })
		}
		
		// ENTERTAINMENT
		const entertainmentCap = entertainmentCapForSalary(job, state.city)
		const adjustedEntertainment = autoAdjustEntertainmentBudgets(
			state.entertainmentSpending || 0,
			state.subscriptionEntertainmentSpending || 0,
			state.year,
			state.month,
			job.title,
			state.city.name,
			entertainmentCap
		)

		if (adjustedEntertainment.entertainmentBudget > 0) {
			const entertainmentCost = applyLedgerDecimalVariance(
				variableCost(adjustedEntertainment.entertainmentBudget, state.month, state.year, 1, 'entertainment', state.city.name),
				'entertainment-general'
			)
			bal = fix(bal - entertainmentCost)
			ledger.push({ id: id++, desc: 'Entertainment', amt: entertainmentCost, type: 'out', bal, done: false })
		}

		if (adjustedEntertainment.subscriptionBudget > 0) {
			const subscriptionCost = applyLedgerDecimalVariance(
				variableCost(adjustedEntertainment.subscriptionBudget, state.month, state.year, 1, 'entertainment', `${state.city.name}-subs`),
				'entertainment-subscriptions'
			)
			bal = fix(bal - subscriptionCost)
			ledger.push({ id: id++, desc: 'Subscription Entertainment', amt: subscriptionCost, type: 'out', bal, done: false })
		}

		const stockInvestDebit = fix(Number(state.stockInvestedLastMonth || 0))
		if (stockInvestDebit > 0) {
			bal = fix(bal - stockInvestDebit)
			ledger.push({ id: id++, desc: 'Stock Investments (Cost Basis)', amt: stockInvestDebit, type: 'out', bal, done: false })
		}
		
		// EDUCATION - If currently studying
		if (state.activeEdu) {
			const course = academyCourses.find(c => c.n === state.activeEdu)
			const cost = applyLedgerDecimalVariance(course ? course.c : 1000, `tuition-${state.activeEdu}`)
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
					const payment = applyLedgerDecimalVariance(g.monthlyPayment, `vehicle-payment-${g.id}`)
					bal = fix(bal - payment)
					ledger.push({ id: id++, desc: `Vehicle Loan Payment: ${g.vehicleName}`, amt: payment, type: 'out', bal, done: false })
				}

				if (!state.luxuryServices.chauffer) {
					// Monthly gas for this vehicle
					const gasCost = calculateMonthlyGasCost(g)
					if (gasCost > 0) {
						const adjustedGasCost = applyLedgerDecimalVariance(gasCost, `vehicle-gas-${g.id}`)
						bal = fix(bal - adjustedGasCost)
						ledger.push({ id: id++, desc: `Gas: ${g.vehicleName}`, amt: adjustedGasCost, type: 'out', bal, done: false })
					}

					// Monthly maintenance for this vehicle
					const maintCost = calculateMonthlyMaintenanceCost(g, state.month, state.year)
					if (maintCost > 0) {
						const adjustedMaintCost = applyLedgerDecimalVariance(maintCost, `vehicle-maint-${g.id}`)
						bal = fix(bal - adjustedMaintCost)
						ledger.push({ id: id++, desc: `Maintenance: ${g.vehicleName}`, amt: adjustedMaintCost, type: 'out', bal, done: false })
					}
				}
			})
		}
		
		// LUXURY SERVICES
		let luxuryCosts = 0
		const luxuryServicesList: string[] = []
		const luxuryLineItems: Array<{ desc: string; amt: number }> = []
		const netMonthlyIncome = Math.max(0, (job?.base || 0) * (state.city?.p || 1) * 0.8)
		const luxuryServiceConfigs = [
			{ id: 'chef', label: 'Chef', varianceKey: 'luxury-chef' },
			{ id: 'housekeeper', label: 'Housekeeper', varianceKey: 'luxury-housekeeper' },
			{ id: 'chauffer', label: 'Chauffeur', varianceKey: 'luxury-chauffeur' },
			{ id: 'therapist', label: 'Therapist', varianceKey: 'luxury-therapist' },
			{ id: 'trainer', label: 'Trainer', varianceKey: 'luxury-trainer' },
			{ id: 'concierge', label: 'Concierge', varianceKey: 'luxury-concierge' },
			{ id: 'accountant', label: 'Accountant', varianceKey: 'luxury-accountant' }
		]

		for (const cfg of luxuryServiceConfigs) {
			if (!(state.luxuryServices as any)?.[cfg.id]) continue
			const baseCost = calculateLuxuryServiceMonthlyPay(cfg.id, netMonthlyIncome)
			const adjustedCost = applyLedgerDecimalVariance(baseCost, cfg.varianceKey)
			luxuryCosts += adjustedCost
			luxuryServicesList.push(`${cfg.label}: $${adjustedCost}`)
			luxuryLineItems.push({ desc: `Luxury Service: ${cfg.label}`, amt: adjustedCost })
		}
		
		if (luxuryCosts > 0) {
			if (state.luxuryServices.housekeeper) {
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
			} else {
				for (const line of luxuryLineItems) {
					bal = fix(bal - line.amt)
					ledger.push({
						id: id++,
						desc: line.desc,
						amt: line.amt,
						type: 'out',
						bal,
						done: false
					})
				}
			}
		}

		if (state.luxuryServices?.accountant) {
			const first = ledger[0]
			const others = ledger.slice(1)
			const totalDebits = fix(others.reduce((sum, row) => row?.type === 'out' ? sum + Number(row?.amt || 0) : sum, 0))
			const nonDebitRows = others.filter((row) => row?.type !== 'out')

			let runningBal = Number(first?.bal || 0)
			const simplified: any[] = [{ ...first, id: 0, bal: runningBal, done: true }]

			if (totalDebits > 0) {
				runningBal = fix(runningBal - totalDebits)
				simplified.push({
					id: simplified.length,
					desc: 'Accountant Summary: Total Debits',
					amt: totalDebits,
					type: 'out',
					bal: runningBal,
					done: false,
					details: ['All debit items auto-summed by Accountant service']
				})
			}

			for (const row of nonDebitRows) {
				if (row?.type === 'in') runningBal = fix(runningBal + Number(row?.amt || 0))
				simplified.push({
					...row,
					id: simplified.length,
					bal: runningBal,
					done: false
				})
			}

			ledger.length = 0
			ledger.push(...simplified)
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

	function processMonth(paySave = 0, payDebt = 0, skippedPayment = false) {
		dispatch({ type: 'PROCESS_MONTH', payload: { paySave, payDebt, skippedPayment } })
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
				const eligibility = getJobEligibility(state, app.job)
				if (!eligibility.canApply) {
					app.status = 'rejected'
					results.push({ id: app.id, status: 'rejected', title: app.job.title, job: app.job })
					logs.push({ date: `${state.month}/${state.year}`, msg: `Application rejected for ${app.job.title} (requirements changed or no openings)` })
					changed = true
					return
				}

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
		const fallbackBudgets = comfortableEntertainmentDefaults(data.job || state.job, data.city || state.city)
		const marketPrices = normalizeMarketPrices(data.marketPrices)
		dispatch({
			type: 'SET_STATE',
			payload: {
				...data,
				currentUser: u,
				entertainmentSpending: data.entertainmentSpending ?? fallbackBudgets.entertainmentSpending,
				subscriptionEntertainmentSpending: data.subscriptionEntertainmentSpending ?? fallbackBudgets.subscriptionEntertainmentSpending,
				subscriptionStreakMonths: data.subscriptionStreakMonths ?? 0,
				subscriptionBadges: data.subscriptionBadges ?? [],
				entertainmentTicketStubs: data.entertainmentTicketStubs ?? [],
				happiness: data.happiness ?? 70,
				workPenaltyPercent: data.workPenaltyPercent ?? 0,
				marketPrices,
				marketPricesPrevious: normalizeMarketPrices(data.marketPricesPrevious || marketPrices),
				portfolio: Array.isArray(data.portfolio) ? data.portfolio : [],
				marketLearningLevel: data.marketLearningLevel ?? 'adult',
				marketUsePlainLanguage: data.marketUsePlainLanguage ?? false,
				autoInvest: normalizeAutoInvestConfig(data.autoInvest),
				stockInvestedThisMonth: Number(data.stockInvestedThisMonth ?? 0),
				stockInvestedLastMonth: Number(data.stockInvestedLastMonth ?? 0),
				totalGasPaid: Number(data.totalGasPaid ?? 0),
				totalUtilitiesPaid: Number(data.totalUtilitiesPaid ?? 0),
				maxMonthlyLuxuryEventSpend: Number(data.maxMonthlyLuxuryEventSpend ?? 0),
				achievementsUnlocked: Array.isArray(data.achievementsUnlocked) ? data.achievementsUnlocked : [],
				achievementHistory: Array.isArray(data.achievementHistory) ? data.achievementHistory : [],
				rewardTokens: Number(data.rewardTokens ?? 0),
				lastAchievementCategory: data.lastAchievementCategory ?? null,
				unlockedThemes: Array.isArray(data.unlockedThemes) && data.unlockedThemes.length ? Array.from(new Set(['default', ...data.unlockedThemes])) : ['default'],
				activeTheme: data.activeTheme ?? 'default',
				rewardHistory: Array.isArray(data.rewardHistory) ? data.rewardHistory : []
			}
		})
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
		const defaultBudgets = comfortableEntertainmentDefaults({ title: 'Odd Jobs', base: 600 }, cityData[3])
		const startingMarketPrices = initializeMarketPrices()
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
			jobMarket: initializeJobMarket(jobBoard),
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
				concierge: false,
				accountant: false
			},
			entertainmentSpending: defaultBudgets.entertainmentSpending,
			subscriptionEntertainmentSpending: defaultBudgets.subscriptionEntertainmentSpending,
			subscriptionStreakMonths: 0,
			subscriptionBadges: [],
			entertainmentTicketStubs: [],
			happiness: 70,
			workPenaltyPercent: 0,
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
			marketPrices: startingMarketPrices,
			marketPricesPrevious: startingMarketPrices,
			portfolio: [],
			marketLearningLevel: 'adult',
			marketUsePlainLanguage: false,
			autoInvest: {
				enabled: false,
				monthlyAmount: 0,
				profileId: 'balanced'
			},
			stockInvestedThisMonth: 0,
			stockInvestedLastMonth: 0,
			totalGasPaid: 0,
			totalUtilitiesPaid: 0,
			maxMonthlyLuxuryEventSpend: 0,
			achievementsUnlocked: [],
			achievementHistory: [],
			rewardTokens: 0,
			lastAchievementCategory: null,
			unlockedThemes: ['default'],
			activeTheme: 'default',
			rewardHistory: []
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
			const fallbackBudgets = comfortableEntertainmentDefaults(data.job || state.job, data.city || state.city)
			const marketPrices = normalizeMarketPrices(data.marketPrices)
			dispatch({
				type: 'SET_STATE',
				payload: {
					...data,
					currentUser: user,
					entertainmentSpending: data.entertainmentSpending ?? fallbackBudgets.entertainmentSpending,
					subscriptionEntertainmentSpending: data.subscriptionEntertainmentSpending ?? fallbackBudgets.subscriptionEntertainmentSpending,
					subscriptionStreakMonths: data.subscriptionStreakMonths ?? 0,
					subscriptionBadges: data.subscriptionBadges ?? [],
					entertainmentTicketStubs: data.entertainmentTicketStubs ?? [],
					happiness: data.happiness ?? 70,
					workPenaltyPercent: data.workPenaltyPercent ?? 0,
					marketPrices,
					marketPricesPrevious: normalizeMarketPrices(data.marketPricesPrevious || marketPrices),
					portfolio: Array.isArray(data.portfolio) ? data.portfolio : [],
					marketLearningLevel: data.marketLearningLevel ?? 'adult',
					marketUsePlainLanguage: data.marketUsePlainLanguage ?? false,
					autoInvest: normalizeAutoInvestConfig(data.autoInvest),
					stockInvestedThisMonth: Number(data.stockInvestedThisMonth ?? 0),
					stockInvestedLastMonth: Number(data.stockInvestedLastMonth ?? 0),
					totalGasPaid: Number(data.totalGasPaid ?? 0),
					totalUtilitiesPaid: Number(data.totalUtilitiesPaid ?? 0),
					maxMonthlyLuxuryEventSpend: Number(data.maxMonthlyLuxuryEventSpend ?? 0),
					achievementsUnlocked: Array.isArray(data.achievementsUnlocked) ? data.achievementsUnlocked : [],
					achievementHistory: Array.isArray(data.achievementHistory) ? data.achievementHistory : [],
					rewardTokens: Number(data.rewardTokens ?? 0),
					lastAchievementCategory: data.lastAchievementCategory ?? null,
					unlockedThemes: Array.isArray(data.unlockedThemes) && data.unlockedThemes.length ? data.unlockedThemes : ['default'],
					activeTheme: data.activeTheme ?? 'default',
					rewardHistory: Array.isArray(data.rewardHistory) ? data.rewardHistory : []
				}
			})
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

	useEffect(() => {
		if (!state.currentUser) return
		// Persist cosmetic unlocks/theme selection immediately so refresh/load keeps them.
		saveStateForUser(state.currentUser, { ...state, currentUser: state.currentUser })
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.currentUser, state.unlockedThemes, state.activeTheme])

	function triggerCelebration(event: 'pay-bump' | 'degree' | 'certification' | 'car-paid-off' | 'debt-paid-off' | 'promotion' | 'job-accepted' | 'achievement' | 'rainbow') {
		dispatch({ type: 'TRIGGER_CELEBRATION', payload: event })
		// Auto-clear after animation
		setTimeout(() => {
			dispatch({ type: 'CLEAR_CELEBRATION' })
		}, 3500)
	}

	function scoreApplication(job: Job) {
		let score = 50
		const eligibility = getJobEligibility(state, job)
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

		// Required prior role experience (±20 points)
		if (job.expReq) {
			if (eligibility.experienceMet) score += 20
			else score -= 20
		}

		// Market openings influence (±10 points)
		if (eligibility.openings <= 0) score -= 10
		else if (eligibility.openings <= 3) score += 2
		else score += 6
		
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
		const existingPending = state.applications.some((a: any) => a.job?.title === job.title && a.status === 'pending')
		if (existingPending) {
			dispatch({ type: 'SET_STATE', payload: { logs: [...state.logs, { date: `${state.month}/${state.year}`, msg: `Already applied: ${job.title}` }] } })
			return
		}

		const eligibility = getJobEligibility(state, job)
		if (!eligibility.canApply) {
			const blocks: string[] = []
			if (!eligibility.educationMet) blocks.push(`education (${job.req})`)
			if (!eligibility.certificationMet) blocks.push(`certification (${job.certReq})`)
			if (!eligibility.transitMet) blocks.push(`transit level ${job.tReq}`)
			if (!eligibility.experienceMet) blocks.push(`experience (${eligibility.experienceDetail})`)
			if (!eligibility.capacityMet) blocks.push('no openings')
			dispatch({
				type: 'SET_STATE',
				payload: { logs: [...state.logs, { date: `${state.month}/${state.year}`, msg: `Application blocked for ${job.title}: ${blocks.join(', ')}` }] }
			})
			return
		}

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
		const variability = job.base * 0.05
		const adjustedBase = job.base + (Math.random() * variability * 2 - variability)
		const offeredJob = { ...job, base: adjustedBase }
		const app: Application = {
			id: `app_${Date.now()}`,
			job: offeredJob,
			appliedMonth,
			appliedYear,
			decisionMonth: dMonth,
			decisionYear: dYear,
			score,
			status: 'pending'
		}
		dispatch({ type: 'APPLY_JOB', payload: app })
	}

	function getLuxuryServiceMonthlyPay(serviceId: string) {
		const netMonthlyIncome = Math.max(0, (state.job?.base || 0) * (state.city?.p || 1) * 0.8)
		return calculateLuxuryServiceMonthlyPay(serviceId, netMonthlyIncome)
	}

	return (
		<GameContext.Provider value={{ state, dispatch, buildLedger, checkRow, processMonth, applyForJob, openSettlement, evaluateApplications, acceptJob, triggerCelebration, jobBoard, cityData, lifeEvents, transitOptions, academyCourses, gameValues, calculateDynamicAPR, calculateCreditBonus, calculatePayNegotiationModifier, calculateRelocationCost, saveGame, loadGame, listSaves, getSavesForCurrentUser, deleteSave, renameSave, newGame, login, logout, vehicleDatabase, calculateVehicleValue, calculateMonthlyPayment, calculateMonthlyGasCost, calculateMonthlyMaintenanceCost, getJobEligibility, getJobOpenings, getLuxuryServiceMonthlyPay }}>
			{children}
		</GameContext.Provider>
	)
}

export function useGame() {
	return useContext(GameContext)
}

export default GameContext
