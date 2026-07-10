
import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { achievementRules } from '../constants/achievements.constants'

function formatHeaderCurrency(value: number, viewportWidth: number) {
  const abs = Math.abs(Number(value || 0))
  const full = Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const compactThreshold = viewportWidth < 480
    ? 1000
    : viewportWidth < 768
      ? 10000
      : viewportWidth < 1024
        ? 100000
        : viewportWidth < 1400
          ? 250000
          : 1000000000
  const maxChars = viewportWidth < 480 ? 9 : viewportWidth < 768 ? 10 : viewportWidth < 1024 ? 12 : 14

  if (abs >= compactThreshold || full.length > maxChars) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(value)
  }

  return full
}

export default function Header({ state, onVerify, verifyEnabled }: any) {
  const { logout, saveStatus } = useGame()
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1280)
  const activeHistoricalEvent = state?.historicalEconomicEvent && Number(state.historicalEconomicEvent?.monthsRemaining || 0) > 0
    ? state.historicalEconomicEvent
    : null
  const logoutDisabled = saveStatus === 'saving'
  const amountTextClass = 'font-bold leading-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis text-[clamp(0.72rem,1.9vw,1.3rem)]'

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const profileStudioSnapshot = useMemo(() => {
    const unlocked = new Set(Array.isArray(state.achievementsUnlocked) ? state.achievementsUnlocked : [])
    const totalAchievements = achievementRules.length
    const unlockedAchievements = achievementRules.reduce((sum, rule) => sum + (unlocked.has(rule.id) ? 1 : 0), 0)
    const completionPct = Math.max(0, Math.min(100, Math.round((unlockedAchievements / Math.max(1, totalAchievements)) * 100)))
    const credentialsCount = Array.isArray(state.credentials) ? state.credentials.length : 0
    const vehiclesCount = Array.isArray(state.garage) ? state.garage.length : 0
    const badgesCount = Array.isArray(state.subscriptionBadges) ? state.subscriptionBadges.length : 0
    return {
      completionPct,
      credentialsCount,
      vehiclesCount,
      badgesCount,
    }
  }, [state.achievementsUnlocked, state.credentials, state.garage, state.subscriptionBadges])

  return (
    <header className="p-3 sm:p-5 bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[98vw] mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-8 w-full lg:w-auto">
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Checking</span>
            <p title={Number(state.check || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className={`${amountTextClass} text-slate-800`}>{formatHeaderCurrency(state.check, viewportWidth)}</p>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Savings</span>
            <p title={Number(state.savings || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className={`${amountTextClass} text-blue-600`}>{formatHeaderCurrency(state.savings, viewportWidth)}</p>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Debt</span>
            <p title={Number(state.debt || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className={`${amountTextClass} text-rose-600`}>{formatHeaderCurrency(state.debt, viewportWidth)}</p>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Credit</span>
            <p className="text-lg sm:text-2xl font-bold text-indigo-600 leading-tight">{state.credit}</p>
          </div>
        </div>
        <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:items-start lg:items-center gap-3 sm:gap-4">
          <div className="hidden lg:block min-w-[220px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-slate-500">Profile Studio</p>
            <p className="text-xs font-bold text-slate-700">{profileStudioSnapshot.completionPct}% achievement completion</p>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
              <div className="h-1.5 bg-amber-500 rounded-full" style={{ width: `${profileStudioSnapshot.completionPct}%` }} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              🎓 {profileStudioSnapshot.credentialsCount} • 🚗 {profileStudioSnapshot.vehiclesCount} • 🔰 {profileStudioSnapshot.badgesCount}
            </p>
          </div>
          <div className="text-left sm:text-right mr-0 sm:mr-2">
            <span className="bg-slate-800 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase">{state.city.name}</span>
            <p className="text-base font-bold text-slate-500">{new Date(state.year, state.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => logout()}
              disabled={logoutDisabled}
              className={`flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold ${logoutDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
            >
              {logoutDisabled ? 'Saving...' : 'Logout'}
            </button>
            <button onClick={onVerify} disabled={!verifyEnabled} className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 rounded-xl text-sm font-bold uppercase transition-all ${verifyEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>Verify Journal</button>
          </div>
        </div>
      </div>
      {activeHistoricalEvent ? (
        <div className="max-w-[98vw] mx-auto mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase text-amber-800 tracking-wide">Historical Reenactment Active</p>
          <p className="text-sm font-semibold text-amber-900 mt-1">
            {String(activeHistoricalEvent.title || 'Economic Scenario')} ({String(activeHistoricalEvent.era || 'Historical')})
          </p>
          <p className="text-xs text-amber-800 mt-1">
            {String(activeHistoricalEvent.summary || 'This scenario is currently modifying your financial conditions.')}
          </p>
          {String(activeHistoricalEvent.realWorldImpact || '').trim() ? (
            <p className="text-xs text-amber-900 mt-1">
              {String(activeHistoricalEvent.realWorldImpact || '').trim()}
            </p>
          ) : null}
          <p className="text-xs font-semibold text-amber-900 mt-1">
            {Number(activeHistoricalEvent.monthsRemaining || 0)} month(s) remaining out of {Number(activeHistoricalEvent.totalMonths || 0)}.
          </p>
          {Array.isArray(activeHistoricalEvent.keyStatistics) && activeHistoricalEvent.keyStatistics.length > 0 ? (
            <div className="mt-2">
              <p className="text-[11px] font-bold uppercase text-amber-800 tracking-wide">Historical Stats</p>
              <ul className="mt-1 list-disc ml-5 text-xs text-amber-900 space-y-1">
                {activeHistoricalEvent.keyStatistics.slice(0, 3).map((stat: string) => (
                  <li key={stat}>{stat}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
