
import { useGame } from '../context/GameContext'
import SaveManager from './SaveManager'
import { getAffluenceComparisonFromState } from '../utils/affluence'

export default function Header({ state, onVerify, verifyEnabled }: any) {
  const { logout } = useGame()
  const affluence = getAffluenceComparisonFromState(state)
  const meterMax = Math.max(1, affluence.top.affluence, affluence.average, affluence.currentAffluence)
  const currentWidth = Math.min(100, (affluence.currentAffluence / meterMax) * 100)
  const averageWidth = Math.min(100, (affluence.average / meterMax) * 100)

  return (
    <header className="p-5 bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-[98vw] mx-auto flex justify-between items-center">
        <div className="flex gap-8">
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Checking</span>
            <p className="text-2xl font-bold text-slate-800">${state.check.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Savings</span>
            <p className="text-2xl font-bold text-blue-600">${state.savings.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Debt</span>
            <p className="text-2xl font-bold text-rose-600">${state.debt.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-bold uppercase block">Credit</span>
            <p className="text-2xl font-bold text-indigo-600">{state.credit}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
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
          <div className="text-right mr-4">
            <span className="bg-slate-800 text-white px-3 py-1.5 rounded text-[11px] font-bold uppercase">{state.city.name}</span>
            <p className="text-base font-bold text-slate-500">{new Date(state.year, state.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <div className="xl:hidden mt-2 w-[170px] ml-auto bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
              <p className="text-[10px] font-bold text-slate-600">Affluence #{affluence.rank}/{affluence.count}</p>
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div className="h-1 bg-emerald-500 rounded-full" style={{ width: `${currentWidth}%` }} />
              </div>
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div className="h-1 bg-sky-500 rounded-full" style={{ width: `${averageWidth}%` }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveManager />
            <button onClick={() => logout()} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-50 text-rose-600 hover:bg-rose-100">Logout</button>
            <button onClick={onVerify} disabled={!verifyEnabled} className={`px-6 py-3 rounded-xl text-sm font-bold uppercase transition-all ${verifyEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>Verify Journal</button>
          </div>
        </div>
      </div>
    </header>
  )
}
