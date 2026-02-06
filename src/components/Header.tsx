
export default function Header({ state, onVerify, verifyEnabled }: any) {
  return (
    <header className="p-4 bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex gap-8">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Checking</span>
            <p className="text-xl font-bold text-slate-800">${state.check.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Savings</span>
            <p className="text-xl font-bold text-blue-600">${state.save.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Debt</span>
            <p className="text-xl font-bold text-rose-600">${state.debt.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Credit</span>
            <p className="text-xl font-bold text-indigo-600">{state.credit}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="bg-slate-800 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">{state.city.name}</span>
            <p className="text-sm font-bold text-slate-500">{new Date(state.year, state.month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
          </div>
          <button onClick={onVerify} disabled={!verifyEnabled} className={`px-6 py-3 rounded-xl text-xs font-bold uppercase transition-all ${verifyEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>Verify Journal</button>
        </div>
      </div>
    </header>
  )
}
