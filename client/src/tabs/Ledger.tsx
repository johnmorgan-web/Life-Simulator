
export default function Ledger({ ledger, onCheck, format, isAdmin }: any) {
  const fmt = format || ((n: number) => n.toFixed(2))
  // show the Auto Check button only during development or for admins
  const showAutoCheck = isAdmin || import.meta.env.DEV || (import.meta.env.VITE_SHOW_AUTO_CHECK === 'true')
  return (
    <div className="glass p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
        <h3 className="font-bold">Ledger</h3>
        {showAutoCheck && (
          <button onClick={() => {
            ledger.forEach((tx: any) => {
              if (!tx.done) onCheck(tx.id, tx.bal, tx.bal)
            })
          }} className="py-2 px-3 bg-slate-900 text-white rounded">Auto Check</button>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {ledger.map((tx: any) => (
          <div key={`card-${tx.id}`} className={`rounded-xl border border-slate-200 bg-white p-3 ${tx.done ? 'opacity-60' : ''}`}>
            <p className="text-xs font-bold text-slate-700 mb-2">{tx.desc}</p>
            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Debit</p>
                <p className="font-bold text-rose-500">{tx.type === 'out' ? '-' + fmt(tx.amt) : '--'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Credit</p>
                <p className="font-bold text-emerald-600">{tx.type === 'inc' ? '+' + fmt(tx.amt) : '--'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                key={`mobile-inp-${tx.id}-${tx.bal}-${tx.done}`}
                id={`inp-mobile-${tx.id}`}
                type="number"
                step="0.00"
                className={`flex-1 p-2 border rounded text-right font-bold ${tx.done ? 'correct' : 'border-slate-300 focus:border-slate-500 focus:ring-slate-200'}`}
                defaultValue={tx.done ? tx.bal.toFixed(2) : ''}
                disabled={tx.done}
                placeholder="Running balance"
              />
              <button onClick={() => {
                const el = (document.getElementById(`inp-mobile-${tx.id}`) as HTMLInputElement)
                const v = parseFloat(el.value)
                onCheck(tx.id, v)
              }} className="text-[11px] font-bold text-blue-600 px-2 py-1 rounded bg-blue-50">CHECK</button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left min-w-[720px]">
        <thead className="text-[10px] text-slate-400 uppercase font-bold">
          <tr>
            <th className="py-2">Description</th>
            <th className="text-right py-2">Debit</th>
            <th className="text-right py-2">Credit</th>
            <th className="text-right py-2">Running Balance</th>
            <th></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ledger.map((tx: any) => (
            <tr key={tx.id} className={`${tx.done ? 'opacity-50' : ''}`}>
              <td className="py-4 text-xs font-bold text-slate-700">{tx.desc}</td>
              <td className="text-right text-rose-500 font-bold">{tx.type === 'out' ? '-' + fmt(tx.amt) : ''}</td>
              <td className="text-right text-emerald-600 font-bold">{tx.type === 'inc' ? '+' + fmt(tx.amt) : ''}</td>
              <td className="text-right">
                <input
                  key={`inp-${tx.id}-${tx.bal}-${tx.done}`}
                  id={`inp-${tx.id}`}
                  type="number"
                  step="0.00"
                  className={`w-24 p-1 border-b text-right font-bold ${tx.done ? 'correct' :  'border-slate-300 focus:border-slate-500 focus:ring-slate-200'}`}
                  defaultValue={tx.done ? tx.bal.toFixed(2) : ''}
                  disabled={tx.done}
                />
              </td>
              <td className="text-right">
                <button onClick={() => {
                  const el = (document.getElementById(`inp-${tx.id}`) as HTMLInputElement)
                  const v = parseFloat(el.value)
                  onCheck(tx.id, v)
                }} className="ml-2 text-[10px] font-bold text-blue-500">CHECK</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
