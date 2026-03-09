import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { achievementRules, cosmeticThemes } from '../constants/achievements.constants'

type GenericState = Record<string, unknown>

type RewardHistoryEntry = {
  month: number
  year: number
  label: string
  category: string
}

function metricValue(rule: (typeof achievementRules)[number], state: GenericState) {
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
      return Number(state.check || 0) + Number(state.save || 0) + Number(state.house?.value || 0) + marketValue - Number(state.debt || 0)
    }
    default:
      return 0
  }
}

export default function Rewards() {
  const { state, dispatch } = useGame()
  const typedState = state as GenericState
  const unlockedSet = new Set<string>(Array.isArray(typedState.achievementsUnlocked) ? typedState.achievementsUnlocked as string[] : [])
  const unlockedThemes = Array.isArray(state.unlockedThemes) ? state.unlockedThemes : ['default']
  const rewardHistory: RewardHistoryEntry[] = Array.isArray(state.rewardHistory) ? state.rewardHistory as RewardHistoryEntry[] : []

  const progressRows = useMemo(() => {
    return achievementRules.map((rule) => {
      const current = metricValue(rule, typedState)
      const pct = Math.max(0, Math.min(100, (Number(current) / Math.max(1, Number(rule.threshold))) * 100))
      const unlocked = unlockedSet.has(rule.id)
      return { rule, current, pct, unlocked }
    })
  }, [typedState, unlockedSet])

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
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <button
            onClick={() => dispatch({ type: 'SPIN_REWARD_WHEEL' })}
            disabled={Number(state.rewardTokens || 0) <= 0}
            className={`px-4 py-2 rounded text-sm font-bold ${Number(state.rewardTokens || 0) > 0 ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            Spin Reward Wheel
          </button>
          <span className="text-xs text-slate-500">Prize pool adapts to your latest achievement category.</span>
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
        <h3 className="font-bold text-lg mb-3">🏆 Achievement Board</h3>
        <div className="space-y-3">
          {progressRows.map(({ rule, current, pct, unlocked }) => (
            <div key={rule.id} className="border rounded-lg p-3 bg-white">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-bold text-slate-900">{rule.title}</p>
                  <p className="text-xs text-slate-500">{rule.description}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${unlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {unlocked ? 'Unlocked' : `+${rule.tokenReward} spin`}
                </span>
              </div>
              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-2 rounded-full ${unlocked ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${unlocked ? 100 : pct}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Progress: {Number(current).toLocaleString()} / {Number(rule.threshold).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
