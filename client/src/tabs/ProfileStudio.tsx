import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { achievementRules } from '../constants/achievements.constants'

type StudioMetric = 'wealth' | 'credentials' | 'vehicles' | 'accuracy' | 'tenure' | 'recognition'

type StudioPeer = {
  user: string
  affluence: number
  featuredBadgeId: string | null
  badges: Array<{
    id: string
    label: string
    description: string
    icon: string
    source: 'achievement' | 'subscription'
    priority: number
  }>
  stats: {
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
}

type LaneCard = {
  title: string
  icon: string
  subtitle: string
  unlocked: number
  total: number
}

const quickMetricChips: Array<{ id: StudioMetric; label: string; icon: string }> = [
  { id: 'recognition', label: 'Recognition', icon: '🏅' },
  { id: 'wealth', label: 'Affluence', icon: '💵' },
  { id: 'credentials', label: 'Credentials', icon: '🎓' },
  { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { id: 'accuracy', label: 'Accuracy', icon: '🧮' },
  { id: 'tenure', label: 'Tenure', icon: '💼' },
]

const recognitionHelpText = 'Recognition Score = achievements unlocked + (subscription badges x 2). Higher score ranks first. If tied, higher affluence wins.'

function formatCompactCurrency(value: number) {
  const amount = Number(value || 0)
  const full = amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  if (Math.abs(amount) >= 100000 || full.length > 12) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(amount)
  }
  return full
}

function scoreForMetric(peer: StudioPeer, metric: StudioMetric) {
  if (metric === 'wealth') return Number(peer.affluence || 0)
  if (metric === 'credentials') return Number(peer.stats?.credentialsCount || 0)
  if (metric === 'vehicles') return Number(peer.stats?.carsOwned || 0)
  if (metric === 'accuracy') return Number(peer.stats?.calculationAccuracy || 0)
  if (metric === 'tenure') return Number(peer.stats?.tenureMonths || 0)
  return Number(peer.stats?.achievementsCount || 0) + (Number(peer.stats?.subscriptionBadgeCount || 0) * 2)
}

function metricLabel(metric: StudioMetric) {
  if (metric === 'wealth') return 'Affluence'
  if (metric === 'credentials') return 'Credentials'
  if (metric === 'vehicles') return 'Vehicles Owned'
  if (metric === 'accuracy') return 'Ledger Accuracy %'
  if (metric === 'tenure') return 'Career Tenure (months)'
  return 'Recognition Score'
}

function metricDisplayValue(metric: StudioMetric, peer: StudioPeer) {
  if (metric === 'wealth') {
    return formatCompactCurrency(Number(peer.affluence || 0))
  }
  if (metric === 'accuracy') {
    return `${Number(peer.stats?.calculationAccuracy || 0).toFixed(1)}%`
  }
  if (metric === 'tenure') {
    return `${Math.round(Number(peer.stats?.tenureMonths || 0))} mo`
  }
  return String(Math.round(scoreForMetric(peer, metric)))
}

function orderedBadges(peer: StudioPeer) {
  const all = Array.isArray(peer.badges) ? [...peer.badges] : []
  const featuredId = String(peer.featuredBadgeId || '').trim()
  const sorted = all.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || a.label.localeCompare(b.label))
  if (!featuredId) return sorted.slice(0, 5)

  const featured = sorted.find((badge) => badge.id === featuredId)
  const rest = sorted.filter((badge) => badge.id !== featuredId)
  if (!featured) return sorted.slice(0, 5)
  return [featured, ...rest].slice(0, 5)
}

function CoinHeap({ label, affluence, maxAffluence, accent, stats, userLabel }: {
  label: string
  affluence: number
  maxAffluence: number
  accent: string
  userLabel: string
  stats: {
    annualIncome: number
    checking: number
    savings: number
    investedStocks: number
    carsOwned: number
    luxuryServicesOwned: number
    credentialsCount: number
    tenureMonths: number
    calculationAccuracy: number
  }
}) {
  const coins = Math.max(4, Math.round((Math.max(0, affluence) / Math.max(1, maxAffluence)) * 18))
  const format = (amount: number) => formatCompactCurrency(amount)

  return (
    <div className="relative group glass p-4 border border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-100">
      <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-800 mb-2">{userLabel}</p>
      <div className="min-h-[96px] flex flex-wrap-reverse content-end gap-1">
        {Array.from({ length: coins }).map((_, i) => (
          <span
            key={`${label}-${i}`}
            className="coin-dot"
            style={{
              backgroundColor: accent,
              opacity: 0.72 + ((i % 5) * 0.05),
            }}
          />
        ))}
      </div>
      <p className="text-sm font-bold mt-2 text-slate-900">{format(affluence)}</p>

      <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute z-20 left-2 right-2 top-2 bg-slate-900 text-white rounded-xl p-3 shadow-2xl">
        <p className="text-xs font-bold mb-2">{label} Snapshot</p>
        <div className="text-[11px] space-y-1">
          <p>Annual Income: <span className="font-bold">{format(stats.annualIncome)}</span></p>
          <p>Checking: <span className="font-bold">{format(stats.checking)}</span></p>
          <p>Savings: <span className="font-bold">{format(stats.savings)}</span></p>
          <p>Stocks Invested: <span className="font-bold">{format(stats.investedStocks)}</span></p>
          <p>Cars Owned: <span className="font-bold">{stats.carsOwned}</span></p>
          <p>Credentials: <span className="font-bold">{stats.credentialsCount}</span></p>
          <p>Accuracy: <span className="font-bold">{stats.calculationAccuracy.toFixed(1)}%</span></p>
          <p>Tenure: <span className="font-bold">{Math.round(stats.tenureMonths)} mo</span></p>
        </div>
      </div>
    </div>
  )
}

export default function ProfileStudio() {
  const { state, dispatch, saveGame, affluenceComparison: comparison } = useGame()
  const [leaderboardMetric, setLeaderboardMetric] = useState<StudioMetric>('recognition')

  const achievementCategoryCount = useMemo(() => {
    const unlockedSet = new Set(Array.isArray(state.achievementsUnlocked) ? state.achievementsUnlocked : [])
    const map = new Map<string, { unlocked: number; total: number }>()

    for (const rule of achievementRules) {
      const current = map.get(rule.category) || { unlocked: 0, total: 0 }
      current.total += 1
      if (unlockedSet.has(rule.id)) current.unlocked += 1
      map.set(rule.category, current)
    }
    return map
  }, [state.achievementsUnlocked])

  const laneCards: LaneCard[] = useMemo(() => {
    const learningUnlocked = (achievementCategoryCount.get('education')?.unlocked || 0) + (achievementCategoryCount.get('calculation')?.unlocked || 0)
    const learningTotal = (achievementCategoryCount.get('education')?.total || 0) + (achievementCategoryCount.get('calculation')?.total || 0)
    const careerUnlocked = achievementCategoryCount.get('tenure')?.unlocked || 0
    const careerTotal = achievementCategoryCount.get('tenure')?.total || 0
    const mobilityUnlocked = (achievementCategoryCount.get('vehicles')?.unlocked || 0) + (achievementCategoryCount.get('relocation')?.unlocked || 0)
    const mobilityTotal = (achievementCategoryCount.get('vehicles')?.total || 0) + (achievementCategoryCount.get('relocation')?.total || 0)
    const financeUnlocked = (achievementCategoryCount.get('wealth')?.unlocked || 0) + (achievementCategoryCount.get('stocks')?.unlocked || 0)
    const financeTotal = (achievementCategoryCount.get('wealth')?.total || 0) + (achievementCategoryCount.get('stocks')?.total || 0)
    const lifestyleUnlocked = (achievementCategoryCount.get('lifestyle')?.unlocked || 0) + (achievementCategoryCount.get('entertainment')?.unlocked || 0) + (achievementCategoryCount.get('household')?.unlocked || 0)
    const lifestyleTotal = (achievementCategoryCount.get('lifestyle')?.total || 0) + (achievementCategoryCount.get('entertainment')?.total || 0) + (achievementCategoryCount.get('household')?.total || 0)

    return [
      { title: 'Learning Lane', icon: '🎓', subtitle: `${Array.isArray(state.credentials) ? state.credentials.length : 0} credentials earned`, unlocked: learningUnlocked, total: Math.max(1, learningTotal) },
      { title: 'Career Lane', icon: '💼', subtitle: `${Math.round(Number(state.tenure || 0))} months tenure`, unlocked: careerUnlocked, total: Math.max(1, careerTotal) },
      { title: 'Mobility Lane', icon: '🚗', subtitle: `${Array.isArray(state.garage) ? state.garage.length : 0} vehicles • ${comparison.currentProfile?.relocationCount || 0} relocations`, unlocked: mobilityUnlocked, total: Math.max(1, mobilityTotal) },
      { title: 'Capital Lane', icon: '🏦', subtitle: `${formatCompactCurrency(Number(comparison.currentAffluence || 0))} affluence`, unlocked: financeUnlocked, total: Math.max(1, financeTotal) },
      { title: 'Lifestyle Lane', icon: '✨', subtitle: `${Number(comparison.currentProfile?.luxuryServicesOwned || 0)} active services`, unlocked: lifestyleUnlocked, total: Math.max(1, lifestyleTotal) },
    ]
  }, [achievementCategoryCount, comparison.currentAffluence, comparison.currentProfile, state.credentials, state.garage, state.tenure])

  const leaderboardRows = useMemo(() => {
    const currentUser = String(comparison.currentUser || state.currentUser || 'Current Player')
    const peers = Array.isArray(comparison.allPeers) ? comparison.allPeers as StudioPeer[] : []
    const filtered = peers.filter((peer) => String(peer.user || '').trim().length > 0)

    const sorted = [...filtered].sort((a, b) => {
      const scoreDiff = scoreForMetric(b, leaderboardMetric) - scoreForMetric(a, leaderboardMetric)
      if (scoreDiff !== 0) return scoreDiff
      return Number(b.affluence || 0) - Number(a.affluence || 0)
    })

    return sorted.slice(0, 15).map((peer, idx) => ({
      rank: idx + 1,
      isCurrent: peer.user === currentUser,
      ...peer,
    }))
  }, [comparison.allPeers, comparison.currentUser, leaderboardMetric, state.currentUser])

  const currentUserPeer = useMemo(() => {
    const currentUser = String(comparison.currentUser || state.currentUser || 'Current Player')
    const peers = Array.isArray(comparison.allPeers) ? comparison.allPeers as StudioPeer[] : []
    return peers.find((peer) => peer.user === currentUser) || null
  }, [comparison.allPeers, comparison.currentUser, state.currentUser])

  const recentRecognition = useMemo(() => {
    const achievementFeed = Array.isArray(state.achievementHistory)
      ? state.achievementHistory.map((entry: any) => ({
        id: `ach-${entry.id}-${entry.month}-${entry.year}`,
        title: String(entry.title || 'Achievement unlocked'),
        detail: String(entry.category || 'general'),
        month: Number(entry.month || 0),
        year: Number(entry.year || 0),
        icon: '🏆',
      }))
      : []

    const subscriptionFeed = Array.isArray(state.subscriptionBadges)
      ? state.subscriptionBadges.map((badge: any) => ({
        id: `sub-${badge.id}-${badge.awardedMonth}-${badge.awardedYear}`,
        title: String(badge.name || 'Subscription milestone'),
        detail: `${Number(badge.months || 0)} month streak`,
        month: Number(badge.awardedMonth || 0),
        year: Number(badge.awardedYear || 0),
        icon: String(badge.icon || '🔰'),
      }))
      : []

    return [...achievementFeed, ...subscriptionFeed]
      .sort((a, b) => ((b.year * 12) + b.month) - ((a.year * 12) + a.month))
      .slice(0, 10)
  }, [state.achievementHistory, state.subscriptionBadges])

  const maxAffluence = Math.max(1, Number(comparison.currentAffluence || 0), Number(comparison.average || 0), Number(comparison.top?.affluence || 0))

  const selectFeaturedBadge = (badgeId: string) => {
    if (!badgeId || badgeId === state.featuredBadgeId) return
    dispatch({ type: 'SET_STATE', payload: { featuredBadgeId: badgeId } })
    void saveGame({ ...state, featuredBadgeId: badgeId })
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Profile Studio</h2>
        <p className="text-sm text-slate-600">Your profile now tracks progress across learning, career, mobility, capital, and lifestyle. Leaderboards can be filtered beyond money.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {laneCards.map((lane) => {
          const pct = Math.min(100, Math.round((lane.unlocked / Math.max(1, lane.total)) * 100))
          return (
            <div key={lane.title} className="glass p-4 border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-500">{lane.title}</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{lane.icon} {lane.unlocked}/{lane.total}</p>
              <p className="text-xs text-slate-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{lane.subtitle}</p>
              <div className="h-2 bg-slate-200 rounded-full mt-3 overflow-hidden">
                <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-1">Player Comparison</h3>
        <p className="text-xs text-slate-500 mb-4">Hover each heap to compare annual income, balances, stock investment, cars, credentials, and performance accuracy.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CoinHeap
            label="You"
            userLabel={comparison.currentUser}
            affluence={comparison.currentAffluence}
            maxAffluence={maxAffluence}
            accent="#f59e0b"
            stats={comparison.currentProfile}
          />
          <CoinHeap
            label="Average"
            userLabel="All Players"
            affluence={comparison.average}
            maxAffluence={maxAffluence}
            accent="#eab308"
            stats={comparison.averageProfile}
          />
          <CoinHeap
            label="Wealthiest"
            userLabel={comparison.top.user}
            affluence={comparison.top.affluence}
            maxAffluence={maxAffluence}
            accent="#f97316"
            stats={comparison.topProfile}
          />
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-1">My Recognition Badges</h3>
        <p className="text-xs text-slate-500 mb-3">Select one badge to feature. It will show first and larger next to your name on the leaderboard.</p>
        {currentUserPeer && Array.isArray(currentUserPeer.badges) && currentUserPeer.badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {[...currentUserPeer.badges]
              .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || a.label.localeCompare(b.label))
              .map((badge) => {
                const isFeatured = badge.id === state.featuredBadgeId
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => selectFeaturedBadge(badge.id)}
                    title={`${badge.label}: ${badge.description}`}
                    aria-label={`${badge.label}: ${badge.description}`}
                    className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-bold ${isFeatured ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`}
                  >
                    <span className={`inline-flex items-center justify-center rounded-full ${isFeatured ? 'w-6 h-6 text-base bg-white border border-amber-300' : 'w-5 h-5 text-sm bg-slate-50 border border-slate-200'}`}>
                      {badge.icon}
                    </span>
                    <span className="max-w-[180px] truncate">{badge.label}</span>
                  </button>
                )
              })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No badges unlocked yet. Earn achievements or subscription milestones to populate this list.</p>
        )}
      </div>

      <div className="glass p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-lg">Filterable Leaderboard</h3>
            <p className="text-xs text-slate-500">Rank players by the track you care about.</p>
          </div>
          <label className="text-xs font-bold uppercase text-slate-500">
            Sort Metric
            <select
              value={leaderboardMetric}
              onChange={(e) => setLeaderboardMetric(e.target.value as StudioMetric)}
              className="mt-1 block p-2 border rounded text-sm font-semibold text-slate-800"
            >
              <option value="recognition">Recognition Score</option>
              <option value="wealth">Affluence</option>
              <option value="credentials">Credentials</option>
              <option value="vehicles">Vehicles</option>
              <option value="accuracy">Ledger Accuracy %</option>
              <option value="tenure">Career Tenure</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {quickMetricChips.map((chip) => {
            const active = leaderboardMetric === chip.id
            return (
              <button
                key={chip.id}
                onClick={() => setLeaderboardMetric(chip.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'}`}
              >
                {chip.icon} {chip.label}
              </button>
            )
          })}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 text-xs text-slate-600">
          Active metric:{' '}
          <span className="font-bold inline-flex items-center gap-1.5">
            {metricLabel(leaderboardMetric)}
            {leaderboardMetric === 'recognition' ? (
              <button
                type="button"
                title={recognitionHelpText}
                aria-label={recognitionHelpText}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-400 text-slate-600 text-[10px] leading-none hover:bg-slate-100"
              >
                ?
              </button>
            ) : null}
          </span>{' '}
          • Tie-breaker: Affluence
        </div>

        <div className="space-y-2">
          {leaderboardRows.map((peer) => (
            <div
              key={`${peer.user}-${peer.rank}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 border ${peer.isCurrent ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}
            >
              <div className="min-w-0 pr-3">
                <p className="text-sm font-bold text-slate-800">#{peer.rank} {peer.user}</p>
                {orderedBadges(peer).length > 0 ? (
                  <div className="mt-1 flex items-center gap-1.5 min-w-0">
                    {orderedBadges(peer).map((badge, index) => {
                      const isFeatured = badge.id === peer.featuredBadgeId || (!peer.featuredBadgeId && index === 0)
                      const commonClass = isFeatured
                        ? 'inline-flex items-center justify-center rounded-full border border-amber-400 bg-amber-100 text-base w-8 h-8'
                        : 'inline-flex items-center justify-center rounded-full border border-slate-300 bg-white text-sm w-6 h-6'

                      if (peer.isCurrent) {
                        return (
                          <button
                            key={badge.id}
                            type="button"
                            onClick={() => selectFeaturedBadge(badge.id)}
                            title={`${badge.label}: ${badge.description}`}
                            aria-label={`${badge.label}: ${badge.description}`}
                            className={`${commonClass} shrink-0 hover:border-slate-500`}
                          >
                            <span>{badge.icon}</span>
                          </button>
                        )
                      }

                      return (
                        <span
                          key={badge.id}
                          title={`${badge.label}: ${badge.description}`}
                          aria-label={`${badge.label}: ${badge.description}`}
                          className={`${commonClass} shrink-0`}
                        >
                          <span>{badge.icon}</span>
                        </span>
                      )
                    })}
                  </div>
                ) : null}
                <p className="text-[11px] text-slate-500 truncate">Affluence: {formatCompactCurrency(Number(peer.affluence || 0))}</p>
              </div>
              <div className="text-right min-w-[86px]">
                <p className="text-sm font-bold text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">{metricDisplayValue(leaderboardMetric, peer)}</p>
                {peer.isCurrent ? <p className="text-[11px] font-bold text-amber-700">You</p> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-3">Recent Recognition</h3>
        <div className="space-y-2">
          {recentRecognition.length > 0 ? recentRecognition.map((entry) => (
            <div key={entry.id} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">{entry.icon} {entry.title}</p>
                <p className="text-xs text-slate-500">{entry.detail}</p>
              </div>
              <div className="text-xs font-semibold text-slate-600">M{entry.month}/Y{entry.year}</div>
            </div>
          )) : (
            <p className="text-sm text-slate-500">No recognition events yet. Keep progressing to unlock your first badge.</p>
          )}
        </div>
      </div>
    </div>
  )
}
