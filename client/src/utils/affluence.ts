import { achievementRules } from '../constants/achievements.constants'

export type PeerBadge = {
  id: string
  label: string
  description: string
  icon: string
  source: 'achievement' | 'subscription'
  priority: number
}

export type PeerAffluence = {
  user: string
  affluence: number
  stats: WealthStats
  badges: PeerBadge[]
  featuredBadgeId: string | null
}

type AffluenceComparisonInput = {
  currentState: any
  peerSnapshots?: any[]
}

export type WealthStats = {
  annualIncome: number
  checking: number
  savings: number
  investedStocks: number
  carsOwned: number
  luxuryServicesOwned: number
  credentialsCount: number
  tenureMonths: number
  calculationAccuracy: number
  achievementsCount: number
  subscriptionBadgeCount: number
  relocationCount: number
}

function toNumber(value: any) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function estimateVehicleAssets(garage: any[]) {
  if (!Array.isArray(garage)) return 0
  return garage.reduce((sum: number, vehicle: any) => {
    const currentValue = toNumber(vehicle?.currentValue)
    if (currentValue > 0) return sum + currentValue

    const purchasePrice = toNumber(vehicle?.purchasePrice)
    if (purchasePrice <= 0) return sum

    // Conservative fallback if an explicit current value is not stored.
    return sum + purchasePrice * 0.7
  }, 0)
}

function estimateInvestedStocks(snapshot: any) {
  const portfolio = Array.isArray(snapshot?.portfolio) ? snapshot.portfolio : []
  return portfolio.reduce((sum: number, holding: any) => {
    const shares = toNumber(holding?.shares)
    const avgCost = toNumber(holding?.avgCost)
    return sum + (shares * avgCost)
  }, 0)
}

function estimateAnnualIncome(snapshot: any) {
  const base = toNumber(snapshot?.job?.base)
  const cityMultiplier = toNumber(snapshot?.city?.p) || 1
  const monthlyNet = base * cityMultiplier * 0.8
  return monthlyNet * 12
}

function countLuxuryServices(snapshot: any) {
  const services = snapshot?.luxuryServices
  if (!services || typeof services !== 'object') return 0
  return Object.values(services).filter(Boolean).length
}

function countRelocations(snapshot: any) {
  const logs = Array.isArray(snapshot?.logs) ? snapshot.logs : []
  return logs.filter((entry: any) => String(entry?.msg || '').includes('Relocated to ')).length
}

function calculationAccuracy(snapshot: any) {
  const successes = toNumber(snapshot?.lifetimeCheckSuccesses)
  const failures = toNumber(snapshot?.lifetimeCheckFailures)
  const total = successes + failures
  if (total <= 0) return 0
  return Math.round((successes / total) * 1000) / 10
}

function badgesForSnapshot(snapshot: any): PeerBadge[] {
  const unlockedIds = new Set<string>(Array.isArray(snapshot?.achievementsUnlocked) ? snapshot.achievementsUnlocked : [])
  const categoryIconMap: Record<string, string> = {
    vehicles: '🚗',
    calculation: '🧮',
    relocation: '🧭',
    lifestyle: '✨',
    stocks: '📈',
    tenure: '💼',
    education: '🎓',
    wealth: '💰',
    household: '🏠',
    entertainment: '🎭',
  }
  const achievementBadges: PeerBadge[] = achievementRules
    .filter((rule) => unlockedIds.has(rule.id))
    .map((rule) => ({
      id: `ach:${rule.id}`,
      label: rule.title,
      description: rule.description,
      icon: categoryIconMap[String(rule.category || '')] || '🏆',
      source: 'achievement',
      priority: Number(rule.tokenReward || 1),
    }))

  const subscriptionRaw = Array.isArray(snapshot?.subscriptionBadges) ? snapshot.subscriptionBadges : []
  const subscriptionBadges: PeerBadge[] = subscriptionRaw.map((badge: any) => ({
    id: `sub:${String(badge?.id || badge?.name || 'milestone')}`,
    label: String(badge?.name || 'Subscription Milestone'),
    description: `${Math.max(0, Number(badge?.months || 0))} month subscription streak`,
    icon: (() => {
      const explicit = String(badge?.icon || '').trim()
      if (explicit) return explicit
      const months = Math.max(0, Number(badge?.months || 0))
      if (months >= 24) return '👑'
      if (months >= 12) return '🔥'
      if (months >= 6) return '🌟'
      return '🔰'
    })(),
    source: 'subscription',
    priority: Math.max(1, Math.round(Number(badge?.months || 0) / 3)),
  }))

  const seen = new Set<string>()
  return [...achievementBadges, ...subscriptionBadges]
    .filter((badge) => {
      if (seen.has(badge.id)) return false
      seen.add(badge.id)
      return true
    })
}

function featuredBadgeIdForSnapshot(snapshot: any): string | null {
  const raw = String(snapshot?.featuredBadgeId || '').trim()
  if (!raw) return null
  return raw
}

export function getWealthStats(snapshot: any): WealthStats {
  return {
    annualIncome: Math.round(estimateAnnualIncome(snapshot) * 100) / 100,
    checking: Math.round(toNumber(snapshot?.check) * 100) / 100,
    savings: Math.round(toNumber(snapshot?.savings) * 100) / 100,
    investedStocks: Math.round(estimateInvestedStocks(snapshot) * 100) / 100,
    carsOwned: Array.isArray(snapshot?.garage) ? snapshot.garage.length : 0,
    luxuryServicesOwned: countLuxuryServices(snapshot),
    credentialsCount: Array.isArray(snapshot?.credentials) ? snapshot.credentials.length : 0,
    tenureMonths: Math.max(0, Math.round(toNumber(snapshot?.tenure))),
    calculationAccuracy: calculationAccuracy(snapshot),
    achievementsCount: Array.isArray(snapshot?.achievementsUnlocked) ? snapshot.achievementsUnlocked.length : 0,
    subscriptionBadgeCount: Array.isArray(snapshot?.subscriptionBadges) ? snapshot.subscriptionBadges.length : 0,
    relocationCount: countRelocations(snapshot)
  }
}

function averageStats(peers: PeerAffluence[]): WealthStats {
  if (!peers.length) {
    return {
      annualIncome: 0,
      checking: 0,
      savings: 0,
      investedStocks: 0,
      carsOwned: 0,
      luxuryServicesOwned: 0,
      credentialsCount: 0,
      tenureMonths: 0,
      calculationAccuracy: 0,
      achievementsCount: 0,
      subscriptionBadgeCount: 0,
      relocationCount: 0
    }
  }

  const totals = peers.reduce((acc, peer) => {
    acc.annualIncome += peer.stats.annualIncome
    acc.checking += peer.stats.checking
    acc.savings += peer.stats.savings
    acc.investedStocks += peer.stats.investedStocks
    acc.carsOwned += peer.stats.carsOwned
    acc.luxuryServicesOwned += peer.stats.luxuryServicesOwned
    acc.credentialsCount += peer.stats.credentialsCount
    acc.tenureMonths += peer.stats.tenureMonths
    acc.calculationAccuracy += peer.stats.calculationAccuracy
    acc.achievementsCount += peer.stats.achievementsCount
    acc.subscriptionBadgeCount += peer.stats.subscriptionBadgeCount
    acc.relocationCount += peer.stats.relocationCount
    return acc
  }, {
    annualIncome: 0,
    checking: 0,
    savings: 0,
    investedStocks: 0,
    carsOwned: 0,
    luxuryServicesOwned: 0,
    credentialsCount: 0,
    tenureMonths: 0,
    calculationAccuracy: 0,
    achievementsCount: 0,
    subscriptionBadgeCount: 0,
    relocationCount: 0
  })

  const count = peers.length
  return {
    annualIncome: Math.round((totals.annualIncome / count) * 100) / 100,
    checking: Math.round((totals.checking / count) * 100) / 100,
    savings: Math.round((totals.savings / count) * 100) / 100,
    investedStocks: Math.round((totals.investedStocks / count) * 100) / 100,
    carsOwned: Math.round((totals.carsOwned / count) * 10) / 10,
    luxuryServicesOwned: Math.round((totals.luxuryServicesOwned / count) * 10) / 10,
    credentialsCount: Math.round((totals.credentialsCount / count) * 10) / 10,
    tenureMonths: Math.round((totals.tenureMonths / count) * 10) / 10,
    calculationAccuracy: Math.round((totals.calculationAccuracy / count) * 10) / 10,
    achievementsCount: Math.round((totals.achievementsCount / count) * 10) / 10,
    subscriptionBadgeCount: Math.round((totals.subscriptionBadgeCount / count) * 10) / 10,
    relocationCount: Math.round((totals.relocationCount / count) * 10) / 10
  }
}

export function computeAffluence(snapshot: any) {
  if (!snapshot) return 0

  const check = toNumber(snapshot.check)
  const save = toNumber(snapshot.savings)
  // Treat debt as a burden regardless of stored sign to protect ranking integrity.
  const debt = Math.abs(toNumber(snapshot.debt))

  const vehicleAssets = estimateVehicleAssets(snapshot.garage)
  const investedStocks = estimateInvestedStocks(snapshot)
  const total = check + save + vehicleAssets + investedStocks - debt
  return Math.round(total * 100) / 100
}

export function getAffluenceComparison({ currentState, peerSnapshots = [] }: AffluenceComparisonInput) {
  const currentUser = currentState.currentUser || currentState.username || 'Current Player'
  const currentUserId = String(currentState?.id || '').trim()
  const currentAffluence = computeAffluence(currentState)
  const currentStats = getWealthStats(currentState)

  const peersByUser = new Map<string, PeerAffluence>()

  for (const snapshot of peerSnapshots) {
    const user = String(snapshot?.username || snapshot?.currentUser || '').trim()
    const userId = String(snapshot?.id || '').trim()
    const key = userId || user
    if (!key) continue
    peersByUser.set(key, {
      user,
      affluence: computeAffluence(snapshot),
      stats: getWealthStats(snapshot),
      badges: badgesForSnapshot(snapshot),
      featuredBadgeId: featuredBadgeIdForSnapshot(snapshot),
    })
  }

  peersByUser.set(currentUserId || String(currentUser), {
    user: String(currentUser),
    affluence: currentAffluence,
    stats: currentStats,
    badges: badgesForSnapshot(currentState),
    featuredBadgeId: featuredBadgeIdForSnapshot(currentState),
  })

  const peers = Array.from(peersByUser.values())

  const sorted = peers.slice().sort((a, b) => b.affluence - a.affluence)
  const count = Math.max(1, sorted.length)
  const total = sorted.reduce((sum, p) => sum + p.affluence, 0)
  const average = total / count
  const top = sorted[0] || { user: currentUser, affluence: currentAffluence, stats: currentStats }
  const rankIndex = sorted.findIndex((p) => p.user === currentUser && p.affluence === currentAffluence)
  const rank = rankIndex >= 0 ? rankIndex + 1 : count
  const percentile = Math.max(0, Math.round(((count - rank) / Math.max(1, count - 1)) * 100))
  const averageProfile = averageStats(sorted)
  const currentProfile = sorted.find((p) => p.user === currentUser)?.stats || currentStats

  return {
    currentUser,
    currentAffluence,
    currentProfile,
    average,
    averageProfile,
    top,
    topProfile: top.stats,
    rank,
    count,
    percentile,
    topPeers: sorted.slice(0, 10),
    allPeers: sorted
  }
}
