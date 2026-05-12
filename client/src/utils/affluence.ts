export type PeerAffluence = {
  user: string
  affluence: number
  stats: WealthStats
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

export function getWealthStats(snapshot: any): WealthStats {
  return {
    annualIncome: Math.round(estimateAnnualIncome(snapshot) * 100) / 100,
    checking: Math.round(toNumber(snapshot?.check) * 100) / 100,
    savings: Math.round(toNumber(snapshot?.savings) * 100) / 100,
    investedStocks: Math.round(estimateInvestedStocks(snapshot) * 100) / 100,
    carsOwned: Array.isArray(snapshot?.garage) ? snapshot.garage.length : 0,
    luxuryServicesOwned: countLuxuryServices(snapshot)
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
      luxuryServicesOwned: 0
    }
  }

  const totals = peers.reduce((acc, peer) => {
    acc.annualIncome += peer.stats.annualIncome
    acc.checking += peer.stats.checking
    acc.savings += peer.stats.savings
    acc.investedStocks += peer.stats.investedStocks
    acc.carsOwned += peer.stats.carsOwned
    acc.luxuryServicesOwned += peer.stats.luxuryServicesOwned
    return acc
  }, {
    annualIncome: 0,
    checking: 0,
    savings: 0,
    investedStocks: 0,
    carsOwned: 0,
    luxuryServicesOwned: 0
  })

  const count = peers.length
  return {
    annualIncome: Math.round((totals.annualIncome / count) * 100) / 100,
    checking: Math.round((totals.checking / count) * 100) / 100,
    savings: Math.round((totals.savings / count) * 100) / 100,
    investedStocks: Math.round((totals.investedStocks / count) * 100) / 100,
    carsOwned: Math.round((totals.carsOwned / count) * 10) / 10,
    luxuryServicesOwned: Math.round((totals.luxuryServicesOwned / count) * 10) / 10
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
    })
  }

  peersByUser.set(currentUserId || String(currentUser), {
    user: String(currentUser),
    affluence: currentAffluence,
    stats: currentStats,
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
    topPeers: sorted.slice(0, 10)
  }
}
