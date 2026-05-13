
import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'

export default function Ledger({ ledger, onCheck, format, isAdmin }: any) {
  const { state, listUsersForAdmin, sendAdminGift } = useGame()
  const fmt = format || ((n: number) => n.toFixed(2))
  // show the Auto Check button only during development or for admins
  const showAutoCheck = isAdmin || import.meta.env.DEV || (import.meta.env.VITE_SHOW_AUTO_CHECK === 'true')
  const allChecksCompleted = Array.isArray(ledger) && ledger.length > 0 && ledger.every((tx: any) => Boolean(tx?.done))
  const [giftUsers, setGiftUsers] = useState<any[]>([])
  const [giftLoaded, setGiftLoaded] = useState(false)
  const [giftTargetId, setGiftTargetId] = useState('')
  const [giftAmount, setGiftAmount] = useState('')
  const [giftTemplate, setGiftTemplate] = useState('job')
  const [giftSending, setGiftSending] = useState(false)
  const [giftFeedback, setGiftFeedback] = useState('')

  const giftTemplates = useMemo(() => ([
    { id: 'job', label: 'Congrats: New Job' },
    { id: 'graduation', label: 'Congrats: Graduation' },
    { id: 'car', label: 'Congrats: New Car' },
    { id: 'promotion', label: 'Congrats: Promotion' },
    { id: 'certification', label: 'Congrats: Certification' },
    { id: 'streak', label: 'Congrats: Strong Streak' },
    { id: 'recovery-grant', label: 'Historical: Recovery Grant' },
    { id: 'hardship-relief', label: 'Historical: Hardship Relief' },
    { id: 'transition-support', label: 'Historical: Workforce Transition Support' },
    { id: 'milestone', label: 'General Milestone' },
  ]), [])

  useEffect(() => {
    if (!state?.isAdmin || !allChecksCompleted || giftLoaded) return
    let cancelled = false
    listUsersForAdmin().then((users: any) => {
      if (cancelled || !Array.isArray(users)) return
      const filtered = users.filter((u: any) => String(u?.id || '') !== String(state?.id || ''))
      setGiftUsers(filtered)
      if (!giftTargetId && filtered.length > 0) setGiftTargetId(String(filtered[0].id || ''))
      setGiftLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [state?.isAdmin, state?.id, allChecksCompleted, giftLoaded, giftTargetId, listUsersForAdmin])

  const handleSendGift = async () => {
    const amount = Number(giftAmount || 0)
    if (!allChecksCompleted) {
      setGiftFeedback('Complete every ledger check before sending gifts.')
      return
    }
    if (!giftTargetId) {
      setGiftFeedback('Select a recipient first.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setGiftFeedback('Enter a valid gift amount greater than zero.')
      return
    }
    if (Number(state?.check || 0) - amount < 0) {
      setGiftFeedback('Gift blocked: this amount would make checking negative.')
      return
    }

    setGiftSending(true)
    setGiftFeedback('')
    const chosenTemplate = giftTemplates.find((template) => template.id === giftTemplate) || giftTemplates[giftTemplates.length - 1]
    const result = await sendAdminGift(giftTargetId, amount, chosenTemplate.id)
    setGiftSending(false)

    if (!result?.ok) {
      setGiftFeedback(String(result?.error || 'Unable to send gift right now.'))
      return
    }

    setGiftAmount('')
    setGiftFeedback('Gift sent. Recipient will receive it at the start of their next month.')
  }

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

      {state?.isAdmin ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-bold uppercase text-amber-800">Admin Quick Gift</p>
          <p className="text-xs text-amber-900">Available only after all ledger checks are complete. Gift is delivered to the selected player when they begin next month.</p>
          {!allChecksCompleted ? (
            <p className="text-xs text-rose-700 font-semibold">Finish all ledger checks to unlock gifting.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <select
                value={giftTargetId}
                onChange={(e) => setGiftTargetId(e.target.value)}
                className="p-2 border rounded text-sm bg-white"
              >
                {giftUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                step="1"
                value={giftAmount}
                onChange={(e) => setGiftAmount(e.target.value)}
                placeholder="Gift amount"
                className="p-2 border rounded text-sm"
              />
              <select
                value={giftTemplate}
                onChange={(e) => setGiftTemplate(e.target.value)}
                className="p-2 border rounded text-sm bg-white"
              >
                {giftTemplates.map((template) => (
                  <option key={template.id} value={template.id}>{template.label}</option>
                ))}
              </select>
              <button
                onClick={handleSendGift}
                disabled={giftSending || !giftTargetId}
                className="px-3 py-2 rounded bg-amber-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {giftSending ? 'Sending...' : 'Send Gift'}
              </button>
            </div>
          )}
          {giftFeedback ? <p className="text-xs font-semibold text-amber-900">{giftFeedback}</p> : null}
        </div>
      ) : null}

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
