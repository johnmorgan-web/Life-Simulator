import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { achievementRules, cosmeticThemes, rewardWheelPrizePools, type AchievementRule, type RewardPrize } from '../constants/achievements.constants'
import vehicleDatabase from '../constants/vehicleDatabase.constants'

type GenericState = Record<string, unknown>

type RewardHistoryEntry = {
  month: number
  year: number
  label: string
  category: string
}

type TierStack = {
  key: string
  category: AchievementRule['category']
  metric: AchievementRule['metric']
  ticker?: string
  currentValue: number
  unlockedCount: number
  currentTier: AchievementRule
  nextTier: AchievementRule | null
  pctToNext: number
  tiers: AchievementRule[]
}

const wheelPalette = ['#f97316', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#14b8a6', '#8b5cf6']

function getLiquidityTier(check: number, savings: number): 'starter' | 'growth' | 'established' | 'elite' {
  const liquidity = Number(check || 0) + Number(savings || 0)
  if (liquidity < 10000) return 'starter'
  if (liquidity < 50000) return 'growth'
  if (liquidity < 250000) return 'established'
  return 'elite'
}

function filterPrizePoolByTier(pool: RewardPrize[], tier: 'starter' | 'growth' | 'established' | 'elite') {
  const caps = tier === 'starter'
    ? { maxCash: 600, maxStockShares: 1, allowVehicle: false }
    : tier === 'growth'
      ? { maxCash: 1200, maxStockShares: 3, allowVehicle: false }
      : tier === 'established'
        ? { maxCash: 3000, maxStockShares: 6, allowVehicle: true }
        : { maxCash: Number.POSITIVE_INFINITY, maxStockShares: Number.POSITIVE_INFINITY, allowVehicle: true }

  return pool.filter((prize) => {
    if (prize.kind === 'theme') return true
    if (prize.kind === 'vehicle') return caps.allowVehicle
    if (prize.kind === 'cash') return Number(prize.value || 0) <= caps.maxCash
    if (prize.kind === 'stock') return Number(prize.shares || 0) <= caps.maxStockShares
    return true
  })
}

function canOperateVehicleByCredentials(vehicleId: string, credentials: string[]) {
  const vehicle = vehicleDatabase.vehicles.find((v: any) => v.id === vehicleId)
  if (!vehicle) return false
  const requiredCredentials = Array.isArray((vehicle as any).requiredCredentials)
    ? (vehicle as any).requiredCredentials.map((cred: any) => String(cred)).filter((cred: string) => !!cred)
    : []
  if (requiredCredentials.length === 0) return true
  const owned = new Set((credentials || []).map((c) => String(c)))
  return requiredCredentials.some((cred: string) => owned.has(cred))
}

function filterPrizePoolByVehicleLicense(pool: RewardPrize[], credentials: string[]) {
  return pool.filter((prize) => {
    if (prize.kind !== 'vehicle') return true
    if (!prize.vehicleId) return true
    return canOperateVehicleByCredentials(prize.vehicleId, credentials)
  })
}

function weightedChoiceIndex(pool: RewardPrize[]) {
  const totalWeight = pool.reduce((sum, p) => sum + Number(p.weight || 1), 0)
  let roll = Math.random() * totalWeight
  for (let i = 0; i < pool.length; i += 1) {
    roll -= Number(pool[i].weight || 1)
    if (roll <= 0) return i
  }
  return Math.max(0, pool.length - 1)
}

function wheelGradient(pool: RewardPrize[]) {
  if (!pool.length) return 'conic-gradient(#cbd5e1 0deg 360deg)'
  const seg = 360 / pool.length
  const slices: string[] = []
  for (let i = 0; i < pool.length; i += 1) {
    const start = i * seg
    const end = start + seg
    const color = wheelPalette[i % wheelPalette.length]
    slices.push(`${color} ${start}deg ${end}deg`)
  }
  return `conic-gradient(${slices.join(', ')})`
}

function metricValue(rule: AchievementRule, state: GenericState) {
  switch (rule.metric) {
    case 'vehiclesOwned':
      return Array.isArray(state.garage) ? state.garage.length : 0
    case 'calculationStreak':
      return Number(state.calculationStreak || 0)
    case 'relocationCount':
      return (Array.isArray(state.logs) ? state.logs : []).filter((l) => {
        const item = l as { msg?: string }
        return String(item?.msg || '').includes('Relocated to ')
      }).length
    case 'lifestyleServices':
      return Object.values((state.luxuryServices || {}) as Record<string, unknown>).filter(Boolean).length
    case 'stockUnrealizedGain': {
      const prices = (state.marketPrices || {}) as Record<string, number>
      const portfolio = Array.isArray(state.portfolio) ? state.portfolio as Array<{ ticker?: string; shares?: number; avgCost?: number }> : []
      const marketValue = portfolio.reduce((sum, h) => sum + Number(h.shares || 0) * Number(prices[h.ticker || ''] || 0), 0)
      const costBasis = portfolio.reduce((sum, h) => sum + Number(h.shares || 0) * Number(h.avgCost || 0), 0)
      return marketValue - costBasis
    }
    case 'tenureMonths':
      return Number(state.tenure || 0)
    case 'credentialsCount':
      return Array.isArray(state.credentials) ? state.credentials.length : 0
    case 'netWorth': {
      const prices = (state.marketPrices || {}) as Record<string, number>
      const portfolio = Array.isArray(state.portfolio) ? state.portfolio as Array<{ ticker?: string; shares?: number }> : []
      const marketValue = portfolio.reduce((sum, h) => sum + Number(h.shares || 0) * Number(prices[h.ticker || ''] || 0), 0)
      const houseValue = Number(((state.house as { value?: number } | undefined)?.value) || 0)
      return Number(state.check || 0) + Number(state.savings || 0) + houseValue + marketValue - Number(state.debt || 0)
    }
    case 'tickerShares': {
      const ticker = String(rule.ticker || '')
      const portfolio = Array.isArray(state.portfolio) ? state.portfolio as Array<{ ticker?: string; shares?: number }> : []
      const holding = portfolio.find((h) => h.ticker === ticker)
      return Number(holding?.shares || 0)
    }
    case 'singleStockShares': {
      const portfolio = Array.isArray(state.portfolio) ? state.portfolio as Array<{ shares?: number }> : []
      return portfolio.reduce((max, h) => Math.max(max, Number(h.shares || 0)), 0)
    }
    case 'lifetimeGasPaid':
      return Number(state.totalGasPaid || 0)
    case 'lifetimeUtilitiesPaid':
      return Number(state.totalUtilitiesPaid || 0)
    case 'ticketStubCount':
      return Array.isArray(state.entertainmentTicketStubs) ? state.entertainmentTicketStubs.length : 0
    case 'monthlyLuxuryEventSpend':
      return Number(state.maxMonthlyLuxuryEventSpend || 0)
    default:
      return 0
  }
}

function tierLabel(metric: AchievementRule['metric'], ticker?: string) {
  const labels: Record<string, string> = {
    vehiclesOwned: 'Vehicle Collection',
    calculationStreak: 'Ledger Accuracy Streak',
    relocationCount: 'Relocation Journey',
    lifestyleServices: 'Lifestyle Services',
    stockUnrealizedGain: 'Stock Unrealized Gain',
    tickerShares: ticker ? `${ticker} Share Ladder` : 'Single Ticker Share Ladder',
    singleStockShares: 'Single Stock Share Count',
    tenureMonths: 'Career Tenure',
    credentialsCount: 'Credentials Earned',
    netWorth: 'Net Worth',
    lifetimeGasPaid: 'Lifetime Gas Payments',
    lifetimeUtilitiesPaid: 'Lifetime Utilities Payments',
    ticketStubCount: 'Luxury Event Ticket Stubs',
    monthlyLuxuryEventSpend: 'Monthly Luxury Event Spend'
  }
  return labels[metric] || metric
}

export default function Rewards() {
  const { state, dispatch, spinRewardWheel } = useGame()
  const [wheelRotation, setWheelRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const typedState = state as GenericState
  const unlockedSet = new Set<string>(Array.isArray(typedState.achievementsUnlocked) ? typedState.achievementsUnlocked as string[] : [])
  const unlockedThemes = Array.isArray(state.unlockedThemes) ? state.unlockedThemes : ['default']
  const rewardHistory: RewardHistoryEntry[] = Array.isArray(state.rewardHistory) ? state.rewardHistory as RewardHistoryEntry[] : []
  const rewardCategoryQueue = Array.isArray((state as any).rewardCategoryQueue) ? (state as any).rewardCategoryQueue as string[] : []
  const queuedCategory = rewardCategoryQueue[0] || null
  const wheelCategory = String(queuedCategory || state.lastAchievementCategory || 'default')
  const basePool = (rewardWheelPrizePools[wheelCategory] || rewardWheelPrizePools.default) as RewardPrize[]
  const liquidityTier = getLiquidityTier(Number(state.check || 0), Number(state.savings || 0))
  const credentials = Array.isArray((state as any).credentials) ? ((state as any).credentials as string[]) : []
  const tierPool = filterPrizePoolByTier(basePool, liquidityTier)
  const prizePool = filterPrizePoolByVehicleLicense(tierPool, credentials)
  const activePrizePool = prizePool.length > 0 ? prizePool : basePool
  const segmentAngle = activePrizePool.length > 0 ? 360 / activePrizePool.length : 360

  const findPrizeIndex = (prize: any) => {
    if (!prize || activePrizePool.length === 0) return -1
    return activePrizePool.findIndex((candidate: any) => {
      if (candidate.kind !== prize.kind) return false
      if (candidate.kind === 'cash') return Number(candidate.value) === Number(prize.value)
      if (candidate.kind === 'theme') return String(candidate.value) === String(prize.value)
      if (candidate.kind === 'stock') {
        return String(candidate.ticker) === String(prize.ticker) && Number(candidate.shares) === Number(prize.shares)
      }
      return candidate.kind === 'vehicle'
    })
  }

  const handleAnimatedSpin = async () => {
    if (isSpinning || Number(state.rewardTokens || 0) <= 0 || activePrizePool.length === 0) return
    setIsSpinning(true)

    const result = await spinRewardWheel()
    const selectedPrize = result?.prize
    let winningIndex = findPrizeIndex(selectedPrize)
    if (winningIndex < 0) winningIndex = weightedChoiceIndex(activePrizePool)

    const centerAngle = (winningIndex * segmentAngle) + (segmentAngle / 2)
    const normalizedCurrent = ((wheelRotation % 360) + 360) % 360
    const desiredFinal = (360 - centerAngle) % 360
    const delta = (desiredFinal - normalizedCurrent + 360) % 360
    const nextRotation = wheelRotation + (360 * 6) + delta

    setWheelRotation(nextRotation)

    window.setTimeout(() => {
      setIsSpinning(false)
    }, 4200)
  }

  const tierStacks = useMemo(() => {
    const grouped = new Map<string, AchievementRule[]>()
    for (const rule of achievementRules) {
      const key = `${rule.category}:${rule.metric}:${rule.ticker || 'none'}`
      const rules = grouped.get(key) || []
      rules.push(rule)
      grouped.set(key, rules)
    }

    const stacks: TierStack[] = []
    for (const [key, rules] of grouped.entries()) {
      const sorted = [...rules].sort((a, b) => a.threshold - b.threshold)
      const currentValue = metricValue(sorted[0], typedState)
      const unlockedCount = sorted.filter((r) => unlockedSet.has(r.id)).length
      const currentTier = unlockedCount > 0 ? sorted[Math.min(unlockedCount - 1, sorted.length - 1)] : sorted[0]
      const nextTier = unlockedCount < sorted.length ? sorted[unlockedCount] : null
      const startThreshold = unlockedCount > 0 ? sorted[Math.max(0, unlockedCount - 1)].threshold : 0
      const endThreshold = nextTier ? nextTier.threshold : currentTier.threshold
      const rawPct = endThreshold > startThreshold
        ? ((Number(currentValue) - startThreshold) / (endThreshold - startThreshold)) * 100
        : 100
      const pctToNext = Math.max(0, Math.min(100, nextTier ? rawPct : 100))

      stacks.push({
        key,
        category: sorted[0].category,
        metric: sorted[0].metric,
        ticker: sorted[0].ticker,
        currentValue,
        unlockedCount,
        currentTier,
        nextTier,
        pctToNext,
        tiers: sorted
      })
    }

    return stacks.sort((a, b) => a.category.localeCompare(b.category))
  }, [typedState, unlockedSet])

  const liquidity = Number(state.check || 0) + Number(state.savings || 0)
  const tierMeta = {
    starter: { label: 'Starter', next: 10000 },
    growth: { label: 'Growth', next: 50000 },
    established: { label: 'Established', next: 250000 },
    elite: { label: 'Elite', next: null as number | null }
  }[liquidityTier]

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h2 className="text-2xl font-bold mb-1">🎁 Achievements & Rewards</h2>
        <p className="text-sm text-slate-600">Unlock milestones, earn reward spins, and customize your simulator look.</p>
      </div>

      <div className="glass p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400">Unlocked Achievements</p>
          <p className="text-2xl font-bold text-emerald-700">{unlockedSet.size}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400">Reward Spins</p>
          <p className="text-2xl font-bold text-violet-700">{Number(state.rewardTokens || 0)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400">Active Theme</p>
          <p className="text-xl font-bold text-slate-800">{cosmeticThemes[state.activeTheme || 'default']?.name || 'Classic Red'}</p>
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-3">🎰 Roulette Wheel</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <div className="flex flex-col items-center">
            <div className="roulette-stage mb-3">
              <div className="roulette-pointer" />
              <div
                className={`roulette-wheel ${isSpinning ? 'roulette-wheel-spinning' : ''}`}
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  backgroundImage: wheelGradient(activePrizePool)
                }}
              />
              <div className="roulette-center-dot" />
            </div>

            <button
              onClick={handleAnimatedSpin}
              disabled={Number(state.rewardTokens || 0) <= 0 || isSpinning}
              className={`px-4 py-2 rounded text-sm font-bold ${Number(state.rewardTokens || 0) > 0 && !isSpinning ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {isSpinning ? 'Spinning...' : 'Spin Reward Wheel'}
            </button>
          </div>

          <div>
            <p className="text-xs uppercase font-bold text-slate-500 mb-2">Current Prize Pool ({wheelCategory})</p>
            <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p><span className="font-bold">Roulette tier:</span> {tierMeta.label} • Liquidity ${liquidity.toLocaleString()}</p>
              <p className="mt-1">
                {tierMeta.next
                  ? `Next tier at $${tierMeta.next.toLocaleString()} (need $${Math.max(0, tierMeta.next - liquidity).toLocaleString()} more)`
                  : 'Top tier reached. Full roulette pool unlocked.'}
              </p>
              <p className="mt-1">
                {queuedCategory
                  ? `Next spin category from queue: ${queuedCategory}`
                  : 'No category queue pending; using latest achievement category fallback.'}
              </p>
            </div>
            <div className="space-y-2 mb-3">
              {activePrizePool.map((prize, idx) => (
                <div key={`${prize.label}-${idx}`} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm flex items-center gap-3">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: wheelPalette[idx % wheelPalette.length] }}
                    aria-hidden="true"
                  />
                  <span
                    className="font-bold"
                    style={{ color: wheelPalette[idx % wheelPalette.length] }}
                  >
                    {prize.label}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-xs text-slate-500">The wheel uses weighted segments, and the awarded prize is exactly what your wheel lands on.</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center mt-4 mb-3">
          <button
            onClick={async () => {
              if (isSpinning || Number(state.rewardTokens || 0) <= 0) return
              setIsSpinning(true)
              await spinRewardWheel()
              setIsSpinning(false)
            }}
            disabled={Number(state.rewardTokens || 0) <= 0 || isSpinning}
            className={`px-3 py-1 rounded text-xs font-bold ${Number(state.rewardTokens || 0) > 0 && !isSpinning ? 'bg-slate-700 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            Quick Spin (No Animation)
          </button>
          <span className="text-xs text-slate-500">Prize pool now follows queued achievement categories one token at a time.</span>
        </div>
        <div className="space-y-2">
          {rewardHistory.slice(0, 8).map((entry, idx) => (
            <div key={`${entry.month}-${entry.year}-${idx}`} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm flex justify-between">
              <span className="font-bold text-slate-700">{entry.label}</span>
              <span className="text-slate-500">{entry.category} • {entry.month}/{entry.year}</span>
            </div>
          ))}
          {rewardHistory.length === 0 && (
            <p className="text-sm text-slate-500">No spins yet. Unlock achievements to earn roulette tokens.</p>
          )}
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-3">🎨 Theme Customization</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(cosmeticThemes).map(([id, theme]) => {
            const unlocked = unlockedThemes.includes(id)
            const active = (state.activeTheme || 'default') === id
            return (
              <button
                key={id}
                onClick={() => unlocked && dispatch({ type: 'SET_STATE', payload: { activeTheme: id } })}
                disabled={!unlocked}
                className={`text-left border rounded-lg p-3 ${active ? 'ring-2 ring-slate-800' : ''} ${unlocked ? 'bg-white' : 'bg-slate-100 opacity-60 cursor-not-allowed'}`}
              >
                <div
                  className="h-14 rounded-md border mb-2"
                  style={{
                    backgroundImage: `${theme.pattern}, ${theme.gradient}`,
                    backgroundSize: '16px 16px, cover',
                    borderColor: theme.glassBorder
                  }}
                />
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-800">{theme.name}</p>
                  <span className="inline-block w-5 h-5 rounded-full" style={{ background: theme.accent }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">{unlocked ? (active ? 'Active' : 'Unlocked') : 'Locked'}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-3">🏆 Tiered Achievement Board</h3>
        <div className="space-y-3">
          {tierStacks.map((stack) => (
            <div key={stack.key} className="border rounded-lg p-3 bg-white">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-bold text-slate-900">{tierLabel(stack.metric)}</p>
                  {stack.ticker ? <p className="text-[11px] text-slate-400">Ticker: {stack.ticker}</p> : null}
                  <p className="text-xs text-slate-500">Current value: {Number(stack.currentValue).toLocaleString()}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                  Tier {stack.unlockedCount}/{stack.tiers.length}
                </span>
              </div>

              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-2 rounded-full bg-sky-500" style={{ width: `${stack.pctToNext}%` }} />
              </div>

              {stack.nextTier ? (
                <p className="text-[11px] text-slate-500 mt-1">
                  Progress to next tier: {Number(stack.currentValue).toLocaleString()} / {Number(stack.nextTier.threshold).toLocaleString()} ({stack.nextTier.title})
                </p>
              ) : (
                <p className="text-[11px] text-emerald-600 mt-1 font-bold">Max tier completed: {stack.currentTier.title}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {stack.tiers.map((tier, idx) => {
                  const unlocked = unlockedSet.has(tier.id)
                  const isCurrentGoal = !unlocked && stack.nextTier?.id === tier.id
                  return (
                    <span
                      key={tier.id}
                      className={`text-[11px] px-2 py-1 rounded border ${unlocked ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : isCurrentGoal ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                    >
                      T{idx + 1}: {tier.title}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
