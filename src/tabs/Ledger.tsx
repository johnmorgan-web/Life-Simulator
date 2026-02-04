import React from 'react'

export default function Ledger({ ledger, onCheck, format }: any) {
  const fmt = format || ((n: number) => n.toFixed(2))
  return (
    <div className="glass p-6">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="font-bold">Ledger</h3>
        <button onClick={() => {
          ledger.forEach((tx: any) => {
            if (!tx.done) onCheck(tx.id, tx.bal)
          })
        }} className="py-2 px-3 bg-slate-900 text-white rounded">Auto Check</button>
      </div>

      <table className="w-full text-left">
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
                <input id={`inp-${tx.id}`} type="number" step="0.01" className={`w-24 p-1 border-b text-right font-bold ${tx.done ? 'correct' : ''}`} defaultValue={tx.done ? tx.bal.toFixed(2) : ''} disabled={tx.done} />
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
  )
}
