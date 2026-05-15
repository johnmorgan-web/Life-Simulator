
import { useGame } from '../context/GameContext'

function formatHeaderCurrency(value: number) {
  const abs = Math.abs(Number(value || 0))
  if (abs >= 1000000000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(value)
  }
  return Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export default function Header({ state, onVerify, verifyEnabled }: any) {
  const { logout, affluenceComparison: affluence, saveStatus, lastSavedAt } = useGame()
  const activeHistoricalEvent = state?.historicalEconomicEvent && Number(state.historicalEconomicEvent?.monthsRemaining || 0) > 0
    ? state.historicalEconomicEvent
    : null
  const logoutDisabled = saveStatus === 'saving'
  const meterMax = Math.max(1, affluence.top.affluence, affluence.average, affluence.currentAffluence)
  const currentWidth = Math.max(0, Math.min(100, (affluence.currentAffluence / meterMax) * 100))
  const averageWidth = Math.max(0, Math.min(100, (affluence.average / meterMax) * 100))
  const saveIndicator = (() => {
    if (!state?.currentUser) return null
    if (saveStatus === 'saving') {
      return { label: 'Saving...', className: 'bg-amber-100 text-amber-800 border-amber-200' }
    }
    if (saveStatus === 'error') {
      return { label: 'Save Failed', className: 'bg-rose-100 text-rose-700 border-rose-200' }
    }
    if (saveStatus === 'saved') {
      return { label: 'Saved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    }
    if (lastSavedAt) {
      return { label: 'Save Ready', className: 'bg-slate-100 text-slate-600 border-slate-200' }
    }
    return { label: 'Ready', className: 'bg-slate-100 text-slate-600 border-slate-200' }
  })()

  return (
    <header className="p-3 sm:p-5 bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[98vw] mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-8 w-full lg:w-auto">
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Checking</span>
            <p title={Number(state.check || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-base sm:text-lg xl:text-2xl font-bold text-slate-800 leading-tight truncate">{formatHeaderCurrency(state.check)}</p>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Savings</span>
            <p title={Number(state.savings || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-base sm:text-lg xl:text-2xl font-bold text-blue-600 leading-tight truncate">{formatHeaderCurrency(state.savings)}</p>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Debt</span>
            <p title={Number(state.debt || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="text-base sm:text-lg xl:text-2xl font-bold text-rose-600 leading-tight truncate">{formatHeaderCurrency(state.debt)}</p>
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Credit</span>
            <p className="text-lg sm:text-2xl font-bold text-indigo-600 leading-tight">{state.credit}</p>
          </div>
        </div>
        <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:items-start lg:items-center gap-3 sm:gap-4">
          <div className="hidden xl:block min-w-[250px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-slate-500">Affluence Rank</p>
            <p className="text-xs font-bold text-slate-700 mb-1">
              #{affluence.rank}/{affluence.count} | {affluence.percentile}th percentile
            </p>
            <div className="space-y-1">
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${currentWidth}%` }} />
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-1.5 bg-sky-500 rounded-full" style={{ width: `${averageWidth}%` }} />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Green: you | Blue: average</p>
          </div>
          <div className="text-left sm:text-right mr-0 sm:mr-2">
            <span className="bg-slate-800 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase">{state.city.name}</span>
            <p className="text-base font-bold text-slate-500">{new Date(state.year, state.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            {saveIndicator ? (
              <div className={`mt-1 inline-flex items-center px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wide ${saveIndicator.className}`}>
                {saveIndicator.label}
              </div>
            ) : null}
            <div className="xl:hidden mt-2 w-[170px] sm:ml-auto bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <p className="text-[10px] font-bold text-slate-600">Affluence #{affluence.rank}/{affluence.count}</p>
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div className="h-1 bg-emerald-500 rounded-full" style={{ width: `${currentWidth}%` }} />
              </div>
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div className="h-1 bg-sky-500 rounded-full" style={{ width: `${averageWidth}%` }} />
              </div>
            </div>
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
