export type PeerAffluence = {
  user: string
  affluence: number
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

export function computeAffluence(snapshot: any) {
  if (!snapshot) return 0

  const check = toNumber(snapshot.check)
  const save = toNumber(snapshot.save)
  const debt = toNumber(snapshot.debt)
  const houseValue = toNumber(snapshot.house?.value)

  const inventoryValue = Array.isArray(snapshot.inventory)
    ? snapshot.inventory.reduce((sum: number, item: any) => sum + toNumber(item?.price), 0)
    : 0

  const vehicleAssets = estimateVehicleAssets(snapshot.garage)
  const total = check + save + houseValue + inventoryValue + vehicleAssets - debt
  return Math.round(total * 100) / 100
}

function loadLatestSnapshotForUser(user: string) {
  const autosaveRaw = localStorage.getItem(`life-sim:${user}:__autosave__`)
  if (autosaveRaw) {
    try {
      return JSON.parse(autosaveRaw)
    } catch (_e) {
      // Fall through to indexed saves.
    }
  }

  try {
    const saves = JSON.parse(localStorage.getItem(`life-sim:saves:${user}`) || '[]')
    if (!Array.isArray(saves) || saves.length === 0) return null
    const sorted = saves.slice().sort((a: any, b: any) => toNumber(b?.timestamp) - toNumber(a?.timestamp))
    const latestName = sorted[0]?.name
    if (!latestName) return null

    const raw = localStorage.getItem(`life-sim:${user}:${latestName}`)
    return raw ? JSON.parse(raw) : null
  } catch (_e) {
    return null
  }
}

export function getAffluenceComparisonFromState(state: any) {
  const currentUser = state.currentUser || 'Current Player'
  const currentAffluence = computeAffluence(state)

  let users: string[] = []
  try {
    const parsed = JSON.parse(localStorage.getItem('life-sim-keys') || '[]')
    users = Array.isArray(parsed) ? parsed : []
  } catch (_e) {
    users = []
  }

  const peers: PeerAffluence[] = []

  for (const user of users) {
    const snapshot = loadLatestSnapshotForUser(user)
    if (!snapshot) continue
    const affluence = user === currentUser ? currentAffluence : computeAffluence(snapshot)
    peers.push({ user, affluence })
  }

  if (!peers.some((p) => p.user === currentUser)) {
    peers.push({ user: currentUser, affluence: currentAffluence })
  }

  const sorted = peers.slice().sort((a, b) => b.affluence - a.affluence)
  const count = Math.max(1, sorted.length)
  const total = sorted.reduce((sum, p) => sum + p.affluence, 0)
  const average = total / count
  const top = sorted[0] || { user: currentUser, affluence: currentAffluence }
  const rankIndex = sorted.findIndex((p) => p.user === currentUser)
  const rank = rankIndex >= 0 ? rankIndex + 1 : count
  const percentile = Math.max(0, Math.round(((count - rank) / Math.max(1, count - 1)) * 100))

  return {
    currentUser,
    currentAffluence,
    average,
    top,
    rank,
    count,
    percentile,
    topPeers: sorted.slice(0, 5)
  }
}
