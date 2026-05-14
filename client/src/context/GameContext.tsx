// During migration we re-export the existing JS implementation to avoid duplication.
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import cityData from '../constants/cityData.constants'
import rawJobBoard from '../constants/jobBoard.constants'
import lifeEvents from '../constants/lifeEvents.constants'
import transitOptions from '../constants/transitOptions.constants'
import rawAcademyCourses from '../constants/academyCourses.constants'
import gameValues from '../constants/gameValues.constants'
import vehicleDatabase from '../constants/vehicleDatabase.constants'
import { stockMarketAssets, autoInvestProfiles } from '../constants/stockMarket.constants'
import { realEstateTemplates, amenityImpact, rentControlByCityType } from '../constants/realEstate.constants'
import { achievementRules } from '../constants/achievements.constants'
import type { Job, LifeEvent } from '@server/types/models.types'
import { getAffluenceComparison } from '../utils/affluence'

type State = any
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '')
const NON_PERSISTED_STATE_KEYS = new Set(['jobMarket', 'realEstateMarket', 'realEstateMarketMeta'])
const CLIENT_ONLY_STATE_KEYS = new Set(['id', 'username', 'isAdmin', 'authToken'])
const APPEND_ONLY_STATE_KEYS = new Set([
	'logs',
	'eventHistory',
	'careerHistory',
	'credentialHistory',
	'applications',
	'achievementHistory',
	'rewardHistory',
	'subscriptionBadges',
	'vehicleHistory',
])

type JobMarketState = Record<string, { capacity: number; occupied: number }>

type EconomyOverrides = {
	recessionSeverity: number
	inflationPressure: number
	jobAvailability: number
	marketVolatility: number
	nextMonthStockShock: number
}

type HistoricalEconomicEventEffects = {
	jobLossChance: number
	forcedDowngradeChance: number
	payCutPercent: number
	monthlyStockShock: number
	essentialCostIncreasePercent: number
	creditDragPerMonth: number
	jobSearchBlocked: boolean
}

type HistoricalEconomicEventState = {
	id: string
	title: string
	era: string
	summary: string
	totalMonths: number
	monthsRemaining: number
	startedMonth: number
	startedYear: number
	effects: HistoricalEconomicEventEffects
}

const DEFAULT_ECONOMY_OVERRIDES: EconomyOverrides = {
	recessionSeverity: 0,
	inflationPressure: 0,
	// jobAvailability is now always 100 (deterministic, not event-modifiable)
	jobAvailability: 100,
	marketVolatility: 100,
	nextMonthStockShock: 0,
}

const DEFAULT_HISTORICAL_EVENT_EFFECTS: HistoricalEconomicEventEffects = {
	jobLossChance: 0,
	forcedDowngradeChance: 0,
	payCutPercent: 0,
	monthlyStockShock: 0,
	essentialCostIncreasePercent: 0,
	creditDragPerMonth: 0,
	jobSearchBlocked: false,
}

let cachedUserSnapshots: any[] = []

type AuthResult = { ok: true; data: any } | { ok: false; error: string }

async function extractErrorMessage(response: Response, fallback: string) {
	try {
		const body = await response.json()
		if (typeof body?.message === 'string' && body.message.trim()) return body.message.trim()
		if (Array.isArray(body?.message) && body.message.length) return String(body.message[0] || fallback)
	} catch {
		// Ignore parse errors and use fallback message.
	}
	return fallback
}

function setCachedUserSnapshots(users: any[]) {
	cachedUserSnapshots = Array.isArray(users) ? users : []
}

function getRegisteredUserCount() {
	return Math.max(1, Array.isArray(cachedUserSnapshots) ? cachedUserSnapshots.length : 1)
}

function capacityScaleForUsers(registeredUsers: number) {
	// Keep growth modest so premium jobs stay competitive as users increase.
	return Math.min(1.35, Math.max(0.9, 0.78 + registeredUsers * 0.12))
}

function inferBaseCapacity(job: any) {
	const category = String(job?.cat || 'Pro')
	const salary = Number(job?.base || 0)
	if (category === 'Entry') return 24
	if (category === 'Military') return 12
	if (category === 'Trades') return 14
	if (category === 'Healthcare') return 10
	if (category === 'Technology') return 10
	if (salary >= 10000) return 4
	if (salary >= 7000) return 6
	return 8
}

function normalizeCredential(value: any) {
	return String(value || '').trim().toLowerCase()
}

async function authenticateUser(username: string, password: string) {
	const payload = JSON.stringify({ username, password })
	const headers = { 'Content-Type': 'application/json' }

	const loginResponse = await fetch(`${API_BASE_URL}/users/login`, {
		method: 'POST',
		headers,
		body: payload
	})

	if (!loginResponse.ok) {
		const error = await extractErrorMessage(loginResponse, 'Invalid credentials or unable to reach server.')
		return { ok: false, error } as AuthResult
	}
	const data = await loginResponse.json()
	return { ok: true, data } as AuthResult
}

async function registerUser(username: string, password: string) {
	const payload = JSON.stringify({ username, password })
	const headers = { 'Content-Type': 'application/json' }

	const registerResponse = await fetch(`${API_BASE_URL}/users`, {
		method: 'POST',
		headers,
		body: payload
	})

	if (!registerResponse.ok) {
		const error = await extractErrorMessage(registerResponse, 'Unable to create user. Username may already exist.')
		return { ok: false, error } as AuthResult
	}
	const data = await registerResponse.json()
	return { ok: true, data } as AuthResult
}

async function fetchUserById(id: string) {
	const response = await fetch(`${API_BASE_URL}/users/${id}`)
	if (!response.ok) return null
	return response.json()
}

async function fetchAllUsers() {
	const response = await fetch(`${API_BASE_URL}/users`)
	if (!response.ok) return []
	const users = await response.json()
	return Array.isArray(users) ? users : []
}

async function fetchAdminUsers(authToken: string) {
	const response = await fetch(`${API_BASE_URL}/users/admin/list`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
	})
	if (!response.ok) return null
	const users = await response.json()
	return Array.isArray(users) ? users : []
}

async function adminUpdateUserById(
	targetUserId: string,
	authToken: string,
	changes: {
		checking: number
		savings: number
		debt: number
		isAdmin: boolean
		username?: string
		password?: string
		jobTitle?: string
		economyOverrides?: {
			recessionSeverity: number
			inflationPressure: number
			jobAvailability: number
			marketVolatility: number
			nextMonthStockShock: number
		}
		economyApplyMonths?: number
		historicalEconomicEvent?: {
			id: string
			title: string
			era: string
			summary: string
			totalMonths: number
			monthsRemaining: number
			startedMonth: number
			startedYear: number
			effects: HistoricalEconomicEventEffects
		} | null
		historicalEventResetNextMonth?: boolean
	},
) {
	const response = await fetch(`${API_BASE_URL}/users/admin/${targetUserId}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
		body: JSON.stringify(changes),
	})
	if (!response.ok) return null
	return response.json()
}

async function adminDeleteUserById(targetUserId: string, authToken: string) {
	const response = await fetch(`${API_BASE_URL}/users/admin/${targetUserId}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
	})
	if (!response.ok) return false
	const result = await response.json()
	return Boolean(result)
}

async function adminGiftUserById(
	targetUserId: string,
	authToken: string,
	payload: { amount: number; templateId: string },
) {
	const response = await fetch(`${API_BASE_URL}/users/admin/${targetUserId}/gift`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`,
		},
		body: JSON.stringify(payload),
	})
	if (!response.ok) {
		const error = await extractErrorMessage(response, 'Unable to send admin gift.')
		return { ok: false, error }
	}
	const data = await response.json()
	return { ok: true, data }
}

async function persistUserState(id: string, state: any) {
	const response = await fetch(`${API_BASE_URL}/users/${id}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(state),
	})
	if (!response.ok) return null
	return response.json()
}

async function spinRewardWheelForUser(id: string) {
	const response = await fetch(`${API_BASE_URL}/game/${id}/spin-reward`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
	})
	if (!response.ok) return null
	return response.json()
}

async function evaluateApplicationsOnServer(state: any) {
	const applications = Array.isArray(state?.applications) ? state.applications : []
	const jobTitles: string[] = Array.from(
		new Set(
			applications
				.map((app: any) => String(app?.job?.title || '').trim())
				.filter((title: string) => !!title),
		),
	)
	const compactState = buildApplicationsRequestState(state, jobTitles)

	const response = await fetch(`${API_BASE_URL}/game/evaluate-applications`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ state: compactState }),
	})
	if (!response.ok) return null
	return response.json()
}

async function applyForJobOnServer(state: any, jobTitle: string) {
	const compactState = buildApplicationsRequestState(state, [jobTitle])

	const response = await fetch(`${API_BASE_URL}/game/apply-job`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ state: compactState, jobTitle }),
	})
	if (!response.ok) return null
	return response.json()
}

function buildApplicationsRequestState(source: any, relevantJobTitles: string[] = []) {
	const snapshot = source || {}
	const cityUserCounts = getUserCityCounts(snapshot)
	const currentCityName = String(snapshot?.city?.name || '')
	const cityUserCount = Math.max(1, Number(cityUserCounts[currentCityName] || 1))
	const requestedTitles = Array.from(
		new Set(
			relevantJobTitles
				.map((title: string) => String(title || '').trim())
				.filter((title: string) => !!title),
		),
	)

	const compactJobMarket = requestedTitles.reduce((acc: Record<string, any>, title: string) => {
		const slot = snapshot?.jobMarket?.[title]
		const fallbackJob = jobBoard.find((job: Job) => job.title === title)
		const fallbackCapacity = Math.max(1, Math.round(Number(fallbackJob?.capacity || inferBaseCapacity(fallbackJob))))
		const normalizedSlot = slot && typeof slot === 'object'
			? slot
			: {
				capacity: fallbackCapacity,
				occupied: Math.floor(fallbackCapacity * 0.75),
			}
		acc[title] = {
			capacity: Number(normalizedSlot.capacity || 0),
			occupied: Number(normalizedSlot.occupied || 0),
		}
		return acc
	}, {})

	return {
		month: Number(snapshot.month || 0),
		year: Number(snapshot.year || 0),
		credit: Number(snapshot.credit || 0),
		tenure: Number(snapshot.tenure || 0),
		city: {
			name: currentCityName,
		},
		cityUserCount,
		credentials: Array.isArray(snapshot.credentials) ? snapshot.credentials : [],
		transit: {
			level: Number(snapshot?.transit?.level || 0),
		},
		job: snapshot?.job?.title
			? {
				title: snapshot.job.title,
			}
			: null,
		careerHistory: Array.isArray(snapshot.careerHistory)
			? snapshot.careerHistory.map((entry: any) => ({
				title: entry?.title,
				months: Number(entry?.months || 0),
			}))
			: [],
		applications: Array.isArray(snapshot.applications) ? snapshot.applications : [],
		jobMarket: compactJobMarket,
		economyOverrides: normalizeEconomyOverrides(snapshot.economyOverrides),
	}
}

function normalizeEconomyOverrides(raw: any): EconomyOverrides {
	// jobAvailability is always 100, not event/admin modifiable
	if (!raw || typeof raw !== 'object') return { ...DEFAULT_ECONOMY_OVERRIDES }
	return {
		recessionSeverity: Math.max(0, Math.min(100, Math.round(Number(raw.recessionSeverity || 0)))),
		inflationPressure: Math.max(0, Math.min(100, Math.round(Number(raw.inflationPressure || 0)))),
		jobAvailability: 100,
		marketVolatility: Math.max(50, Math.min(220, Math.round(Number(raw.marketVolatility || 100)))),
		nextMonthStockShock: Math.max(-0.7, Math.min(0.7, Number(raw.nextMonthStockShock || 0))),
	}
}

function normalizeEconomyApplyMonths(value: any) {
	return Math.max(0, Math.floor(Number(value || 0)))
}

function normalizeHistoricalEconomicEvent(raw: any): HistoricalEconomicEventState | null {
	if (!raw || typeof raw !== 'object') return null
	const id = String(raw.id || '').trim()
	const title = String(raw.title || '').trim()
	if (!id || !title) return null

	const effectsRaw = raw.effects && typeof raw.effects === 'object' ? raw.effects : {}
	const effects: HistoricalEconomicEventEffects = {
		jobLossChance: Math.max(0, Math.min(1, Number(effectsRaw.jobLossChance || 0))),
		forcedDowngradeChance: Math.max(0, Math.min(1, Number(effectsRaw.forcedDowngradeChance || 0))),
		payCutPercent: Math.max(0, Math.min(0.9, Number(effectsRaw.payCutPercent || 0))),
		monthlyStockShock: Math.max(-0.7, Math.min(0.7, Number(effectsRaw.monthlyStockShock || 0))),
		essentialCostIncreasePercent: Math.max(0, Math.min(0.6, Number(effectsRaw.essentialCostIncreasePercent || 0))),
		creditDragPerMonth: Math.max(0, Math.min(50, Number(effectsRaw.creditDragPerMonth || 0))),
		jobSearchBlocked: Boolean(effectsRaw.jobSearchBlocked),
	}

	const totalMonths = Math.max(1, Math.min(36, Math.floor(Number(raw.totalMonths || raw.monthsRemaining || 1))))
	const monthsRemaining = Math.max(0, Math.min(totalMonths, Math.floor(Number(raw.monthsRemaining || totalMonths))))

	return {
		id,
		title,
		era: String(raw.era || 'Historical Event'),
		summary: String(raw.summary || ''),
		totalMonths,
		monthsRemaining,
		startedMonth: Math.max(1, Math.min(12, Number(raw.startedMonth || 1))),
		startedYear: Math.max(1, Number(raw.startedYear || 2026)),
		effects: { ...DEFAULT_HISTORICAL_EVENT_EFFECTS, ...effects },
	}
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
	'Security': 'Cybersecurity',
	'Animal Care': 'Veterinary Technician',
	'SEAL Training': 'Special Forces',
	'OSHA 10/30': 'OSHA 10/30 Safety Cards',
	'Master Electrician': 'Electrician',
	'Master HVAC': 'HVAC',
	'Plumbing': 'Plumbing Design',
	'Master Plumbing': 'Plumbing Design',
	'ASE Master Technician': 'Auto Service',
	'Cosmetology': 'Massage Therapist',
	'Medical Lab Technician': 'Medical Laboratory Scientist',
	'Nurse Practitioner': 'Registered Nurse',
	'Pharmacist License': 'Pharmacy Technician',
	'Medical License': 'Medical School',
	'Surgery Specialty': 'Surgery Certificate',
	'Dentist License': 'Dental Assistant',
	'Veterinarian License': 'Veterinary Technician',
	'Psychology License': 'Mental Health Counselor',
	'Software Architecture': 'Software Development',
	'Data Analysis': 'Google Data Analytics',
	'Machine Learning': 'Data Science',
	'AWS Cloud Practitioner': 'AWS Certified Cloud Practitioner',
	'AWS Solutions Architect': 'AWS Certified Solutions Architect',
	'UI/UX Design': 'Graphic Design',
	'Bookkeeping': 'Tax Preparation',
	'Investment Analysis': 'Financial Analysis',
	'Counselor License': 'Mental Health Counselor',
	'Social Work': 'Social Work Case Manager',
	'Law License': 'Paralegal',
	'Police Academy': 'Cybersecurity',
	'Investigative': 'Intelligence Analyst',
	'Correctional Officer': 'Cybersecurity',
	'Sales Management': 'Sales',
	'Adobe Creative Suite': 'Adobe Certified Professional',
	'Management Consulting': 'Project Management',
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

const REQUIREMENT_ALIASES: Record<string, string> = {}

function capacityForJob(job: Job, rankInTrack: number) {
	const baseByCategory: Record<string, number> = {
		Entry: 36,
		Skilled: 20,
		Military: 14,
		Pro: 8
	}
	const base = baseByCategory[job.cat || 'Pro'] || 24
	const drop = Math.min(30, rankInTrack * 6)
	const salaryPressure = Math.max(0, (Number(job.base || 0) - 5000) / 10000)
	const scarcityCut = Math.round(salaryPressure * 6)
	return Math.max(1, base - drop - scarcityCut)
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
		const salaryPressure = Math.max(0, Math.min(0.2, (Number(job.base || 0) - 4000) / 40000))
		const fillRate = Math.min(0.98, 0.78 + (seed % 15) / 100 + salaryPressure)
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

const WEALTH_NET_WORTH_REQUIREMENTS: Record<string, number> = {
	'Tech Startup Founder': 250000,
	Millionaire: 500000,
	Billionaire: 50000000,
}

function estimatePortfolioCostBasis(state: State) {
	const portfolio = Array.isArray(state?.portfolio) ? state.portfolio : []
	return portfolio.reduce((sum: number, holding: any) => {
		const shares = Number(holding?.shares || 0)
		const avgCost = Number(holding?.avgCost || 0)
		return sum + (shares * avgCost)
	}, 0)
}

function estimateVehicleAssets(state: State) {
	const garage = Array.isArray(state?.garage) ? state.garage : []
	return garage.reduce((sum: number, vehicle: any) => {
		const currentValue = Number(vehicle?.currentValue || 0)
		if (currentValue > 0) return sum + currentValue
		const purchasePrice = Number(vehicle?.purchasePrice || 0)
		return purchasePrice > 0 ? sum + purchasePrice * 0.7 : sum
	}, 0)
}

function estimateRealEstateEquity(state: State) {
	const properties = Array.isArray(state?.investmentProperties) ? state.investmentProperties : []
	return properties.reduce((sum: number, property: any) => {
		const value = Number(property?.propertyValue || 0)
		const loan = Number(property?.loanBalance || 0)
		return sum + Math.max(0, value - loan)
	}, 0)
}

function computeNetWorthForEligibility(state: State) {
	const checking = Number(state?.check || 0)
	const savings = Number(state?.savings || 0)
	const portfolio = estimatePortfolioCostBasis(state)
	const vehicles = estimateVehicleAssets(state)
	const realEstateEquity = estimateRealEstateEquity(state)
	const debt = Math.abs(Number(state?.debt || 0))
	return round2(checking + savings + portfolio + vehicles + realEstateEquity - debt)
}

function getJobOpenings(state: State, job: Job) {
	const slot = state.jobMarket?.[job.title]
	const economy = normalizeEconomyOverrides(state?.economyOverrides)
	const cityUserCounts = getUserCityCounts(state)
	const cityUsers = Math.max(1, Number(cityUserCounts[state?.city?.name || ''] || 1))

	const inferredCapacity = inferBaseCapacity(job)
	const baseCapacity = Math.max(
		1,
		Number(slot?.capacity || 0),
		Number(job?.capacity || 0),
		Number(inferredCapacity || 1),
	)
	const demandMultiplier = Math.max(0.35, Math.min(1.9,
		(1) // jobAvailability is always 100, so this is 1
		* (1 - economy.recessionSeverity * 0.004)
		* (1 - economy.inflationPressure * 0.0015)
	))
	const dynamicCapacity = Math.max(1, Math.round(baseCapacity * demandMultiplier))

	const storedCapacity = Math.max(1, Number(slot?.capacity || 0), dynamicCapacity)
	const storedOccupied = slot?.occupied ?? Math.floor(dynamicCapacity * 0.68)
	const occupiedRatio = storedCapacity > 0 ? storedOccupied / storedCapacity : 0.75
	const salaryPressure = Math.max(0, Math.min(0.2, (Number(job.base || 0) - 4000) / 40000))
	const monthlyPulseSeed = titleSeed(`${job.title}-${state.month}-${state.year}`)
	const monthlyPulse = ((monthlyPulseSeed % 9) - 4) / 100
	const cityCompetitionPressure = (() => {
		const extraUsers = Math.max(0, cityUsers - 1)
		if ((job.cat || 'Pro') === 'Entry') return Math.min(0.05, extraUsers * 0.01)
		return Math.min(0.28, 0.03 + extraUsers * 0.025)
	})()
	const macroPressure = Math.max(0, Math.min(0.35,
		economy.recessionSeverity * 0.003
		+ economy.inflationPressure * 0.0018
		// jobAvailability is always 100, so this term is always 0
		// - (economy.jobAvailability - 100) * 0.0015
	))
	const marketPressure = Math.max(0, Math.min(0.45, salaryPressure + monthlyPulse + cityCompetitionPressure + macroPressure))
	const pressuredRatio = Math.max(0.6, Math.min(0.98, occupiedRatio + marketPressure))
	const dynamicOccupied = Math.min(dynamicCapacity, Math.max(0, Math.round(dynamicCapacity * pressuredRatio)))

	return Math.max(0, dynamicCapacity - dynamicOccupied)
}

function getJobEligibility(state: State, job: Job) {
	const credentials = Array.isArray(state?.credentials) ? state.credentials : []
	const normalizedCredentials = new Set(credentials.map((value: any) => normalizeCredential(value)).filter(Boolean))
	const educationMet = !job.req || normalizedCredentials.has(normalizeCredential(job.req))
	const certificationMet = !job.certReq || normalizedCredentials.has(normalizeCredential(job.certReq))
	const transitMet = state.transit.level >= job.tReq
	const netWorth = computeNetWorthForEligibility(state)
	const wealthRequirement = Number(WEALTH_NET_WORTH_REQUIREMENTS[job.title] || 0)
	const wealthMet = wealthRequirement <= 0 || netWorth >= wealthRequirement
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
		canApply: educationMet && certificationMet && transitMet && experienceMet && capacityMet && wealthMet,
		educationMet,
		certificationMet,
		transitMet,
		experienceMet,
		wealthMet,
		wealthRequirement,
		netWorth,
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

function roundShareQuantity(value: number) {
	return Math.round(value * 1000) / 1000
}

function formatShareQuantity(value: number) {
	return roundShareQuantity(value).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
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

function appendMarketPriceHistory(history: any, prices: any, month: number, year: number, maxPoints = 24) {
	const normalizedPrices = normalizeMarketPrices(prices)
	const normalizedMonth = Math.max(1, Math.min(12, Math.floor(Number(month || 1))))
	const normalizedYear = Math.max(1, Math.floor(Number(year || 2026)))
	const list = Array.isArray(history)
		? history.filter((entry: any) => entry && typeof entry === 'object').map((entry: any) => ({
			month: Math.max(1, Math.min(12, Math.floor(Number(entry.month || normalizedMonth)))),
			year: Math.max(1, Math.floor(Number(entry.year || normalizedYear))),
			prices: normalizeMarketPrices(entry.prices),
		}))
		: []

	const last = list[list.length - 1]
	if (last && Number(last.month) === normalizedMonth && Number(last.year) === normalizedYear) {
		list[list.length - 1] = { month: normalizedMonth, year: normalizedYear, prices: normalizedPrices }
	} else {
		list.push({ month: normalizedMonth, year: normalizedYear, prices: normalizedPrices })
	}

	return list.slice(Math.max(0, list.length - maxPoints))
}

function normalizeMarketPriceHistory(history: any, fallbackPrices: any, fallbackMonth: number, fallbackYear: number) {
	const seeded = appendMarketPriceHistory(history, fallbackPrices, fallbackMonth, fallbackYear)
	return seeded.length ? seeded : appendMarketPriceHistory([], fallbackPrices, fallbackMonth, fallbackYear)
}

function cityRealEstateTier(city: any) {
	const priceFactor = Number(city?.p || 1)
	if (priceFactor >= 1.3) return 'highCost'
	if (priceFactor <= 0.95) return 'growth'
	return 'balanced'
}

function cityPressureMultiplier(registeredUsers: number, city: any) {
	const users = Math.max(1, Number(registeredUsers || 1))
	const demandBase = 1 + Math.min(0.45, (users - 1) * 0.07)
	const cityAmplifier = 0.9 + (Number(city?.p || 1) - 1) * 0.6
	return round2(Math.max(0.75, Math.min(1.9, demandBase * cityAmplifier)))
}

const SHARED_REAL_ESTATE_MARKET_KEY = 'life-sim:shared-real-estate-market:v1'
const SHARED_REAL_ESTATE_MARKET_META_KEY = 'life-sim:shared-real-estate-market-meta:v1'

function initialListingsForCity(userCount: number) {
	const users = Math.max(0, Number(userCount || 0))
	if (users <= 0) return 0
	return 10 + Math.max(0, users - 1) * 2
}

function buildRealEstateListing(city: any, template: any, sequence: number, pressure: number, customId?: string) {
	const seed = hashString(`${city.name}-${template.id}-${sequence}`)
	const rnd = mulberry32(seed)
	const quality = 0.86 + rnd() * 0.32
	const dom = Math.max(0, Math.floor(rnd() * 7))
	const amenities = [...template.amenityOptions].sort(() => rnd() - 0.5).slice(0, Math.max(1, Math.min(3, Math.floor(rnd() * 4))))
	const askingPrice = round2(template.basePrice * Number(city.p || 1) * quality * (0.93 + (pressure - 1) * 0.35))
	const askingRentPerUnit = round2(template.baseRentPerUnit * Number(city.r || 1) * quality * (0.95 + (pressure - 1) * 0.25))
	return {
		id: customId || `re-${city.name}-${template.id}-${sequence}-${Date.now()}`,
		cityName: city.name,
		templateId: template.id,
		templateName: template.name,
		assetClass: template.assetClass,
		incomeLabel: template.incomeLabel,
		units: template.units,
		askingPrice,
		askingRentPerUnit,
		amenities,
		dom,
		condition: Math.round(65 + rnd() * 30),
		ownershipCount: 0,
		foreclosure: false,
		listedByUser: null
	}
}

function readSharedRealEstateMeta() {
	try {
		const raw = localStorage.getItem(SHARED_REAL_ESTATE_MARKET_META_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		return parsed && typeof parsed === 'object' ? parsed : null
	} catch {
		return null
	}
}

function readSharedRealEstateMarket() {
	try {
		const raw = localStorage.getItem(SHARED_REAL_ESTATE_MARKET_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		return parsed && typeof parsed === 'object' ? parsed : null
	} catch {
		return null
	}
}

function writeSharedRealEstateMeta(meta: any) {
	try {
		localStorage.setItem(SHARED_REAL_ESTATE_MARKET_META_KEY, JSON.stringify(meta))
		return true
	} catch {
		return false
	}
}

function writeSharedRealEstateMarket(market: Record<string, any[]>) {
	try {
		localStorage.setItem(SHARED_REAL_ESTATE_MARKET_KEY, JSON.stringify(market))
		return true
	} catch {
		return false
	}
}

function getUserCityCounts(liveSnapshot?: any) {
	const userCityMap = new Map<string, string>()
	for (const snapshot of cachedUserSnapshots) {
		const username = String(snapshot?.username || snapshot?.currentUser || '').trim()
		const cityName = snapshot?.city?.name
		if (username && cityName) userCityMap.set(username, cityName)
	}
	if (liveSnapshot?.currentUser && liveSnapshot?.city?.name) {
		userCityMap.set(String(liveSnapshot.currentUser), String(liveSnapshot.city.name))
	}
	const counts: Record<string, number> = {}
	for (const cityName of userCityMap.values()) {
		counts[cityName] = (counts[cityName] || 0) + 1
	}
	return counts
}

function defaultRealEstateMeta() {
	const seededUsersByCity: Record<string, number> = {}
	const pendingListingTimersByCity: Record<string, number[]> = {}
	const nextSequenceByCity: Record<string, number> = {}
	for (const city of cityData) {
		seededUsersByCity[city.name] = 0
		pendingListingTimersByCity[city.name] = []
		nextSequenceByCity[city.name] = 0
	}
	return { seededUsersByCity, pendingListingTimersByCity, nextSequenceByCity }
}

function initializeRealEstateMarket(liveSnapshot?: any) {
	const market: Record<string, any[]> = {}
	const counts = getUserCityCounts(liveSnapshot)
	const meta = defaultRealEstateMeta()
	const users = getRegisteredUserCount()
	for (const city of cityData) {
		const listings: any[] = []
		const cityUserCount = Number(counts[city.name] || 0)
		const initialCount = initialListingsForCity(cityUserCount)
		const pressure = cityPressureMultiplier(users, city)
		for (let i = 0; i < initialCount; i++) {
			const template = realEstateTemplates[i % realEstateTemplates.length]
			listings.push(buildRealEstateListing(city, template, i, pressure, `re-${city.name}-${template.id}-${i}`))
		}
		meta.seededUsersByCity[city.name] = cityUserCount
		meta.nextSequenceByCity[city.name] = initialCount
		market[city.name] = listings.sort((a, b) => a.askingPrice - b.askingPrice)
	}
	return { market, meta }
}

function syncSharedRealEstateMarket(liveSnapshot?: any, advanceOneMonth = false) {
	let market = readSharedRealEstateMarket()
	let meta = readSharedRealEstateMeta()
	if (!market || !meta) {
		const initialized = initializeRealEstateMarket(liveSnapshot)
		market = initialized.market
		meta = initialized.meta
	}

	market = { ...(market || {}) }
	meta = {
		...defaultRealEstateMeta(),
		...(meta || {}),
		seededUsersByCity: { ...defaultRealEstateMeta().seededUsersByCity, ...(meta?.seededUsersByCity || {}) },
		pendingListingTimersByCity: { ...defaultRealEstateMeta().pendingListingTimersByCity, ...(meta?.pendingListingTimersByCity || {}) },
		nextSequenceByCity: { ...defaultRealEstateMeta().nextSequenceByCity, ...(meta?.nextSequenceByCity || {}) }
	}

	const cityUserCounts = getUserCityCounts(liveSnapshot)
	const users = getRegisteredUserCount()
	for (const city of cityData) {
		const cityName = city.name
		const currentUsers = Number(cityUserCounts[cityName] || 0)
		const seededUsers = Number(meta.seededUsersByCity?.[cityName] || 0)
		const pressure = cityPressureMultiplier(users, city)
		const existing = Array.isArray(market[cityName]) ? [...market[cityName]] : []

		let additions = 0
		if (seededUsers === 0 && currentUsers > 0 && existing.length === 0) {
			additions = initialListingsForCity(currentUsers)
		} else if (currentUsers > seededUsers) {
			additions = (currentUsers - seededUsers) * 2
		}

		let nextSequence = Number(meta.nextSequenceByCity?.[cityName] || existing.length)
		for (let i = 0; i < additions; i++) {
			const template = realEstateTemplates[nextSequence % realEstateTemplates.length]
			existing.push(buildRealEstateListing(city, template, nextSequence, pressure, `re-${cityName}-${template.id}-${nextSequence}-${Date.now()}-${i}`))
			nextSequence += 1
		}

		if (advanceOneMonth) {
			const timers = Array.isArray(meta.pendingListingTimersByCity?.[cityName]) ? [...meta.pendingListingTimersByCity[cityName]] : []
			const maturedCount = timers.filter((months: number) => Number(months || 0) <= 1).length
			meta.pendingListingTimersByCity[cityName] = timers
				.map((months: number) => Math.max(0, Number(months || 0) - 1))
				.filter((months: number) => months > 0)

			for (let i = 0; i < maturedCount; i++) {
				const template = realEstateTemplates[nextSequence % realEstateTemplates.length]
				existing.push(buildRealEstateListing(city, template, nextSequence, pressure, `re-${cityName}-${template.id}-${nextSequence}-${Date.now()}-restock-${i}`))
				nextSequence += 1
			}
		}

		meta.seededUsersByCity[cityName] = Math.max(seededUsers, currentUsers)
		meta.nextSequenceByCity[cityName] = nextSequence
		market[cityName] = existing.sort((a: any, b: any) => Number(a.askingPrice || 0) - Number(b.askingPrice || 0))
	}

	writeSharedRealEstateMarket(market)
	writeSharedRealEstateMeta(meta)
	return { market, meta }
}

function getSharedRealEstateMarket(liveSnapshot?: any) {
	return syncSharedRealEstateMarket(liveSnapshot, false).market
}

function realEstateAmenityScore(amenities: string[]) {
	return (Array.isArray(amenities) ? amenities : []).reduce((sum, a) => {
		const impact = amenityImpact[a]
		return sum + Number(impact?.occupancyBoost || 0)
	}, 0)
}

function realEstateAmenityRentBoostRate(amenities: string[]) {
	return (Array.isArray(amenities) ? amenities : []).reduce((sum, a) => {
		const impact = amenityImpact[a]
		return sum + Number(impact?.rentBoost || 0)
	}, 0)
}

function realEstateAmenityUpkeepRate(amenities: string[]) {
	return (Array.isArray(amenities) ? amenities : []).reduce((sum, a) => {
		const impact = amenityImpact[a]
		return sum + Number(impact?.upkeepRate || 0)
	}, 0)
}

function realEstateEquityValue(snapshot: any) {
	const properties = Array.isArray(snapshot?.investmentProperties) ? snapshot.investmentProperties : []
	return round2(properties.reduce((sum: number, p: any) => {
		const value = Number(p?.propertyValue || 0)
		const loan = Number(p?.loanBalance || 0)
		return sum + Math.max(0, value - loan)
	}, 0))
}

function normalizeRealEstateState(data: any) {
	const shared = syncSharedRealEstateMarket(data, false)
	const market = shared.market
	const fallbackMarket = market
	const normalizedMarket: Record<string, any[]> = {}
	for (const city of cityData) {
		const key = city.name
		const listings = Array.isArray(market[key]) ? market[key] : fallbackMarket[key]
		normalizedMarket[key] = listings.map((l: any, idx: number) => ({
			id: l?.id || `re-${key}-${idx}`,
			cityName: l?.cityName || key,
			templateId: l?.templateId || realEstateTemplates[0].id,
			templateName: l?.templateName || realEstateTemplates[0].name,
			assetClass: l?.assetClass || (realEstateTemplates.find((t) => t.id === l?.templateId)?.assetClass || 'Residential'),
			incomeLabel: l?.incomeLabel || (realEstateTemplates.find((t) => t.id === l?.templateId)?.incomeLabel || 'Monthly Rent'),
			units: Math.max(1, Number(l?.units || 1)),
			askingPrice: Math.max(50000, Number(l?.askingPrice || 250000)),
			askingRentPerUnit: Math.max(400, Number(l?.askingRentPerUnit || 1500)),
			amenities: Array.isArray(l?.amenities) ? l.amenities : [],
			dom: Math.max(0, Math.floor(Number(l?.dom || 0))),
			condition: Math.max(20, Math.min(100, Math.round(Number(l?.condition || 75)))),
			ownershipCount: Math.max(0, Math.floor(Number(l?.ownershipCount || 0))),
			foreclosure: !!l?.foreclosure,
			listedByUser: l?.listedByUser || null
		}))
	}
	writeSharedRealEstateMarket(normalizedMarket)
	writeSharedRealEstateMeta(shared.meta)

	return {
		realEstateMarket: normalizedMarket,
		realEstateMarketMeta: shared.meta,
		investmentProperties: Array.isArray(data?.investmentProperties) ? data.investmentProperties.map((p: any) => ({
			...p,
			assetClass: p?.assetClass || (realEstateTemplates.find((t) => t.id === p?.templateId)?.assetClass || 'Residential'),
			incomeLabel: p?.incomeLabel || (realEstateTemplates.find((t) => t.id === p?.templateId)?.incomeLabel || 'Monthly Rent'),
			ownershipCount: Math.max(0, Math.floor(Number(p?.ownershipCount || 0))),
			mortgageTermMonths: Number(p?.mortgageTermMonths || 0),
			purchaseMode: p?.purchaseMode || (Number(p?.loanBalance || 0) > 0 ? 'mortgage' : 'cash')
		})) : [],
		pendingRealEstateDeals: Array.isArray(data?.pendingRealEstateDeals) ? data.pendingRealEstateDeals : [],
		realEstateLastMonthIncome: Number(data?.realEstateLastMonthIncome || 0),
		realEstateLastMonthExpenses: Number(data?.realEstateLastMonthExpenses || 0),
		realEstateLastMonthPropertyBreakdown: Array.isArray(data?.realEstateLastMonthPropertyBreakdown)
			? data.realEstateLastMonthPropertyBreakdown.map((entry: any) => ({
				propertyId: String(entry?.propertyId || ''),
				propertyName: String(entry?.propertyName || 'Property'),
				cityName: String(entry?.cityName || ''),
				grossIncome: Number(entry?.grossIncome || 0),
				operatingCosts: Number(entry?.operatingCosts || 0),
				debtService: Number(entry?.debtService || 0),
				netCashflow: Number(entry?.netCashflow || 0)
			}))
			: []
	}
}

function advanceMarketPrices(currentPrices: any, year: number, month: number, overrides?: any) {
	const base = normalizeMarketPrices(currentPrices)
	const economy = normalizeEconomyOverrides(overrides)
	const next: Record<string, number> = {}
	const driftPenalty = (economy.recessionSeverity * 0.0014) + (economy.inflationPressure * 0.0008)
	const volatilityMultiplier = Math.max(0.5, (economy.marketVolatility / 100) * (1 + economy.recessionSeverity * 0.006))
	const shock = Number(economy.nextMonthStockShock || 0)
	for (const asset of stockMarketAssets) {
		const seed = hashString(`${asset.ticker}-${year}-${month}`)
		const noise = (mulberry32(seed)() - 0.5) * 2
		const monthlyMove = (asset.drift - driftPenalty) + (noise * asset.volatility * volatilityMultiplier) + shock
		const boundedMove = Math.max(-0.45, Math.min(0.45, monthlyMove))
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
	const netWorth = round2(
		Number(snapshot.check || 0)
		+ Number(snapshot.savings || 0)
		+ marketValue
		+ realEstateEquityValue(snapshot)
		- Number(snapshot.debt || 0)
	)
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
		if (marketPrice <= 0 || allocation <= 0 || newCheck <= 0) continue
		const price = executionPriceWithSlippage(marketPrice, `${ticker}-${month}-${year}-${profile.id}-auto`)
		if (price <= 0) continue

		const budget = Math.min(allocation, newCheck)
		const shares = roundShareQuantity(budget / price)
		if (shares <= 0) continue

		const cost = round2(shares * price)
		if (cost > newCheck || cost <= 0) continue

		const idx = nextPortfolio.findIndex((h: any) => h.ticker === ticker)
		if (idx >= 0) {
			const existing = nextPortfolio[idx]
			const existingShares = Number(existing.shares || 0)
			const existingAvg = Number(existing.avgCost || price)
			const totalShares = roundShareQuantity(existingShares + shares)
			const avgCost = totalShares > 0 ? round2(((existingShares * existingAvg) + cost) / totalShares) : round2(price)
			nextPortfolio[idx] = { ...existing, shares: totalShares, avgCost }
		} else {
			nextPortfolio.push({ ticker, shares, avgCost: round2(price) })
		}

		newCheck = round2(newCheck - cost)
		investedAmount = round2(investedAmount + cost)
		tradeSummary.push(`${formatShareQuantity(shares)} ${ticker} @ ${price.toFixed(2)}`)
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

function totalMonthlyIncomeForLuxuryPricing(snapshot: any) {
	const salaryIncome = Math.max(0, Number(snapshot?.job?.base || 0) * Number(snapshot?.city?.p || 1) * 0.8)
	const rentalIncome = Math.max(0, Number(snapshot?.realEstateLastMonthIncome || 0))
	return round2(salaryIncome + rentalIncome)
}

function calculateLuxuryServiceMonthlyPay(serviceId: string, netMonthlyIncome: number, options?: { propertyCount?: number }) {
	const income = Math.max(0, Number(netMonthlyIncome || 0))
	const propertyCount = Math.max(0, Math.floor(Number(options?.propertyCount || 0)))
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
	const baseline = round2(Math.min(rule.max, Math.max(rule.min, raw)))
	const propertySurcharge = serviceId === 'housekeeper' ? propertyCount * 450 : 0
	let adjusted = round2(baseline + propertySurcharge)
	if (income <= 0) return adjusted

	// Keep the current rule output as the minimum, but increase pricing again when the service becomes too cheap relative to income.
	if (adjusted / income < 0.15) {
		const targetPremium = (income * 0.15) - adjusted
		adjusted = round2(adjusted + (targetPremium * 0.28))
	}

	return adjusted
}

function totalLuxuryServiceDiscretionary(state: any) {
	const netMonthlyIncome = totalMonthlyIncomeForLuxuryPricing(state)
	const propertyCount = Array.isArray(state?.investmentProperties) ? state.investmentProperties.length : 0
	const services = state?.luxuryServices || {}
	return round2(Object.entries(services).reduce((sum, [serviceId, active]) => {
		if (!active) return sum
		return sum + calculateLuxuryServiceMonthlyPay(serviceId, netMonthlyIncome, { propertyCount })
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
	savings: 0,
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
	name: 'Player',
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
	jobUpgradeBoostMonths: 0,
	payRaiseBoostMonths: 0,
	credentialBoostMonths: 0,
	perfectChecksBoostMonths: 0,
	aiCoachSnapshot: null,
	aiCoachGeneratedMonth: 0,
	aiCoachGeneratedYear: 0,
	workPenaltyPercent: 0,
	celebration: null as 'pay-bump' | 'degree' | 'certification' | 'car-paid-off' | 'debt-paid-off' | 'promotion' | 'job-accepted' | 'achievement' | 'rainbow' | null,
	// Credit tracking
	paymentStreak: 0, // Consecutive on-time payments
	calculationStreak: 0, // Consecutive correct balance checks
	monthlyCheckSuccesses: 0,
	monthlyCheckFailures: 0,
	lifetimeCheckSuccesses: 0,
	lifetimeCheckFailures: 0,
	debtDelinquencyStreak: 0,
	creditAccountAgeMonths: 0,
	creditInquiryQueue: [] as number[],
	lastPaymentOnTime: true,
	skippedPaymentThisMonth: false,
	// Pay negotiation tracking
	lastNegotiationMonth: null as number | null,
	lastNegotiationYear: null as number | null,
	lastAutoBumpMonth: 2,
	lastAutoBumpYear: 2026,
	// Authentication / save
	currentUser: null as string | null,
	isAdmin: false,
	// Vehicle state - comprehensive ownership and financing tracking
	ownsVehicle: null as any, // primary vehicle (for UI/backcompat)
	garage: [] as any[], // array of vehicles owned/leased
	vehicleHistory: [] as any[], // Array of previously owned vehicles
	realEstateMarket: getSharedRealEstateMarket(),
	realEstateMarketMeta: readSharedRealEstateMeta() || defaultRealEstateMeta(),
	investmentProperties: [] as any[],
	pendingRealEstateDeals: [] as any[],
	realEstateLastMonthIncome: 0,
	realEstateLastMonthExpenses: 0,
	realEstateLastMonthPropertyBreakdown: [] as any[],
	// Stock market
	marketPrices: initializeMarketPrices(),
	marketPricesPrevious: initializeMarketPrices(),
	marketPriceHistory: appendMarketPriceHistory([], initializeMarketPrices(), 2, 2026),
	portfolio: [] as any[],
	learningLevel: 'adult',
	usePlainLanguage: false,
	marketLearningLevel: 'adult',
	marketUsePlainLanguage: false,
	economyOverrides: { ...DEFAULT_ECONOMY_OVERRIDES },
	economyOverrideMonthsRemaining: 0,
	historicalEconomicEvent: null as HistoricalEconomicEventState | null,
	historicalEventResetNextMonth: false,
	pendingAdminGifts: [] as any[],
	realEstateLearningLevel: 'adult',
	realEstateUsePlainLanguage: false,
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
	rewardCategoryQueue: [] as string[],
	lastAchievementCategory: null as string | null,
	unlockedThemes: ['default'],
	activeTheme: 'default',
	rewardHistory: [] as any[]
	,
	jobMigrationBanner: null as string | null
	,
	mathLabLastSolvedMonth: null as number | null,
	mathLabLastSolvedYear: null as number | null,
	mathLabStreak: 0,
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
	if (creditScore >= 800) return 0.05
	return ((creditScore - 300) / 550) * 0.05
}

// Pay negotiation modifier based on credit score, tenure, and job compatibility
// Returns object with modifier amount and breakdown
function calculatePayNegotiationModifier(
	creditScore: number,
	tenure: number,
	jobCompatibilityScore: number // 0-100 scale
): { modifier: number; creditContribution: number; tenureContribution: number; compatibilityContribution: number } {
	const normalizedCredit = Math.max(0, Math.min(1, (creditScore - 300) / 550))
	const normalizedTenure = Math.max(0, Math.min(1, tenure / 36))
	const normalizedCompatibility = Math.max(0, Math.min(1, jobCompatibilityScore / 100))

	// Credit can contribute up to 3.0% at an 850 score.
	const creditContribution = normalizedCredit * 3
	const tenureContribution = normalizedTenure * 0.9
	const compatibilityContribution = normalizedCompatibility * 0.9

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

function normalizeTitleTokens(value: string) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean)
}

function isJobCredentialCompatible(job: Job | null | undefined, credentials: string[]) {
	if (!job) return false
	const credentialSet = new Set(Array.isArray(credentials) ? credentials : [])
	const educationMet = !job.req || credentialSet.has(job.req)
	const certificateMet = !job.certReq || credentialSet.has(job.certReq)
	return educationMet && certificateMet
}

function isJobTransitCompatible(job: Job | null | undefined, transitLevel: number) {
	if (!job) return false
	return Number(transitLevel || 0) >= Number(job.tReq || 0)
}

function bestJobMatchForMigration(currentJob: any, credentials: string[], transitLevel: number) {
	const title = String(currentJob?.title || '')
	const currentBase = Number(currentJob?.base || 0)
	const currentTokens = new Set(normalizeTitleTokens(title))

	const scoreCandidate = (candidate: Job) => {
		const candidateTokens = normalizeTitleTokens(candidate.title)
		let overlap = 0
		for (const token of candidateTokens) {
			if (currentTokens.has(token)) overlap += 1
		}

		const titleScore = Math.min(24, overlap * 8)
		const payDelta = Math.abs(Number(candidate.base || 0) - currentBase)
		const payDistance = Math.max(1000, currentBase || 1000)
		const payScore = Math.round((1 - Math.min(1, payDelta / payDistance)) * 22)
		const categoryScore = (currentJob?.cat && candidate.cat === currentJob.cat ? 20 : 0)
			+ (currentJob?.subcat && candidate.subcat === currentJob.subcat ? 14 : 0)
		const transitScore = isJobTransitCompatible(candidate, transitLevel) ? 8 : -10
		const certEaseScore = candidate.certReq ? 0 : 4
		return titleScore + payScore + categoryScore + transitScore + certEaseScore
	}

	const credentialMatches = jobBoard.filter(job => isJobCredentialCompatible(job, credentials))
	const strictMatches = credentialMatches.filter(job => isJobTransitCompatible(job, transitLevel))
	const candidatePool = strictMatches.length > 0 ? strictMatches : credentialMatches

	if (candidatePool.length === 0) {
		return jobBoard.find(job => job.title === 'Odd Jobs') || jobBoard[0] || null
	}

	const ranked = [...candidatePool].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
	return ranked[0] || null
}

function normalizeLoadedUserState(data: any, fallbackState: any, currentUser: string) {
	const normalizedCredentials = Array.isArray(data?.credentials)
		? data.credentials
		: (Array.isArray(fallbackState?.credentials) ? fallbackState.credentials : [])
	const normalizedTransitLevel = Number(data?.transit?.level ?? fallbackState?.transit?.level ?? 1)
	const sourceJob = data?.job || fallbackState?.job || { title: 'Odd Jobs', base: 800, tReq: 1, odds: 1 }
	const canonicalCurrent = jobBoard.find((job: Job) => job.title === sourceJob?.title)
	const currentJobStillValid = isJobCredentialCompatible(canonicalCurrent, normalizedCredentials)

	let normalizedJob = sourceJob
	let migrationMessage: string | null = null
	if (!canonicalCurrent || !currentJobStillValid) {
		const migrated = bestJobMatchForMigration(sourceJob, normalizedCredentials, normalizedTransitLevel)
		if (migrated) {
			normalizedJob = {
				title: migrated.title,
				base: migrated.base,
				tReq: migrated.tReq,
				odds: migrated.odds,
				cat: migrated.cat,
				subcat: migrated.subcat,
			}
			if (String(sourceJob?.title || '') !== migrated.title) {
				migrationMessage = `Career migration: ${sourceJob?.title || 'Unknown Role'} updated to ${migrated.title} to match the simplified market and your current credentials.`
			}
		}
	}

	const fallbackPendingJob = data?.pendingJob || null
	const canonicalPending = fallbackPendingJob?.title
		? jobBoard.find((job: Job) => job.title === fallbackPendingJob.title)
		: null
	const normalizedPendingJob = (fallbackPendingJob && !canonicalPending)
		? bestJobMatchForMigration(fallbackPendingJob, normalizedCredentials, normalizedTransitLevel)
		: fallbackPendingJob

	const baseLogs = Array.isArray(data?.logs) ? data.logs : (Array.isArray(fallbackState?.logs) ? fallbackState.logs : [])
	const migrationLogs = migrationMessage
		? [...baseLogs, { date: `${Number(data?.month || fallbackState?.month || 1)}/${Number(data?.year || fallbackState?.year || 2026)}`, msg: migrationMessage }]
		: baseLogs

	const fallbackBudgets = comfortableEntertainmentDefaults(data.job || fallbackState.job, data.city || fallbackState.city)
	const marketPrices = normalizeMarketPrices(data.marketPrices)
	const currentMonth = Number(data?.month ?? fallbackState?.month ?? 1)
	const currentYear = Number(data?.year ?? fallbackState?.year ?? 2026)
	const marketPriceHistory = normalizeMarketPriceHistory(data.marketPriceHistory, marketPrices, currentMonth, currentYear)
	const realEstateState = normalizeRealEstateState(data)
	const normalizedName = String(
		data.username
		?? currentUser
		?? fallbackState?.username
		?? fallbackState?.currentUser
		?? 'Player'
	)
	return {
		...data,
		...realEstateState,
		check: Number(data?.check ?? fallbackState?.check ?? 1200),
		savings: Number(data?.savings ?? fallbackState?.savings ?? 0),
		debt: Math.max(0, Number(data?.debt ?? fallbackState?.debt ?? 0)),
		credit: Math.max(300, Math.min(850, Number(data?.credit ?? fallbackState?.credit ?? 600))),
		month: Math.max(1, Math.min(12, Number(data?.month ?? fallbackState?.month ?? 2))),
		year: Math.max(1, Number(data?.year ?? fallbackState?.year ?? 2026)),
		tenure: Math.max(0, Number(data?.tenure ?? fallbackState?.tenure ?? 0)),
		jobStartMonth: Math.max(1, Math.min(12, Number(data?.jobStartMonth ?? fallbackState?.jobStartMonth ?? 2))),
		jobStartYear: Math.max(1, Number(data?.jobStartYear ?? fallbackState?.jobStartYear ?? 2026)),
		job: normalizedJob,
		pendingJob: normalizedPendingJob,
		logs: migrationLogs,
		jobMigrationBanner: migrationMessage,
		currentUser,
		name: normalizedName,
		isAdmin: Boolean(data.isAdmin),
		entertainmentSpending: data.entertainmentSpending ?? fallbackBudgets.entertainmentSpending,
		subscriptionEntertainmentSpending: data.subscriptionEntertainmentSpending ?? fallbackBudgets.subscriptionEntertainmentSpending,
		subscriptionStreakMonths: data.subscriptionStreakMonths ?? 0,
		subscriptionBadges: data.subscriptionBadges ?? [],
		entertainmentTicketStubs: data.entertainmentTicketStubs ?? [],
		happiness: data.happiness ?? 70,
		jobUpgradeBoostMonths: Math.max(0, Number(data.jobUpgradeBoostMonths ?? 0)),
		payRaiseBoostMonths: Math.max(0, Number(data.payRaiseBoostMonths ?? 0)),
		credentialBoostMonths: Math.max(0, Number(data.credentialBoostMonths ?? 0)),
		perfectChecksBoostMonths: Math.max(0, Number(data.perfectChecksBoostMonths ?? 0)),
		aiCoachSnapshot: data.aiCoachSnapshot && typeof data.aiCoachSnapshot === 'object' ? data.aiCoachSnapshot : null,
		aiCoachGeneratedMonth: Number(data.aiCoachGeneratedMonth ?? 0),
		aiCoachGeneratedYear: Number(data.aiCoachGeneratedYear ?? 0),
		workPenaltyPercent: data.workPenaltyPercent ?? 0,
		marketPrices,
		marketPricesPrevious: normalizeMarketPrices(data.marketPricesPrevious || marketPrices),
		marketPriceHistory,
		portfolio: Array.isArray(data.portfolio) ? data.portfolio : [],
		learningLevel: data.learningLevel ?? data.marketLearningLevel ?? data.realEstateLearningLevel ?? 'adult',
		usePlainLanguage: data.usePlainLanguage ?? data.marketUsePlainLanguage ?? data.realEstateUsePlainLanguage ?? false,
		marketLearningLevel: data.learningLevel ?? data.marketLearningLevel ?? data.realEstateLearningLevel ?? 'adult',
		marketUsePlainLanguage: data.usePlainLanguage ?? data.marketUsePlainLanguage ?? data.realEstateUsePlainLanguage ?? false,
		realEstateLearningLevel: data.learningLevel ?? data.marketLearningLevel ?? data.realEstateLearningLevel ?? 'adult',
		realEstateUsePlainLanguage: data.usePlainLanguage ?? data.marketUsePlainLanguage ?? data.realEstateUsePlainLanguage ?? false,
		economyOverrides: normalizeEconomyOverrides(data.economyOverrides),
		economyOverrideMonthsRemaining: normalizeEconomyApplyMonths(data.economyOverrideMonthsRemaining),
		historicalEconomicEvent: normalizeHistoricalEconomicEvent(data.historicalEconomicEvent),
		historicalEventResetNextMonth: Boolean(data.historicalEventResetNextMonth),
		pendingAdminGifts: Array.isArray(data.pendingAdminGifts) ? data.pendingAdminGifts : [],
		autoInvest: normalizeAutoInvestConfig(data.autoInvest),
		stockInvestedThisMonth: Number(data.stockInvestedThisMonth ?? 0),
		stockInvestedLastMonth: Number(data.stockInvestedLastMonth ?? 0),
		totalGasPaid: Number(data.totalGasPaid ?? 0),
		totalUtilitiesPaid: Number(data.totalUtilitiesPaid ?? 0),
		maxMonthlyLuxuryEventSpend: Number(data.maxMonthlyLuxuryEventSpend ?? 0),
		achievementsUnlocked: Array.isArray(data.achievementsUnlocked) ? data.achievementsUnlocked : [],
		achievementHistory: Array.isArray(data.achievementHistory) ? data.achievementHistory : [],
		rewardTokens: Number(data.rewardTokens ?? 0),
		rewardCategoryQueue: Array.isArray(data.rewardCategoryQueue) ? data.rewardCategoryQueue : [],
		lastAchievementCategory: data.lastAchievementCategory ?? null,
		unlockedThemes: Array.isArray(data.unlockedThemes) && data.unlockedThemes.length ? Array.from(new Set(['default', ...data.unlockedThemes])) : ['default'],
		activeTheme: data.activeTheme ?? 'default',
		rewardHistory: Array.isArray(data.rewardHistory) ? data.rewardHistory : [],
		debtDelinquencyStreak: Number(data.debtDelinquencyStreak ?? 0),
		creditAccountAgeMonths: Number(data.creditAccountAgeMonths ?? 0),
		mathLabLastSolvedMonth: data.mathLabLastSolvedMonth ?? null,
		mathLabLastSolvedYear: data.mathLabLastSolvedYear ?? null,
		mathLabStreak: Number(data.mathLabStreak ?? 0),
		creditInquiryQueue: Array.isArray(data.creditInquiryQueue)
			? data.creditInquiryQueue.map((m: any) => Math.max(0, Math.floor(Number(m || 0)))).filter((m: number) => m > 0)
			: [],
	}
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
		case 'INIT_LEDGER': {
			if (!action.preserveProgress) {
				return { ...state, ledger: action.payload }
			}
			const doneById: Record<number, boolean> = {}
			for (const row of state.ledger) {
				if (row?.done) doneById[row.id] = true
			}
			const mergedLedger = (action.payload as any[]).map((row: any) =>
				doneById[row.id] ? { ...row, done: true } : row
			)
			return { ...state, ledger: mergedLedger }
		}
		case 'CHECK_ROW': {
			const { id, done, newCheck } = action.payload
			const targetRow = state.ledger.find((tx: any) => tx.id === id)
			const wasDone = !!targetRow?.done
			const ledger = state.ledger.map((tx: any) => (tx.id === id ? { ...tx, done } : tx))
			const lastLedgerRow = state.ledger[state.ledger.length - 1]
			const isLastRow = lastLedgerRow && lastLedgerRow.id === id
			let resultingCheck = (isLastRow && newCheck !== undefined) ? newCheck : state.check
			let newDebt = state.debt
			let calculationStreak = Number(state.calculationStreak || 0)
			let monthlyCheckSuccesses = Number(state.monthlyCheckSuccesses || 0)
			let monthlyCheckFailures = Number(state.monthlyCheckFailures || 0)
			let lifetimeCheckSuccesses = Number(state.lifetimeCheckSuccesses || 0)
			let lifetimeCheckFailures = Number(state.lifetimeCheckFailures || 0)
			let logs = [...state.logs]

			if (done && !wasDone) {
				calculationStreak += 1
				monthlyCheckSuccesses += 1
				lifetimeCheckSuccesses += 1
			}

			if (!done) {
				calculationStreak = 0
				monthlyCheckFailures += 1
				lifetimeCheckFailures += 1
			}

			if (newCheck !== undefined && newCheck < 0) {
				const loanAmt = fix(Math.abs(newCheck))
				newDebt = fix(state.debt + loanAmt)
				logs.push({ date: `${state.month}/${state.year}`, msg: `Auto-loan taken: $${loanAmt.toFixed(2)} to cover negative checking` })
				resultingCheck = 0
			}
			return {
				...state,
				ledger,
				check: resultingCheck,
				debt: newDebt,
				calculationStreak,
				monthlyCheckSuccesses,
				monthlyCheckFailures,
				lifetimeCheckSuccesses,
				lifetimeCheckFailures,
				paymentStreak: state.paymentStreak,
				logs
			}
		}
		case 'PROCESS_MONTH': {
			const { paySave = 0, payDebt = 0, skippedPayment = false } = action.payload
			const requestedDebtPayment = Math.max(0, Number(payDebt || 0))
			const appliedDebtPayment = Math.min(Math.max(0, Number(state.debt || 0)), requestedDebtPayment)
			const nextMonth = state.month === 12 ? 1 : state.month + 1
			const nextYear = state.month === 12 ? state.year + 1 : state.year
			let economyOverrides = normalizeEconomyOverrides(state.economyOverrides)
			const economyOverrideMonthsRemaining = normalizeEconomyApplyMonths(state.economyOverrideMonthsRemaining)
			const activeHistoricalEvent = normalizeHistoricalEconomicEvent(state.historicalEconomicEvent)
			const shouldResetHistoricalEventNextMonth = Boolean(state.historicalEventResetNextMonth)
			const effectiveHistoricalEvent = shouldResetHistoricalEventNextMonth ? null : activeHistoricalEvent

			// Calculate vehicle costs before checking calculation
			let vehicleCosts = 0
			const chauffeurHired = !!state.luxuryServices?.chauffer
			let ownsVehicle = state.ownsVehicle
			let vehicleSaleProceeds = 0
			let logs = [...state.logs]
			const garage = state.garage || []
			let updatedGarage = garage.map((g: any) => ({ ...g }))
			const sharedRealEstate = syncSharedRealEstateMarket(state, true)
			let realEstateMarket = sharedRealEstate.market
			let realEstateMarketMeta = sharedRealEstate.meta
			let investmentProperties = Array.isArray(state.investmentProperties) ? state.investmentProperties.map((p: any) => ({ ...p })) : []
			let pendingRealEstateDeals = Array.isArray(state.pendingRealEstateDeals) ? state.pendingRealEstateDeals.map((d: any) => ({ ...d })) : []

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

			// Ledger rows already include vehicle-related monthly costs. Subtract only explicit settlement transfers here.
			const check = fix(state.check - (paySave + payDebt))
			const monthlyGasPaid = sumLedgerAmounts(state.ledger, (desc) => desc.includes('Gas'))
			const monthlyUtilitiesPaid = sumLedgerAmounts(state.ledger, (desc) => desc.includes('Utilities & Phone/Internet'))
			const monthlyLuxuryEventSpend = sumLedgerAmounts(state.ledger, (desc) => desc === 'Entertainment' || desc === 'Subscription Entertainment')
			const totalGasPaid = round2(Number(state.totalGasPaid || 0) + monthlyGasPaid)
			const totalUtilitiesPaid = round2(Number(state.totalUtilitiesPaid || 0) + monthlyUtilitiesPaid)
			const maxMonthlyLuxuryEventSpend = Math.max(Number(state.maxMonthlyLuxuryEventSpend || 0), Number(monthlyLuxuryEventSpend || 0))

			let resultingCheck = check
			const pendingAdminGifts = Array.isArray(state.pendingAdminGifts) ? state.pendingAdminGifts : []
			if (pendingAdminGifts.length > 0) {
				for (const gift of pendingAdminGifts) {
					const amount = round2(Math.max(0, Number(gift?.amount || 0)))
					if (amount <= 0) continue
					const sender = String(gift?.fromAdminUsername || 'Admin')
					const msg = String(gift?.message || '').trim()
					resultingCheck = round2(resultingCheck + amount)
					logs.push({
						date: `${nextMonth}/${nextYear}`,
						msg: `🎁 Admin gift received from ${sender}: +$${amount.toFixed(2)}${msg ? ` (${msg})` : ''}`,
					})
				}
			}

			const eduProgress = { ...state.eduProgress }
			let activeEdu = state.activeEdu
			const credentials = [...state.credentials]
			const credentialHistory = [...state.credentialHistory]
			const eventHistory = [...(state.eventHistory || [])]
			const careerHistory = [...state.careerHistory]
			const nextJobMarket = { ...(state.jobMarket || {}) }
			let job = state.job
			let tenure = state.tenure
			let jobUpgradeBoostMonths = Math.max(0, Number(state.jobUpgradeBoostMonths || 0))
			let payRaiseBoostMonths = Math.max(0, Number(state.payRaiseBoostMonths || 0))
			let credentialBoostMonths = Math.max(0, Number(state.credentialBoostMonths || 0))
			let perfectChecksBoostMonths = Math.max(0, Number(state.perfectChecksBoostMonths || 0))
			let lastNegotiationMonth = state.lastNegotiationMonth
			let lastNegotiationYear = state.lastNegotiationYear
			let celebration = null as 'degree' | 'certification' | 'job-accepted' | 'promotion' | 'debt-paid-off' | 'car-paid-off' | 'pay-bump' | 'achievement' | 'rainbow' | null
			
			// Credit tracking
			let credit = state.credit
			let paymentStreak = state.paymentStreak
			const monthlyCheckSuccesses = Number(state.monthlyCheckSuccesses || 0)
			const monthlyCheckFailures = Number(state.monthlyCheckFailures || 0)
			let debtDelinquencyStreak = Number(state.debtDelinquencyStreak || 0)
			let creditAccountAgeMonths = Number(state.creditAccountAgeMonths || 0)
			let creditInquiryQueue = Array.isArray(state.creditInquiryQueue)
				? state.creditInquiryQueue.map((m: any) => Math.max(0, Math.floor(Number(m || 0)))).filter((m: number) => m > 0)
				: []

			if (state.activeEdu) {
				eduProgress[state.activeEdu] = (eduProgress[state.activeEdu] || 0) + 1
				const course = academyCourses.find(c => c.n === state.activeEdu)
				const needed = course ? course.m : Infinity
				if (eduProgress[state.activeEdu] >= needed) {
					const monthsStudied = eduProgress[state.activeEdu]
					credentials.push(state.activeEdu)
					credentialHistory.push({ name: state.activeEdu, month: nextMonth, year: nextYear, months: monthsStudied })
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Graduated: ${state.activeEdu} (${monthsStudied} mo)` })
					credentialBoostMonths = Math.max(credentialBoostMonths, 3)
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
			let newDebt = fix(state.debt - appliedDebtPayment + (applyRelocation ? relocationCostToApply + transportCostToApply : 0))
			if (requestedDebtPayment > appliedDebtPayment + 0.009) {
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: `Debt payment capped at remaining balance ($${appliedDebtPayment.toFixed(2)}).`
				})
			}

			// If the player's immediate payments push checking negative, convert shortfall into an auto-loan
			if (resultingCheck < 0) {
				const shortfall = fix(Math.abs(resultingCheck))
				newDebt = fix(newDebt + shortfall)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Auto-loan taken: $${shortfall.toFixed(2)} to cover monthly payments` })
				resultingCheck = 0
			}

			// Preserve pending jobs by default; cleared when applied.
			let pendingJobToApply = state.pendingJob

			// Legacy relocation plans may have queued Odd Jobs immediately. Defer until relocation month.
			const deferRelocationFallbackJob = !!(
				state.pendingJob
				&& state.pendingCity
				&& !applyRelocation
				&& state.pendingJob.title === 'Odd Jobs'
			)

			// If a job was accepted previously, apply it now at the start of the new month.
			if (state.pendingJob && !deferRelocationFallbackJob) {
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
				lastNegotiationMonth = null
				lastNegotiationYear = null
				// Trigger celebration for job acceptance/promotion
				celebration = isPromotion ? 'promotion' : 'job-accepted'
				if (isPromotion) {
					jobUpgradeBoostMonths = Math.max(jobUpgradeBoostMonths, 6)
				}
				pendingJobToApply = null
			} else {
				// no job change, increment tenure
				tenure = state.tenure + 1
			}

			// Apply relocation if scheduled for this upcoming month
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
			let saveBefore = state.savings + paySave
			if (newDebt > 0) {
				const dynamicAPR = calculateDynamicAPR(credit)
				const monthlyDebtInterest = fix(newDebt * (dynamicAPR / 12))
				newDebt = fix(newDebt + monthlyDebtInterest)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Loan interest charged (${(dynamicAPR * 100).toFixed(2)}% APR): $${monthlyDebtInterest.toFixed(2)}` })

				if (!skippedPayment && appliedDebtPayment > 0) {
					paymentStreak += 1
					debtDelinquencyStreak = 0
				} else {
					paymentStreak = 0
					debtDelinquencyStreak += 1
				}
			} else {
				debtDelinquencyStreak = 0
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

			if (effectiveHistoricalEvent && effectiveHistoricalEvent.monthsRemaining > 0) {
				const eventEffects = effectiveHistoricalEvent.effects || DEFAULT_HISTORICAL_EVENT_EFFECTS
				const oddJobsRole = jobBoard.find((j: Job) => j.title === 'Odd Jobs') || { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 }
				const eventSeedBase = `${state.currentUser || state.id || 'user'}-${nextYear}-${nextMonth}-${effectiveHistoricalEvent.id}`

				const layoffRoll = mulberry32(hashString(`${eventSeedBase}-layoff`))()
				if (eventEffects.jobLossChance > 0 && updatedJob.title !== 'Odd Jobs' && layoffRoll < eventEffects.jobLossChance) {
					careerHistory.push({
						title: updatedJob.title,
						startMonth: state.jobStartMonth,
						startYear: state.jobStartYear,
						endMonth: nextMonth,
						endYear: nextYear,
						months: tenure,
					})
					updatedJob = {
						title: oddJobsRole.title,
						base: Number(oddJobsRole.base || 600),
						tReq: Number(oddJobsRole.tReq || 1),
						odds: Number(oddJobsRole.odds || 1),
						cat: (oddJobsRole as any).cat,
						subcat: (oddJobsRole as any).subcat,
					}
					tenure = 0
					lastNegotiationMonth = null
					lastNegotiationYear = null
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🧭 ${effectiveHistoricalEvent.title}: layoff event forced a move to ${updatedJob.title}.` })
				} else {
					const downgradeRoll = mulberry32(hashString(`${eventSeedBase}-downgrade`))()
					if (eventEffects.forcedDowngradeChance > 0 && updatedJob.title !== 'Odd Jobs' && downgradeRoll < eventEffects.forcedDowngradeChance) {
						careerHistory.push({
							title: updatedJob.title,
							startMonth: state.jobStartMonth,
							startYear: state.jobStartYear,
							endMonth: nextMonth,
							endYear: nextYear,
							months: tenure,
						})
						updatedJob = {
							title: oddJobsRole.title,
							base: Number(oddJobsRole.base || 600),
							tReq: Number(oddJobsRole.tReq || 1),
							odds: Number(oddJobsRole.odds || 1),
							cat: (oddJobsRole as any).cat,
							subcat: (oddJobsRole as any).subcat,
						}
						tenure = 0
						lastNegotiationMonth = null
						lastNegotiationYear = null
						logs.push({ date: `${nextMonth}/${nextYear}`, msg: `📉 ${effectiveHistoricalEvent.title}: workforce contraction downgraded your role to ${updatedJob.title}.` })
					}
				}

				const payCutAmount = round2(Math.max(0, updatedJob.base * city.p * 0.8 * Number(eventEffects.payCutPercent || 0)))
				if (payCutAmount > 0) {
					resultingCheck = fix(resultingCheck - payCutAmount)
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `💼 ${effectiveHistoricalEvent.title}: paycheck compression -$${payCutAmount.toFixed(2)} this month.` })
				}

				const costShock = round2(Math.max(0, updatedJob.base * city.p * 0.8 * Number(eventEffects.essentialCostIncreasePercent || 0)))
				if (costShock > 0) {
					resultingCheck = fix(resultingCheck - costShock)
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🧾 ${effectiveHistoricalEvent.title}: essential cost surge -$${costShock.toFixed(2)} this month.` })
				}

				if (resultingCheck < 0) {
					const scenarioShortfall = fix(Math.abs(resultingCheck))
					newDebt = fix(newDebt + scenarioShortfall)
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `Auto-loan taken: $${scenarioShortfall.toFixed(2)} to cover historical scenario shortfall` })
					resultingCheck = 0
				}

				const forcedShock = Math.max(-0.7, Math.min(0.7, Number(eventEffects.monthlyStockShock || 0)))
				if (Math.abs(forcedShock) > 0.001) {
					const mergedShock = Math.max(-0.7, Math.min(0.7, Number(economyOverrides.nextMonthStockShock || 0) + forcedShock))
					economyOverrides = {
						...economyOverrides,
						nextMonthStockShock: mergedShock,
					}
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
			const hadPerfectChecksThisMonth = monthlyCheckSuccesses > 0 && monthlyCheckFailures === 0
			if (hadPerfectChecksThisMonth) {
				perfectChecksBoostMonths = Math.max(perfectChecksBoostMonths, 1)
			}
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

			if (jobUpgradeBoostMonths > 0) happinessDelta += 8
			if (payRaiseBoostMonths > 0) happinessDelta += 5
			if (credentialBoostMonths > 0) happinessDelta += 4
			if (perfectChecksBoostMonths > 0) happinessDelta += 3

			const nextJobUpgradeBoostMonths = Math.max(0, jobUpgradeBoostMonths - 1)
			const nextPayRaiseBoostMonths = Math.max(0, payRaiseBoostMonths - 1)
			const nextCredentialBoostMonths = Math.max(0, credentialBoostMonths - 1)
			const nextPerfectChecksBoostMonths = Math.max(0, perfectChecksBoostMonths - 1)

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

			const registeredUsers = getRegisteredUserCount()
			for (const city of cityData) {
				const cityName = city.name
				const pressure = cityPressureMultiplier(registeredUsers, city)
				const listings = Array.isArray(realEstateMarket[cityName]) ? realEstateMarket[cityName] : []
				realEstateMarket[cityName] = listings.map((listing: any, idx: number) => {
					const dom = Math.max(0, Number(listing?.dom || 0) + 1)
					const seed = hashString(`${listing.id || `${cityName}-${idx}`}-${nextYear}-${nextMonth}`)
					const rnd = mulberry32(seed)()
					const domDiscount = Math.min(0.025, dom * 0.0012)
					const pressureDrift = (pressure - 1) * 0.008
					const noise = (rnd - 0.5) * 0.016
					const nextPrice = round2(Math.max(50000, Number(listing.askingPrice || 0) * (1 + pressureDrift - domDiscount + noise)))
					const nextRent = round2(Math.max(450, Number(listing.askingRentPerUnit || 0) * (1 + pressureDrift * 0.7 - domDiscount * 0.4 + noise * 0.8)))
					const conditionDrift = Math.round((rnd - 0.45) * 2)
					return {
						...listing,
						dom,
						askingPrice: nextPrice,
						askingRentPerUnit: nextRent,
						condition: Math.max(20, Math.min(100, Number(listing.condition || 75) + conditionDrift))
					}
				})
			}

			const survivingDeals: any[] = []
			let mortgageClosingsThisMonth = 0
			for (const deal of pendingRealEstateDeals) {
				const monthsInPipeline = Number(deal?.monthsInPipeline || 0) + 1
				const approvalMonthsRequired = Math.max(1, Number(deal?.approvalMonthsRequired || 2))
				if (monthsInPipeline < approvalMonthsRequired) {
					survivingDeals.push({ ...deal, monthsInPipeline })
					continue
				}

				const downPaymentPct = Math.max(0.1, Math.min(0.6, Number(deal?.downPaymentPct || 0.25)))
				const baseApproval = 0.48 + ((credit - 600) / 1000) + ((downPaymentPct - 0.2) * 0.7)
				const certBonus = (Array.isArray(credentials) && (credentials.includes('Real Estate') || credentials.includes('Real Estate Broker'))) ? 0.08 : 0
				const approvalChance = Math.max(0.15, Math.min(0.96, baseApproval + certBonus))
				const approvalRoll = mulberry32(hashString(`${deal.id}-${nextMonth}-${nextYear}-${credit}`))()

				if (approvalRoll > approvalChance) {
					if (deal?.listing?.cityName) {
						realEstateMarket[deal.listing.cityName] = [...(realEstateMarket[deal.listing.cityName] || []), deal.listing]
					}
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🏦 Property offer declined by underwriting: ${deal?.listing?.templateName || 'Listing'}` })
					continue
				}

				const listing = deal?.listing || null
				if (!listing) continue
				const purchasePrice = Number(listing.askingPrice || 0)
				const purchaseMode = deal?.purchaseMode === 'cash' ? 'cash' : 'mortgage'
				const mortgageTermYears = Number(deal?.mortgageTermYears || 30) === 15 ? 15 : 30
				const negotiatedPrice = purchaseMode === 'cash' ? round2(purchasePrice * 0.97) : purchasePrice
				const downPayment = purchaseMode === 'cash' ? negotiatedPrice : round2(negotiatedPrice * downPaymentPct)
				const closingCosts = round2(negotiatedPrice * (purchaseMode === 'cash' ? 0.015 : 0.025))
				const cashToClose = round2(downPayment + closingCosts)
				if (resultingCheck < cashToClose) {
					if (listing?.cityName) {
						realEstateMarket[listing.cityName] = [...(realEstateMarket[listing.cityName] || []), listing]
					}
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🏚️ Deal canceled at closing (insufficient cash): needed $${cashToClose.toLocaleString()}` })
					continue
				}

				resultingCheck = round2(resultingCheck - cashToClose)
				const loanBalance = round2(Math.max(0, negotiatedPrice - downPayment))
				const mortgageAPR = Math.max(0.035, calculateDynamicAPR(credit) + 0.01)
				const mortgageTermMonths = purchaseMode === 'cash' ? 0 : (mortgageTermYears * 12)
				const monthlyDebtService = purchaseMode === 'cash' ? 0 : round2(calculateMonthlyPayment(loanBalance, mortgageAPR, mortgageTermMonths))
				if (purchaseMode === 'mortgage') mortgageClosingsThisMonth += 1
				const tier = cityRealEstateTier(cityData.find((c) => c.name === listing.cityName) || { p: 1 }) as keyof typeof rentControlByCityType
				const rentControlCap = Number(rentControlByCityType[tier] || 0.045)
				const amenities = Array.isArray(listing.amenities) ? listing.amenities : []
				const units = Math.max(1, Number(listing.units || 1))
				const occupiedUnits = Math.max(0, Math.min(units, Math.round(units * 0.75)))
				const ownershipCount = Math.max(0, Math.floor(Number(listing.ownershipCount || 0))) + 1
				const propertyId = `prop-${Date.now()}-${Math.floor(Math.random() * 10000)}`
				investmentProperties.push({
					id: propertyId,
					cityName: listing.cityName,
					templateName: listing.templateName,
					templateId: listing.templateId,
					assetClass: listing.assetClass || (realEstateTemplates.find((t) => t.id === listing.templateId)?.assetClass || 'Residential'),
					incomeLabel: listing.incomeLabel || (realEstateTemplates.find((t) => t.id === listing.templateId)?.incomeLabel || 'Monthly Rent'),
					ownershipCount,
					units,
					occupiedUnits,
					vacancyMonths: occupiedUnits < units ? 1 : 0,
					propertyValue: negotiatedPrice,
					loanBalance,
					monthlyDebtService,
					mortgageTermMonths,
					purchaseMode,
					rentPerUnit: Number(listing.askingRentPerUnit || 0),
					marketRentPerUnit: Number(listing.askingRentPerUnit || 0),
					amenities,
					condition: Math.max(40, Math.min(100, Number(listing.condition || 75))),
					maintenanceIntensity: 1,
					neglectScore: 0,
					rentControlCap,
					renovationMonthsRemaining: 0,
					renovationBudgetRemaining: 0,
					lastNetCashflow: 0,
					acquiredMonth: nextMonth,
					acquiredYear: nextYear
				})

				realEstateMarket[listing.cityName] = (realEstateMarket[listing.cityName] || []).filter((l: any) => l.id !== listing.id)
				const restockDelay = 5 + Math.floor(Math.random() * 3)
				realEstateMarketMeta.pendingListingTimersByCity[listing.cityName] = [
					...(Array.isArray(realEstateMarketMeta.pendingListingTimersByCity?.[listing.cityName]) ? realEstateMarketMeta.pendingListingTimersByCity[listing.cityName] : []),
					restockDelay
				]
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🏠 Closed on ${listing.templateName} in ${listing.cityName} for $${negotiatedPrice.toLocaleString()} (${purchaseMode === 'cash' ? 'cash purchase' : `${mortgageTermYears}-year mortgage`})` })
			}
			pendingRealEstateDeals = survivingDeals
			if (mortgageClosingsThisMonth > 0) {
				const mortgageCreditHit = mortgageClosingsThisMonth * 25
				const beforeMortgagePenalty = credit
				credit = Math.max(300, credit - mortgageCreditHit)
				const appliedMortgagePenalty = beforeMortgagePenalty - credit
				for (let i = 0; i < mortgageClosingsThisMonth; i += 1) {
					creditInquiryQueue.push(6)
				}
				if (appliedMortgagePenalty > 0) {
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🏦 Mortgage accepted: credit -${appliedMortgagePenalty} (${credit})` })
				}
			}

			let realEstateIncome = 0
			let realEstateExpenses = 0
			const realEstatePropertyBreakdown: any[] = []
			const propertyEvents: string[] = []
			investmentProperties = investmentProperties.map((property: any) => {
				const city = cityData.find((c) => c.name === property.cityName) || { p: 1, r: 1, name: property.cityName }
				const pressure = cityPressureMultiplier(registeredUsers, city)
				const amenityScore = realEstateAmenityScore(property.amenities || [])
				const amenityRentBoostRate = realEstateAmenityRentBoostRate(property.amenities || [])
				const amenityUpkeepRate = realEstateAmenityUpkeepRate(property.amenities || [])
				const units = Math.max(1, Number(property.units || 1))
				let occupiedUnits = Math.max(0, Math.min(units, Number(property.occupiedUnits || 0)))
				let vacancyMonths = Number(property.vacancyMonths || 0)
				let condition = Math.max(20, Math.min(100, Number(property.condition || 75)))
				let maintenanceIntensity = Math.max(0.5, Math.min(1.5, Number(property.maintenanceIntensity || 1)))
				let propertyValue = Math.max(60000, Number(property.propertyValue || 0))
				let loanBalance = Math.max(0, Number(property.loanBalance || 0))
				const debtService = Math.max(0, Number(property.monthlyDebtService || 0))
				let rentPerUnit = Math.max(450, Number(property.rentPerUnit || 0))
				let marketRentPerUnit = Math.max(450, Number(property.marketRentPerUnit || rentPerUnit))
				let neglectScore = Math.max(0, Number(property.neglectScore || 0))
				let renovationMonthsRemaining = Math.max(0, Number(property.renovationMonthsRemaining || 0))
				let renovationBudgetRemaining = Math.max(0, Number(property.renovationBudgetRemaining || 0))
				const renovationValueRecovery = Math.max(0.72, Number(property.renovationValueRecovery || 0.9))
				const acquiredMonth = Number(property.acquiredMonth || nextMonth)
				const acquiredYear = Number(property.acquiredYear || nextYear)
				const propertyAgeMonths = Math.max(0, ((nextYear - acquiredYear) * 12) + (nextMonth - acquiredMonth))

				const valueDrift = ((pressure - 1) * 0.012) + ((condition - 70) * 0.00035) - (neglectScore * 0.0009)
				propertyValue = round2(Math.max(60000, propertyValue * (1 + valueDrift)))
				marketRentPerUnit = round2(Math.max(450, marketRentPerUnit * (1 + ((pressure - 1) * 0.01) + ((condition - 70) * 0.0002) + (amenityRentBoostRate * 0.08))))

				const maxRentStep = Math.max(0, Number(property.rentControlCap || 0.045) / 12)
				const targetRent = Math.min(marketRentPerUnit * 1.1, rentPerUnit * (1 + maxRentStep))
				rentPerUnit = round2(Math.max(450, targetRent))

				// Buildings naturally wear down over time. Maintenance only slows decay; it does not fully renovate by itself.
				const ageDecay = 0.18 + Math.min(0.42, propertyAgeMonths * 0.008)
				const neglectPenalty = neglectScore * 0.035
				const maintenanceReduction = Math.max(0, (maintenanceIntensity - 0.75) * 0.42)
				const monthlyConditionDecay = Math.max(0.04, ageDecay + neglectPenalty - maintenanceReduction)
				condition = Math.max(20, condition - monthlyConditionDecay)

				if (maintenanceIntensity < 0.95) {
					neglectScore = Math.min(12, neglectScore + (1.05 - maintenanceIntensity) * 0.9)
				} else {
					neglectScore = Math.max(0, neglectScore - Math.min(0.45, (maintenanceIntensity - 0.95) * 0.9))
				}

				if (renovationMonthsRemaining > 0 && renovationBudgetRemaining > 0) {
					const monthlyRenovationSpend = round2(Math.min(renovationBudgetRemaining, renovationBudgetRemaining / renovationMonthsRemaining))
					renovationBudgetRemaining = round2(Math.max(0, renovationBudgetRemaining - monthlyRenovationSpend))
					renovationMonthsRemaining = Math.max(0, renovationMonthsRemaining - 1)
					realEstateExpenses = round2(realEstateExpenses + monthlyRenovationSpend)
					// Renovation improves condition gradually each month rather than instantly.
					const renovationLift = 0.9 + Math.min(1.15, Math.max(0.35, monthlyRenovationSpend / 40000))
					condition = Math.min(100, condition + renovationLift)
					neglectScore = Math.max(0, neglectScore - 0.55)
					propertyValue = round2(propertyValue + (monthlyRenovationSpend * renovationValueRecovery))
				}

				const rentPressure = marketRentPerUnit > 0 ? rentPerUnit / marketRentPerUnit : 1
				const churnChance = Math.max(0.02, Math.min(0.4, 0.04 + Math.max(0, rentPressure - 1) * 0.18 + ((70 - condition) * 0.002) - amenityScore * 0.2))
				if (occupiedUnits > 0) {
					const churnSeed = hashString(`${property.id}-${nextYear}-${nextMonth}-churn`)
					if (mulberry32(churnSeed)() < churnChance) {
						occupiedUnits = Math.max(0, occupiedUnits - 1)
						vacancyMonths = 1
						propertyEvents.push(`Tenant moved out at ${property.templateName} (${property.cityName})`)
					}
				}

				if (occupiedUnits < units) {
					let vacantUnits = units - occupiedUnits
					for (let i = 0; i < vacantUnits; i++) {
						const leaseChance = Math.max(0.08, Math.min(0.9, 0.32 + ((pressure - 1) * 0.28) + amenityScore + Math.max(0, 1 - rentPressure) * 0.22 + ((condition - 65) * 0.004) - (vacancyMonths * 0.02)))
						const leaseSeed = hashString(`${property.id}-${nextYear}-${nextMonth}-lease-${i}`)
						if (mulberry32(leaseSeed)() < leaseChance) {
							occupiedUnits += 1
							propertyEvents.push(`New tenant signed at ${property.templateName} (${property.cityName})`)
						}
					}
					vacancyMonths = occupiedUnits < units ? vacancyMonths + 1 : 0
				}

				const annualTaxRate = 0.009 + Number(city.p || 1) * 0.003
				const annualInsuranceRate = 0.0035 + Number(city.r || 1) * 0.001
				const annualMaintenanceRate = 0.014 + (Math.max(0, 85 - condition) * 0.00025) + amenityUpkeepRate
				const monthlyOperating = round2(propertyValue * (annualTaxRate + annualInsuranceRate + annualMaintenanceRate) / 12)
				const grossRent = round2(occupiedUnits * rentPerUnit)
				const netCashflow = round2(grossRent - monthlyOperating - debtService)

				realEstateIncome = round2(realEstateIncome + grossRent)
				realEstateExpenses = round2(realEstateExpenses + monthlyOperating + debtService)
				realEstatePropertyBreakdown.push({
					propertyId: String(property.id || ''),
					propertyName: String(property.templateName || property.incomeLabel || 'Property'),
					cityName: String(property.cityName || ''),
					grossIncome: grossRent,
					operatingCosts: monthlyOperating,
					debtService,
					netCashflow
				})

				if (loanBalance > 0 && debtService > 0) {
					const loanInterest = round2(loanBalance * ((Math.max(0.035, calculateDynamicAPR(credit) + 0.01)) / 12))
					const principalPaid = Math.max(0, round2(debtService - loanInterest))
					loanBalance = round2(Math.max(0, loanBalance - principalPaid))
				}

				return {
					...property,
					occupiedUnits,
					vacancyMonths,
					condition: round2(condition),
					maintenanceIntensity,
					propertyValue,
					loanBalance,
					rentPerUnit,
					marketRentPerUnit,
					neglectScore: round2(neglectScore),
					renovationMonthsRemaining,
					renovationBudgetRemaining,
					renovationValueRecovery,
					lastNetCashflow: netCashflow
				}
			})

			const realEstateNet = round2(realEstateIncome - realEstateExpenses)
			if (investmentProperties.length > 0) {
				resultingCheck = round2(resultingCheck + realEstateNet)
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🏘️ Rental portfolio cashflow: ${realEstateNet >= 0 ? '+' : '-'}$${Math.abs(realEstateNet).toLocaleString()} (income $${realEstateIncome.toLocaleString()} | expenses $${realEstateExpenses.toLocaleString()})` })
			}

			if (resultingCheck < 0 && investmentProperties.length > 0) {
				const ranked = [...investmentProperties].sort((a: any, b: any) => (Number(a.propertyValue || 0) - Number(a.loanBalance || 0)) - (Number(b.propertyValue || 0) - Number(b.loanBalance || 0)) )
				const foreclosed = ranked[0]
				if (foreclosed) {
					const foreclosurePrice = round2(Math.max(50000, Number(foreclosed.propertyValue || 0) * 0.78))
					const deficiency = round2(Math.max(0, Number(foreclosed.loanBalance || 0) - foreclosurePrice))
					const surplus = round2(Math.max(0, foreclosurePrice - Number(foreclosed.loanBalance || 0)))

					if (deficiency > 0) {
						newDebt = round2(newDebt + deficiency)
					}
					resultingCheck = round2(Math.max(0, resultingCheck + surplus))

					investmentProperties = investmentProperties.filter((p: any) => p.id !== foreclosed.id)
					const foreclosureListing = {
						id: `re-foreclosure-${foreclosed.id}-${nextYear}-${nextMonth}`,
						cityName: foreclosed.cityName,
						templateId: foreclosed.templateId,
						templateName: foreclosed.templateName,
						assetClass: foreclosed.assetClass || 'Residential',
						incomeLabel: foreclosed.incomeLabel || 'Monthly Rent',
						units: Math.max(1, Number(foreclosed.units || 1)),
						askingPrice: foreclosurePrice,
						askingRentPerUnit: round2(Math.max(300, Number(foreclosed.rentPerUnit || foreclosed.marketRentPerUnit || 1200) * 0.96)),
						amenities: Array.isArray(foreclosed.amenities) ? foreclosed.amenities : [],
						dom: 0,
						condition: Math.max(20, Math.min(100, Math.round(Number(foreclosed.condition || 60) - 6))),
						ownershipCount: Math.max(0, Math.floor(Number(foreclosed.ownershipCount || 0))),
						foreclosure: true,
						listedByUser: null
					}
					realEstateMarket[foreclosed.cityName] = [...(realEstateMarket[foreclosed.cityName] || []), foreclosureListing]
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `⚠️ Foreclosure executed on ${foreclosed.templateName}. Relisted at $${foreclosurePrice.toLocaleString()}${deficiency > 0 ? ` with $${deficiency.toLocaleString()} deficiency debt.` : '.'}` })
				}
			}
			if (propertyEvents.length > 0) {
				for (const evt of propertyEvents.slice(0, 4)) {
					logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🏢 ${evt}` })
				}
			}

			writeSharedRealEstateMarket(realEstateMarket)
			writeSharedRealEstateMeta(realEstateMarketMeta)

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

			let totalDividendsPaid = 0
			const dividendBreakdown: string[] = []
			for (const holding of Array.isArray(nextPortfolio) ? nextPortfolio : []) {
				const ticker = String(holding?.ticker || '')
				const shares = Number(holding?.shares || 0)
				if (!ticker || shares <= 0) continue

				const asset = stockMarketAssets.find((a) => a.ticker === ticker)
				const annualYield = Number((asset as any)?.dividendYield || 0)
				if (!asset || annualYield <= 0) continue

				const referencePrice = Number(previousMarketPrices[ticker] || asset.basePrice || 0)
				if (referencePrice <= 0) continue

				const monthlyDividend = round2(shares * referencePrice * (annualYield / 12))
				if (monthlyDividend <= 0) continue

				totalDividendsPaid = round2(totalDividendsPaid + monthlyDividend)
				dividendBreakdown.push(`${ticker}: +$${monthlyDividend.toFixed(2)}`)
			}

			if (totalDividendsPaid > 0) {
				resultingCheck = round2(resultingCheck + totalDividendsPaid)
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: `💰 Dividend payout received: +$${totalDividendsPaid.toFixed(2)} (${dividendBreakdown.join(', ')})`
				})
				eventHistory.push({
					id: `div-${nextYear}-${nextMonth}`,
					title: 'Dividend Payout',
					amount: totalDividendsPaid,
					type: 'in',
					icon: '💰',
					desc: dividendBreakdown.join(' | '),
					trigger: 'stocks',
					month: nextMonth,
					year: nextYear
				})
			}
			const stockInvestedLastMonth = round2(Number(autoInvestResult.investedAmount || 0))
			const nextMarketPrices = advanceMarketPrices(previousMarketPrices, nextYear, nextMonth, economyOverrides)
			if (Math.abs(Number(economyOverrides.nextMonthStockShock || 0)) > 0.001) {
				const shockPct = Math.round(Number(economyOverrides.nextMonthStockShock || 0) * 100)
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: `🌐 Macro intervention applied: ${shockPct >= 0 ? '+' : ''}${shockPct}% market shock.`
				})
			}
			const marketPriceHistory = appendMarketPriceHistory(state.marketPriceHistory, nextMarketPrices, nextMonth, nextYear)
			creditAccountAgeMonths += 1

			const checkSuccessCredit = monthlyCheckSuccesses * 5
			const checkFailurePenalty = monthlyCheckFailures * 10
			const debtPenalty = newDebt > 0 ? 20 : 0
			const verificationCreditDelta = checkSuccessCredit - checkFailurePenalty - debtPenalty
			if (verificationCreditDelta !== 0) {
				const beforeVerificationCredit = credit
				credit = Math.max(300, Math.min(850, credit + verificationCreditDelta))
				const appliedDelta = credit - beforeVerificationCredit
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: `📊 Verification credit update: checks +${checkSuccessCredit}, failed checks -${checkFailurePenalty}, debt -${debtPenalty} => ${appliedDelta >= 0 ? '+' : ''}${appliedDelta} (${credit})`
				})
			}

			if (effectiveHistoricalEvent && effectiveHistoricalEvent.monthsRemaining > 0) {
				const drag = Math.max(0, Math.floor(Number(effectiveHistoricalEvent.effects?.creditDragPerMonth || 0)))
				if (drag > 0) {
					const beforeDrag = credit
					credit = Math.max(300, credit - drag)
					const appliedDrag = beforeDrag - credit
					if (appliedDrag > 0) {
						logs.push({
							date: `${nextMonth}/${nextYear}`,
							msg: `📉 ${effectiveHistoricalEvent.title}: macro credit drag -${appliedDrag} (${credit})`
						})
					}
				}
			}

			let supplementalCreditDelta = 0
			const supplementalNotes: string[] = []

			const activeInquiries = creditInquiryQueue.length
			if (activeInquiries > 0) {
				const inquiryPenalty = activeInquiries * 2
				supplementalCreditDelta -= inquiryPenalty
				supplementalNotes.push(`hard inquiries -${inquiryPenalty}`)
			}
			creditInquiryQueue = creditInquiryQueue.map((m: number) => Math.max(0, m - 1)).filter((m: number) => m > 0)

			const vehicleDebtService = round2((Array.isArray(updatedGarage) ? updatedGarage : []).reduce((sum: number, g: any) => {
				if (Number(g?.monthsRemaining || 0) <= 0) return sum
				return sum + Number(g?.monthlyPayment || 0)
			}, 0))
			const mortgageDebtService = round2((Array.isArray(investmentProperties) ? investmentProperties : []).reduce((sum: number, p: any) => {
				if (Number(p?.loanBalance || 0) <= 0) return sum
				return sum + Number(p?.monthlyDebtService || 0)
			}, 0))
			const impliedDebtPayment = newDebt > 0 ? Math.max(50, round2(newDebt * 0.015)) : 0
			const monthlyDebtObligations = round2(impliedDebtPayment + vehicleDebtService + mortgageDebtService)
			const grossMonthlyIncome = Math.max(1, round2((updatedJob.base * city.p * 0.8) + realEstateIncome))
			const utilizationRatio = monthlyDebtObligations / grossMonthlyIncome
			if (utilizationRatio >= 0.5) {
				supplementalCreditDelta -= 12
				supplementalNotes.push('high debt utilization -12')
			} else if (utilizationRatio >= 0.35) {
				supplementalCreditDelta -= 8
				supplementalNotes.push('elevated debt utilization -8')
			} else if (utilizationRatio <= 0.12 && newDebt <= 0) {
				supplementalCreditDelta += 4
				supplementalNotes.push('low debt utilization +4')
			}

			if (debtDelinquencyStreak > 0) {
				const delinquencyPenalty = Math.min(25, debtDelinquencyStreak * 5)
				supplementalCreditDelta -= delinquencyPenalty
				supplementalNotes.push(`delinquency streak (${debtDelinquencyStreak}) -${delinquencyPenalty}`)
			}

			if (newDebt <= 0 && debtDelinquencyStreak === 0 && monthlyCheckFailures === 0) {
				const accountAgeBonus = creditAccountAgeMonths >= 24 ? 2 : 1
				supplementalCreditDelta += accountAgeBonus
				supplementalNotes.push(`account age +${accountAgeBonus}`)
			}

			const hasVehicleLoan = (Array.isArray(updatedGarage) ? updatedGarage : []).some((g: any) => Number(g?.monthsRemaining || 0) > 0)
			const hasMortgage = (Array.isArray(investmentProperties) ? investmentProperties : []).some((p: any) => Number(p?.loanBalance || 0) > 0)
			if (hasVehicleLoan && hasMortgage && debtDelinquencyStreak === 0) {
				supplementalCreditDelta += 3
				supplementalNotes.push('healthy credit mix +3')
			}

			if (supplementalCreditDelta !== 0) {
				const beforeSupplementalCredit = credit
				credit = Math.max(300, Math.min(850, credit + supplementalCreditDelta))
				const appliedSupplemental = credit - beforeSupplementalCredit
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: `📉 Credit profile update: ${supplementalNotes.join(', ')} => ${appliedSupplemental >= 0 ? '+' : ''}${appliedSupplemental} (${credit})`
				})
			}

			const achievementSnapshot = {
				...state,
				check: resultingCheck,
				savings: newSave,
				debt: newDebt,
				tenure,
				credentials,
				garage: updatedGarage,
				investmentProperties,
				portfolio: nextPortfolio,
				marketPrices: nextMarketPrices,
				logs,
				luxuryServices: state.luxuryServices,
				calculationStreak: state.calculationStreak,
				totalGasPaid,
				totalUtilitiesPaid,
				maxMonthlyLuxuryEventSpend
			}
			const unlockedNow = generateAchievementUnlocks(achievementSnapshot)
			const achievementsUnlocked = Array.from(new Set([...(state.achievementsUnlocked || []), ...unlockedNow.map((a: any) => a.id)]))
			const achievementHistory = [...(state.achievementHistory || [])]
			let rewardTokens = Number(state.rewardTokens || 0)
			const rewardCategoryQueue = Array.isArray(state.rewardCategoryQueue) ? [...state.rewardCategoryQueue] : []
			let lastAchievementCategory = state.lastAchievementCategory || null
			for (const ach of unlockedNow) {
				const awardedTokens = Math.max(1, Number(ach.tokenReward || 1))
				rewardTokens += awardedTokens
				lastAchievementCategory = ach.category
				for (let i = 0; i < awardedTokens; i += 1) {
					rewardCategoryQueue.push(ach.category)
				}
				achievementHistory.unshift({ id: ach.id, title: ach.title, category: ach.category, month: nextMonth, year: nextYear })
				logs.push({ date: `${nextMonth}/${nextYear}`, msg: `🏆 Achievement unlocked: ${ach.title} (+${ach.tokenReward || 1} reward spin)` })
			}
			if (unlockedNow.length > 0) {
				celebration = 'achievement'
			}

			const nextEconomyMonthsRemaining = economyOverrideMonthsRemaining > 0
				? Math.max(0, economyOverrideMonthsRemaining - 1)
				: 0
			const economyCampaignExpired = economyOverrideMonthsRemaining > 0 && nextEconomyMonthsRemaining === 0
			const nextHistoricalMonthsRemaining = effectiveHistoricalEvent && effectiveHistoricalEvent.monthsRemaining > 0
				? Math.max(0, effectiveHistoricalEvent.monthsRemaining - 1)
				: 0
			const historicalEventExpired = Boolean(effectiveHistoricalEvent && effectiveHistoricalEvent.monthsRemaining > 0 && nextHistoricalMonthsRemaining === 0)
			if (economyCampaignExpired) {
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: '📉 Admin economy campaign expired. Sliders reset to neutral baseline.',
				})
			}
			if (historicalEventExpired && effectiveHistoricalEvent) {
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: `📚 Historical scenario complete: ${effectiveHistoricalEvent.title} has ended.`,
				})
			}
			if (shouldResetHistoricalEventNextMonth) {
				logs.push({
					date: `${nextMonth}/${nextYear}`,
					msg: '🛟 Normal circumstances restored this month by admin reset schedule.',
				})
			}

			return {
				...state,
				check: resultingCheck,
				savings: newSave,
				debt: newDebt,
				credit,
				paymentStreak,
				debtDelinquencyStreak,
				creditAccountAgeMonths,
				creditInquiryQueue,
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
				lastNegotiationMonth,
				lastNegotiationYear,
				lastAutoBumpMonth: newLastAutoBumpMonth,
				lastAutoBumpYear: newLastAutoBumpYear,
				entertainmentSpending: nextEntertainmentBudgets.entertainmentBudget,
				subscriptionEntertainmentSpending: nextEntertainmentBudgets.subscriptionBudget,
				subscriptionStreakMonths: nextSubscriptionStreakMonths,
				subscriptionBadges: nextSubscriptionBadges,
				entertainmentTicketStubs: nextEntertainmentTicketStubs,
				happiness: nextHappiness,
				jobUpgradeBoostMonths: nextJobUpgradeBoostMonths,
				payRaiseBoostMonths: nextPayRaiseBoostMonths,
				credentialBoostMonths: nextCredentialBoostMonths,
				perfectChecksBoostMonths: nextPerfectChecksBoostMonths,
				workPenaltyPercent: nextWorkPenaltyPercent,
				marketPricesPrevious: previousMarketPrices,
				marketPrices: nextMarketPrices,
				marketPriceHistory,
				economyOverrides: (economyCampaignExpired || shouldResetHistoricalEventNextMonth)
					? { ...DEFAULT_ECONOMY_OVERRIDES }
					: {
						...economyOverrides,
						nextMonthStockShock: 0,
					},
				economyOverrideMonthsRemaining: shouldResetHistoricalEventNextMonth ? 0 : nextEconomyMonthsRemaining,
				historicalEconomicEvent: effectiveHistoricalEvent && nextHistoricalMonthsRemaining > 0
					? { ...effectiveHistoricalEvent, monthsRemaining: nextHistoricalMonthsRemaining }
					: null,
				historicalEventResetNextMonth: false,
				portfolio: nextPortfolio,
				investmentProperties,
				pendingRealEstateDeals,
				realEstateMarket,
				realEstateMarketMeta,
				realEstateLastMonthIncome: realEstateIncome,
				realEstateLastMonthExpenses: realEstateExpenses,
				realEstateLastMonthPropertyBreakdown: realEstatePropertyBreakdown,
				stockInvestedThisMonth: 0,
				stockInvestedLastMonth,
				totalGasPaid,
				totalUtilitiesPaid,
				maxMonthlyLuxuryEventSpend,
				achievementsUnlocked,
				achievementHistory: achievementHistory.slice(0, 40),
				rewardTokens,
				rewardCategoryQueue,
				lastAchievementCategory,
				celebration,
				pendingAdminGifts: [],
				monthlyCheckSuccesses: 0,
				monthlyCheckFailures: 0,
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
				payRaiseBoostMonths: Math.max(2, Number(state.payRaiseBoostMonths || 0)),
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
				payRaiseBoostMonths: Math.max(2, Number(state.payRaiseBoostMonths || 0)),
				lastAutoBumpMonth: state.month,
				lastAutoBumpYear: state.year,
				logs,
				celebration: 'pay-bump'
			}
		}
		case 'BUY_STOCK': {
			const { ticker, shares } = action.payload || {}
			const quantity = Math.max(0, roundShareQuantity(Number(shares || 0)))
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
			const logs = [...state.logs, { date: `${state.month}/${state.year}`, msg: `📈 Bought ${formatShareQuantity(quantity)} ${ticker} @ $${price.toFixed(2)} (${fillType}, ${totalCost.toFixed(2)})` }]
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
			const quantity = Math.max(0, roundShareQuantity(Number(shares || 0)))
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
			const ownedShares = Math.max(0, roundShareQuantity(Number(holding.shares || 0)))
			const sellShares = roundShareQuantity(Math.min(quantity, ownedShares))
			if (sellShares <= 0) return state

			const marketPrice = Number(state.marketPrices?.[ticker] || asset.basePrice)
			const price = executionPriceWithSlippage(marketPrice, `${ticker}-${state.month}-${state.year}-${Date.now()}-sell`)
			const proceeds = round2(price * sellShares)
			const remainingShares = roundShareQuantity(ownedShares - sellShares)
			if (remainingShares > 0) {
				portfolio[idx] = { ...holding, shares: remainingShares }
			} else {
				portfolio.splice(idx, 1)
			}

			const fillType = slippageLabel(price, marketPrice)
			const logs = [...state.logs, { date: `${state.month}/${state.year}`, msg: `📉 Sold ${formatShareQuantity(sellShares)} ${ticker} @ $${price.toFixed(2)} (${fillType}, +$${proceeds.toFixed(2)})` }]
			return {
				...state,
				check: round2(state.check + proceeds),
				portfolio,
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
	const stateRef = useRef(state)
	const saveInFlightRef = useRef<Promise<boolean> | null>(null)
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
	const [peerSnapshots, setPeerSnapshots] = useState<any[]>([])
	const [ledgerEventNotifications, setLedgerEventNotifications] = useState<any[]>([])
	const seenLedgerEventKeysRef = useRef<Set<string>>(new Set())
	const dirtyStateKeysRef = useRef<Set<string>>(new Set())
	const trackedStateRef = useRef<any>(initialState)
	const savedStateRef = useRef<any>(initialState)

	useEffect(() => {
		stateRef.current = state
	}, [state])

	useEffect(() => {
		const previous = trackedStateRef.current || {}
		const current = state || {}
		const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)])
		for (const key of allKeys) {
			if (NON_PERSISTED_STATE_KEYS.has(key) || CLIENT_ONLY_STATE_KEYS.has(key)) continue
			if (previous[key] !== current[key]) dirtyStateKeysRef.current.add(key)
		}
		trackedStateRef.current = current
	}, [state])

	function resetDirtyTracking(snapshot: any) {
		const normalized = snapshot || {}
		trackedStateRef.current = normalized
		savedStateRef.current = normalized
		dirtyStateKeysRef.current.clear()
	}

	function sameEntry(a: any, b: any) {
		if (a === b) return true
		if (a == null || b == null) return false
		if (typeof a !== 'object' || typeof b !== 'object') return a === b
		return JSON.stringify(a) === JSON.stringify(b)
	}

	function buildPartialStateUpdate(snapshot: any) {
		const source = snapshot || {}
		const baseline = savedStateRef.current || {}
		const payload: Record<string, any> = {}
		const appendPayload: Record<string, any[]> = {}
		const keys = Array.from(dirtyStateKeysRef.current)

		for (const key of keys) {
			if (NON_PERSISTED_STATE_KEYS.has(key) || CLIENT_ONLY_STATE_KEYS.has(key)) continue
			if (!(key in source)) continue
			const value = source[key]
			if (value === undefined) continue
			const previousValue = baseline[key]

			if (APPEND_ONLY_STATE_KEYS.has(key) && Array.isArray(value) && Array.isArray(previousValue)) {
				const baselineLength = previousValue.length
				const canAppend = value.length >= baselineLength && (baselineLength === 0 || sameEntry(value[baselineLength - 1], previousValue[baselineLength - 1]))

				if (canAppend) {
					const appended = value.slice(baselineLength)
					if (appended.length > 0) appendPayload[key] = appended
					continue
				}
			}

			payload[key] = value
		}

		if (Object.keys(appendPayload).length > 0) {
			payload._append = appendPayload
		}

		return Object.keys(payload).length > 0 ? payload : null
	}

	async function refreshPeerSnapshots() {
		try {
			const users = await fetchAllUsers()
			setCachedUserSnapshots(users)
			setPeerSnapshots(users)
		} catch (e) {
			console.error('Failed to refresh user snapshots', e)
		}
	}

	const cityUserCounts = useMemo(() => getUserCityCounts(state), [peerSnapshots, state.currentUser, state.city?.name])
	const affluenceComparison = useMemo(() => getAffluenceComparison({ currentState: state, peerSnapshots }), [peerSnapshots, state])

	useEffect(() => {
		buildLedger()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		refreshPeerSnapshots()
	}, [])

	function enqueueLedgerEventNotifications(events: any[]) {
		if (!Array.isArray(events) || events.length === 0) return

		const fresh = events
			.filter((event: any) => event && typeof event === 'object')
			.map((event: any, idx: number) => ({
				id: String(event.id || `stmt-event-${event.year || stateRef.current.year}-${event.month || stateRef.current.month}-${idx}`),
				title: String(event.title || 'Life Event'),
				amount: Number(event.amount || 0),
				type: event.type === 'in' ? 'in' : 'out',
				icon: String(event.icon || '🗞️'),
				desc: String(event.desc || ''),
				trigger: String(event.trigger || 'general'),
				month: Number(event.month || stateRef.current.month),
				year: Number(event.year || stateRef.current.year),
			}))
			.filter((event: any) => {
				const key = `${event.id}:${event.month}:${event.year}`
				if (seenLedgerEventKeysRef.current.has(key)) return false
				seenLedgerEventKeysRef.current.add(key)
				return true
			})

		if (!fresh.length) return
		setLedgerEventNotifications((prev: any[]) => [...prev, ...fresh])
	}

	function dequeueLedgerEventNotification() {
		setLedgerEventNotifications((prev: any[]) => prev.slice(1))
	}

	function buildLedgerRequestState(source: any) {
		const snapshot = source || {}
		const month = Number(snapshot.month || 0)
		const year = Number(snapshot.year || 0)

		const statementEvents = Array.isArray(snapshot.eventHistory)
			? snapshot.eventHistory
					.filter((entry: any) => Number(entry?.month || 0) === month && Number(entry?.year || 0) === year)
					.map((entry: any) => ({
						id: entry?.id,
						title: entry?.title,
						amount: entry?.amount,
						type: entry?.type,
						icon: entry?.icon,
						desc: entry?.desc,
						trigger: entry?.trigger,
						month,
						year,
					}))
			: []

		const garage = Array.isArray(snapshot.garage)
			? snapshot.garage.map((vehicle: any) => ({
					id: vehicle?.id,
					vehicleId: vehicle?.vehicleId,
					vehicleName: vehicle?.vehicleName,
					purchaseMonth: vehicle?.purchaseMonth,
					purchaseYear: vehicle?.purchaseYear,
					monthlyPayment: vehicle?.monthlyPayment,
					monthsRemaining: vehicle?.monthsRemaining,
				}))
			: []

		return {
			check: snapshot.check,
			month,
			year,
			city: snapshot.city
				? {
						name: snapshot.city.name,
						p: snapshot.city.p,
						r: snapshot.city.r,
				  }
				: null,
			job: snapshot.job,
			pendingJob: snapshot.pendingJob,
			workPenaltyPercent: snapshot.workPenaltyPercent,
			realEstateLastMonthIncome: snapshot.realEstateLastMonthIncome,
			luxuryServices: snapshot.luxuryServices || {},
			transit: snapshot.transit
				? {
						name: snapshot.transit.name,
						cost: snapshot.transit.cost,
						level: snapshot.transit.level,
				  }
				: null,
			garage,
			entertainmentSpending: snapshot.entertainmentSpending,
			subscriptionEntertainmentSpending: snapshot.subscriptionEntertainmentSpending,
			stockInvestedLastMonth: snapshot.stockInvestedLastMonth,
			activeEdu: snapshot.activeEdu,
			investmentPropertyCount: Array.isArray(snapshot.investmentProperties) ? snapshot.investmentProperties.length : 0,
			statementEvents,
		}
	}

	async function buildLedger(paySave = 0, payDebt = 0, stateOverride?: any, preserveProgress = false) {
		const buildState = stateOverride ?? state
		try {
			const requestState = buildLedgerRequestState(buildState)
			const response = await fetch(`${API_BASE_URL}/game/build-ledger`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ state: requestState, paySave, payDebt }),
			})
			if (!response.ok) return
			const result = await response.json()
			dispatch({ type: 'INIT_LEDGER', payload: result.ledger, preserveProgress })
			enqueueLedgerEventNotifications(result.events)
		} catch (e) {
			console.error('Failed to build ledger from server', e)
		}
	}


	function checkRow(id: number, value: number, expectedCheck?: number) {
		const tx = state.ledger.find((t: any) => t.id === id)
		if (!tx) return
		const done = Math.abs(value - tx.bal) < 0.01
		const newCheck = done ? value : undefined
		dispatch({ type: 'CHECK_ROW', payload: { id, done, newCheck, expectedCheck } })
	}

	function processMonth(paySave = 0, payDebt = 0, skippedPayment = false) {
		const safePaySave = Math.max(0, Number(paySave || 0))
		const safePayDebt = Math.min(Math.max(0, Number(state.debt || 0)), Math.max(0, Number(payDebt || 0)))
		const priorMonth = state.month
		const priorYear = state.year
		dispatch({ type: 'PROCESS_MONTH', payload: { paySave: safePaySave, payDebt: safePayDebt, skippedPayment } })

		// Rebuild ledger and persist only after reducer has advanced month/year,
		// so Previous Balance includes all post-month event effects.
		const finalizeMonth = () => {
			const latest = stateRef.current
			const advanced = latest.month !== priorMonth || latest.year !== priorYear
			if (!advanced) {
				setTimeout(finalizeMonth, 0)
				return
			}

			// Reducer already applies paySave/payDebt to checking before month advances.
			// Rebuilding with non-zero settlement values would subtract them a second time.
			buildLedger(0, 0, latest)
			void saveGame(latest)
		}

		setTimeout(finalizeMonth, 0)
	}

	async function evaluateApplications(stateOverride?: any) {
		const snapshot = stateOverride ?? state
		const result = await evaluateApplicationsOnServer(snapshot)
		if (!result) {
			dispatch({ type: 'SET_STATE', payload: { applicationResults: [] } })
			return []
		}

		dispatch({
			type: 'SET_STATE',
			payload: {
				applications: Array.isArray(result.applications) ? result.applications : snapshot.applications,
				logs: Array.isArray(result.logEntries)
					? [...(Array.isArray(snapshot.logs) ? snapshot.logs : []), ...result.logEntries]
					: Array.isArray(result.logs)
						? result.logs
						: snapshot.logs,
				applicationResults: Array.isArray(result.applicationResults) ? result.applicationResults : [],
			},
		})

		return Array.isArray(result.applicationResults) ? result.applicationResults : []
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

	async function openSettlement() {
		await evaluateApplications()
		dispatch({ type: 'SET_STATE', payload: { showSettlement: true } })
		void saveGame(stateRef.current)
	}

	// --- Save / Load / Auth ---

	async function saveGame(stateOverride?: any) {
		const snapshot = stateOverride ?? stateRef.current
		if (!snapshot?.id) return false

		if (saveInFlightRef.current) {
			try {
				await saveInFlightRef.current
			} catch {
				// Continue attempting the new save even if a prior one failed.
			}
		}

		const savePromise = (async () => {
			const payload = buildPartialStateUpdate(snapshot)
			if (!payload) {
				setSaveStatus('saved')
				if (!lastSavedAt) setLastSavedAt(Date.now())
				return true
			}
			if (!('currentUser' in payload) && snapshot.currentUser) {
				payload.currentUser = snapshot.currentUser
			}
			setSaveStatus('saving')
			const saved = await persistUserState(snapshot.id, payload)
			if (!saved) {
				setSaveStatus('error')
				return false
			}
			resetDirtyTracking(snapshot)
			setSaveStatus('saved')
			setLastSavedAt(Date.now())
			await refreshPeerSnapshots()
			return true
		})()

		saveInFlightRef.current = savePromise
		try {
			return await savePromise
		} finally {
			if (saveInFlightRef.current === savePromise) saveInFlightRef.current = null
		}
	}

	async function spinRewardWheel() {
		if (!state.id) return null
		const result = await spinRewardWheelForUser(state.id)
		if (!result?.user) return null

		const normalized = normalizeLoadedUserState(
			result.user,
			state,
			result.user.username || state.currentUser || state.username || 'player',
		)

		resetDirtyTracking(normalized)
		dispatch({ type: 'SET_STATE', payload: normalized })
		buildLedger(0, 0, normalized)
		await refreshPeerSnapshots()
		return result
	}

	async function loadGame() {
		if (!state.id || !state.currentUser) return false
		const data = await fetchUserById(state.id)
		if (!data) return false
		const normalized = normalizeLoadedUserState(data, state, state.currentUser)
		resetDirtyTracking(normalized)
		dispatch({
			type: 'SET_STATE',
			payload: normalized,
		})
		await refreshPeerSnapshots()
		return true
	}

	function newGame() {
		const defaultBudgets = comfortableEntertainmentDefaults({ title: 'Odd Jobs', base: 600 }, cityData[3])
		const startingMarketPrices = initializeMarketPrices()
		const freshState = {
			id: state.id,
			username: state.username || state.currentUser,
			check: 1200.0,
			savings: 0,
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
			name: state.username || state.currentUser || 'Player',
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
			jobUpgradeBoostMonths: 0,
			payRaiseBoostMonths: 0,
			credentialBoostMonths: 0,
			perfectChecksBoostMonths: 0,
			aiCoachSnapshot: null,
			aiCoachGeneratedMonth: 0,
			aiCoachGeneratedYear: 0,
			workPenaltyPercent: 0,
			celebration: null,
			paymentStreak: 0,
			calculationStreak: 0,
			monthlyCheckSuccesses: 0,
			monthlyCheckFailures: 0,
			lifetimeCheckSuccesses: 0,
			lifetimeCheckFailures: 0,
			debtDelinquencyStreak: 0,
			creditAccountAgeMonths: 0,
			creditInquiryQueue: [],
			lastPaymentOnTime: true,
			skippedPaymentThisMonth: false,
			lastNegotiationMonth: null,
			lastNegotiationYear: null,
			lastAutoBumpMonth: 2,
			lastAutoBumpYear: 2026,
			currentUser: state.currentUser,
			authToken: state.authToken,
			ownsVehicle: null,
			garage: [],
			marketPrices: startingMarketPrices,
			marketPricesPrevious: startingMarketPrices,
			marketPriceHistory: appendMarketPriceHistory([], startingMarketPrices, 2, 2026),
			portfolio: [],
			learningLevel: 'adult',
			usePlainLanguage: false,
			marketLearningLevel: 'adult',
			marketUsePlainLanguage: false,
			realEstateLearningLevel: 'adult',
			realEstateUsePlainLanguage: false,
			economyOverrides: { ...DEFAULT_ECONOMY_OVERRIDES },
			economyOverrideMonthsRemaining: 0,
			historicalEconomicEvent: null,
			historicalEventResetNextMonth: false,
			pendingAdminGifts: [],
			autoInvest: {
				enabled: false,
				monthlyAmount: 0,
				profileId: 'balanced'
			},
			stockInvestedThisMonth: 0,
			stockInvestedLastMonth: 0,
			realEstateMarket: {},
			realEstateMarketMeta: defaultRealEstateMeta(),
			investmentProperties: [],
			pendingRealEstateDeals: [],
			realEstateLastMonthIncome: 0,
			realEstateLastMonthExpenses: 0,
			realEstateLastMonthPropertyBreakdown: [],
			totalGasPaid: 0,
			totalUtilitiesPaid: 0,
			maxMonthlyLuxuryEventSpend: 0,
			achievementsUnlocked: [],
			achievementHistory: [],
			rewardTokens: 0,
			rewardCategoryQueue: [],
			lastAchievementCategory: null,
			unlockedThemes: ['default'],
			activeTheme: 'default',
			rewardHistory: [],
			jobMigrationBanner: null,
			mathLabLastSolvedMonth: null,
			mathLabLastSolvedYear: null,
			mathLabStreak: 0,
			isAdmin: Boolean(state.isAdmin)
		}
		const seededSharedMarket = syncSharedRealEstateMarket(freshState, false)
		freshState.realEstateMarket = seededSharedMarket.market
		freshState.realEstateMarketMeta = seededSharedMarket.meta
		resetDirtyTracking(freshState)
		dispatch({ type: 'SET_STATE', payload: freshState })
		
		// Build the initial month's ledger from the server
		buildLedger(0, 0, freshState)
		saveGame(freshState)
		
		return true
	}

	async function login(username: string, password?: string) {
		const normalizedUsername = String(username || '').trim()
		const normalizedPassword = String(password || '')
		if (!normalizedUsername || !normalizedPassword) {
			return { ok: false, error: 'Username and password are required.' }
		}

		let result: AuthResult
		try {
			result = await authenticateUser(normalizedUsername, normalizedPassword)
		} catch (e) {
			console.error('Authentication request failed', e)
			return { ok: false, error: 'Unable to reach server.' }
		}

		if (!result.ok) return result

		const data = result.data

		dispatch({
			type: 'SET_STATE',
			payload: (() => {
				const normalized = normalizeLoadedUserState(data, state, data.username || normalizedUsername)
				resetDirtyTracking(normalized)
				return normalized
			})()
		})

		buildLedger(0, 0, data)
		refreshPeerSnapshots()

		return { ok: true }
	}

	async function createUser(username: string, password?: string) {
		const normalizedUsername = String(username || '').trim()
		const normalizedPassword = String(password || '')
		if (!normalizedUsername || !normalizedPassword) {
			return { ok: false, error: 'Username and password are required.' }
		}

		let result: AuthResult
		try {
			result = await registerUser(normalizedUsername, normalizedPassword)
		} catch (e) {
			console.error('Registration request failed', e)
			return { ok: false, error: 'Unable to reach server.' }
		}

		if (!result.ok) return result

		const data = result.data

		dispatch({
			type: 'SET_STATE',
			payload: (() => {
				const normalized = normalizeLoadedUserState(data, state, data.username || normalizedUsername)
				resetDirtyTracking(normalized)
				return normalized
			})()
		})

		buildLedger(0, 0, data)
		refreshPeerSnapshots()

		return { ok: true }
	}

	async function logout() {
		const snapshot = stateRef.current
		if (snapshot?.id && snapshot?.currentUser) {
			await saveGame(snapshot)
		}
		if (saveInFlightRef.current) {
			try {
				await saveInFlightRef.current
			} catch {
				// Ignore final-save errors so logout can proceed.
			}
		}
		resetDirtyTracking({})
		dispatch({ type: 'SET_STATE', payload: { currentUser: null, isAdmin: false, authToken: null } })
	}

	async function listUsersForAdmin() {
		if (!state.id || !state.isAdmin || !state.authToken) return null
		return fetchAdminUsers(String(state.authToken))
	}

	async function saveUserAsAdmin(
		targetUserId: string,
		changes: {
			checking: number
			savings: number
			debt: number
			isAdmin: boolean
			username?: string
			name?: string
			password?: string
			jobTitle?: string
			economyOverrides?: {
				recessionSeverity: number
				inflationPressure: number
				jobAvailability: number
				marketVolatility: number
				nextMonthStockShock: number
			}
			economyApplyMonths?: number
			historicalEconomicEvent?: HistoricalEconomicEventState | null
			historicalEventResetNextMonth?: boolean
		},
	) {
		if (!state.id || !state.isAdmin || !state.authToken) return null
		return adminUpdateUserById(targetUserId, String(state.authToken), changes)
	}

	async function deleteUserAsAdmin(targetUserId: string) {
		if (!state.id || !state.isAdmin || !state.authToken) return false
		return adminDeleteUserById(targetUserId, String(state.authToken))
	}

	async function sendAdminGift(targetUserId: string, amount: number, templateId: string) {
		if (!state.id || !state.isAdmin || !state.authToken) {
			return { ok: false, error: 'Admin authentication required.' }
		}
		const result = await adminGiftUserById(targetUserId, String(state.authToken), {
			amount: Math.max(0, Number(amount || 0)),
			templateId: String(templateId || '').trim(),
		})
		if (!result.ok) return result

		const updatedSelf = await fetchUserById(state.id)
		if (updatedSelf) {
			const normalized = normalizeLoadedUserState(updatedSelf, stateRef.current, state.currentUser || state.username || 'Player')
			resetDirtyTracking(normalized)
			dispatch({ type: 'SET_STATE', payload: normalized })
		}
		await refreshPeerSnapshots()
		return { ok: true }
	}

	useEffect(() => {
		if (!state.currentUser || !state.id) return
		const timer = setTimeout(() => {
			if (dirtyStateKeysRef.current.size === 0) return
			void saveGame(stateRef.current)
		}, 700)
		return () => clearTimeout(timer)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state])

	useEffect(() => {
		if (saveStatus !== 'saved') return
		const timer = setTimeout(() => {
			setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev))
		}, 1800)
		return () => clearTimeout(timer)
	}, [saveStatus])

	function triggerCelebration(event: 'pay-bump' | 'degree' | 'certification' | 'car-paid-off' | 'debt-paid-off' | 'promotion' | 'job-accepted' | 'achievement' | 'rainbow') {
		dispatch({ type: 'TRIGGER_CELEBRATION', payload: event })
		// Auto-clear after animation
		setTimeout(() => {
			dispatch({ type: 'CLEAR_CELEBRATION' })
		}, 3500)
	}

	async function applyForJob(job: Job) {
		const activeHistoricalEvent = normalizeHistoricalEconomicEvent(state.historicalEconomicEvent)
		if (activeHistoricalEvent && activeHistoricalEvent.monthsRemaining > 0 && activeHistoricalEvent.effects.jobSearchBlocked) {
			const blockMessage = `Applications paused: ${activeHistoricalEvent.title} is active for ${activeHistoricalEvent.monthsRemaining} more month${activeHistoricalEvent.monthsRemaining === 1 ? '' : 's'}.`
			dispatch({
				type: 'SET_STATE',
				payload: {
					logs: [
						...(Array.isArray(state.logs) ? state.logs : []),
						{ date: `${state.month}/${state.year}`, msg: `⛔ ${blockMessage}` },
					],
				},
			})
			return { ok: false, reason: 'historical-event-hiring-freeze', message: blockMessage }
		}

		const result = await applyForJobOnServer(state, job.title)
		if (!result) {
			return { ok: false, reason: 'network-error', message: 'Unable to apply right now. Please try again.' }
		}

		const mergedLogs = Array.isArray(result.logEntries)
			? [...(Array.isArray(state.logs) ? state.logs : []), ...result.logEntries]
			: Array.isArray(result.logs)
				? result.logs
				: state.logs

		dispatch({
			type: 'SET_STATE',
			payload: {
				applications: Array.isArray(result.applications) ? result.applications : state.applications,
				logs: mergedLogs,
			},
		})

		const latestLogMessage = Array.isArray(result.logEntries) && result.logEntries.length
			? String(result.logEntries[result.logEntries.length - 1]?.msg || '')
			: ''

		if (result.applied) {
			return {
				ok: true,
				reason: 'applied',
				message: latestLogMessage || `Applied for ${job.title}`,
			}
		}

		return {
			ok: false,
			reason: String(result.reason || 'ineligible'),
			message: latestLogMessage || `Application blocked for ${job.title}`,
		}
	}

	function refreshRealEstateMarket() {
		const latest = syncSharedRealEstateMarket(state, false)
		dispatch({ type: 'SET_STATE', payload: { realEstateMarket: latest.market, realEstateMarketMeta: latest.meta } })
		return latest.market
	}

	function submitRealEstateOffer(listing: any, options?: { downPaymentPct?: number; purchaseMode?: 'cash' | 'mortgage'; mortgageTermYears?: 15 | 30 }) {
		if (!listing?.id || !listing?.cityName) return { ok: false, reason: 'invalid-listing' }
		const shared = syncSharedRealEstateMarket(state, false)
		const market = shared.market
		const meta = shared.meta
		const cityListings = Array.isArray(market[listing.cityName]) ? market[listing.cityName] : []
		const stillAvailable = cityListings.some((l: any) => l.id === listing.id)
		if (!stillAvailable) {
			dispatch({ type: 'SET_STATE', payload: { realEstateMarket: market, realEstateMarketMeta: meta } })
			return { ok: false, reason: 'listing-unavailable' }
		}

		const nextCityListings = cityListings.filter((l: any) => l.id !== listing.id)
		const nextMarket = { ...market, [listing.cityName]: nextCityListings }
		const nextMeta = meta
		writeSharedRealEstateMarket(nextMarket)
		writeSharedRealEstateMeta(nextMeta)

		const credit = Number(state.credit || 600)
		const approvalMonthsRequired = Math.max(1, Math.round(4 - Math.min(1.5, (credit - 580) / 220)))
		const downPaymentPct = Math.max(0.1, Math.min(0.5, Number(options?.downPaymentPct || 0.25)))
		const purchaseMode = options?.purchaseMode === 'cash' ? 'cash' : 'mortgage'
		const mortgageTermYears = options?.mortgageTermYears === 15 ? 15 : 30

		const nextDeals = [
			...(Array.isArray(state.pendingRealEstateDeals) ? state.pendingRealEstateDeals : []),
			{
				id: `offer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
				createdMonth: state.month,
				createdYear: state.year,
				monthsInPipeline: 0,
				approvalMonthsRequired,
				downPaymentPct,
				purchaseMode,
				mortgageTermYears,
				listing
			}
		]

		dispatch({
			type: 'SET_STATE',
			payload: {
				realEstateMarket: nextMarket,
				realEstateMarketMeta: nextMeta,
				pendingRealEstateDeals: nextDeals,
				logs: [
					...(Array.isArray(state.logs) ? state.logs : []),
					{
						date: `${state.month}/${state.year}`,
						msg: `📝 Offer submitted: ${listing.templateName} in ${listing.cityName} (${purchaseMode === 'cash' ? 'cash offer' : `${Math.round(downPaymentPct * 100)}% down, ${mortgageTermYears}y`})`
					}
				]
			}
		})

		return { ok: true }
	}

	function sellInvestmentProperty(propertyId: string) {
		const properties = Array.isArray(state.investmentProperties) ? state.investmentProperties : []
		const property = properties.find((p: any) => p.id === propertyId)
		if (!property) return { ok: false, reason: 'not-found' }

		const salePrice = round2(Math.max(50000, Number(property.propertyValue || 0) * 0.98))
		const transactionCosts = round2(salePrice * 0.04)
		const loanBalance = Math.max(0, Number(property.loanBalance || 0))
		const netAfterLoan = round2(salePrice - transactionCosts - loanBalance)

		let check = Number(state.check || 0)
		let debt = Number(state.debt || 0)
		if (netAfterLoan >= 0) check = round2(check + netAfterLoan)
		else debt = round2(debt + Math.abs(netAfterLoan))

		const listing = {
			id: `re-resale-${property.id}-${Date.now()}`,
			cityName: property.cityName,
			templateId: property.templateId,
			templateName: property.templateName,
			assetClass: property.assetClass || 'Residential',
			incomeLabel: property.incomeLabel || 'Monthly Rent',
			units: Math.max(1, Number(property.units || 1)),
			askingPrice: salePrice,
			askingRentPerUnit: round2(Math.max(300, Number(property.rentPerUnit || property.marketRentPerUnit || 1200))),
			amenities: Array.isArray(property.amenities) ? property.amenities : [],
			dom: 0,
			condition: Math.max(25, Math.min(100, Math.round(Number(property.condition || 70)))),
			ownershipCount: Math.max(0, Math.floor(Number(property.ownershipCount || 0))),
			foreclosure: false,
			listedByUser: state.currentUser || null
		}

		const shared = syncSharedRealEstateMarket(state, false)
		const market = shared.market
		const meta = shared.meta
		market[property.cityName] = [...(Array.isArray(market[property.cityName]) ? market[property.cityName] : []), listing]
		writeSharedRealEstateMarket(market)
		writeSharedRealEstateMeta(meta)

		dispatch({
			type: 'SET_STATE',
			payload: {
				check,
				debt,
				investmentProperties: properties.filter((p: any) => p.id !== propertyId),
				realEstateMarket: market,
				realEstateMarketMeta: meta,
				logs: [
					...(Array.isArray(state.logs) ? state.logs : []),
					{
						date: `${state.month}/${state.year}`,
						msg: `🏷️ Sold ${property.templateName} for $${salePrice.toLocaleString()} and relisted to market.${netAfterLoan >= 0 ? ` Net proceeds +$${netAfterLoan.toLocaleString()}.` : ` Shortfall added to debt: $${Math.abs(netAfterLoan).toLocaleString()}.`}`
					}
				]
			}
		})

		return { ok: true }
	}

	function getLuxuryServiceMonthlyPay(serviceId: string) {
		const netMonthlyIncome = totalMonthlyIncomeForLuxuryPricing(state)
		const propertyCount = Array.isArray(state.investmentProperties) ? state.investmentProperties.length : 0
		return calculateLuxuryServiceMonthlyPay(serviceId, netMonthlyIncome, { propertyCount })
	}

	return (
		<GameContext.Provider value={{ state, dispatch, buildLedger, checkRow, processMonth, applyForJob, openSettlement, evaluateApplications, acceptJob, triggerCelebration, jobBoard, cityData, lifeEvents, transitOptions, academyCourses, gameValues, calculateDynamicAPR, calculateCreditBonus, calculatePayNegotiationModifier, calculateRelocationCost, saveGame, loadGame, spinRewardWheel, newGame, login, createUser, logout, listUsersForAdmin, saveUserAsAdmin, deleteUserAsAdmin, sendAdminGift, vehicleDatabase, calculateVehicleValue, calculateMonthlyPayment, calculateMonthlyGasCost, calculateMonthlyMaintenanceCost, getJobEligibility, getJobOpenings, getLuxuryServiceMonthlyPay, refreshRealEstateMarket, submitRealEstateOffer, sellInvestmentProperty, cityUserCounts, affluenceComparison, refreshPeerSnapshots, ledgerEventNotifications, dequeueLedgerEventNotification, saveStatus, lastSavedAt }}>
			{children}
		</GameContext.Provider>
	)
}

export function useGame() {
	return useContext(GameContext)
}

export default GameContext
