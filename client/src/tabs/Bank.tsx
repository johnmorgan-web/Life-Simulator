import { useState } from 'react'
import { useGame } from '../context/GameContext'

function formatCompactCurrency(value: number) {
  const amount = Number(value || 0)
  const full = amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (Math.abs(amount) >= 100000 || full.length > 13) {
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

export default function Bank() {
  const { state, dispatch } = useGame()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState('')

  const handleWithdraw = () => {
    setWithdrawError('')
    setWithdrawSuccess('')
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Enter a valid amount greater than $0.')
      return
    }
    if (amount > state.savings) {
      setWithdrawError(`Insufficient savings. Available: $${state.savings.toFixed(2)}`)
      return
    }
    dispatch({
      type: 'SET_STATE',
      payload: {
        savings: Math.round((state.savings - amount) * 100) / 100,
        check: Math.round((state.check + amount) * 100) / 100,
      }
    })
    setWithdrawAmount('')
    setWithdrawSuccess(`$${amount.toFixed(2)} transferred to checking.`)
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bank</h2>
        <p className="text-sm text-slate-600">Manage your cash flow, transfer funds, and keep your accounts healthy month to month.</p>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-4">🏧 Withdraw from Savings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Savings Balance</p>
            <p title={Number(state.savings || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="block text-[clamp(1rem,2.5vw,1.45rem)] font-bold text-blue-600 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">{formatCompactCurrency(Number(state.savings || 0))}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Checking Balance</p>
            <p title={Number(state.check || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="block text-[clamp(1rem,2.5vw,1.45rem)] font-bold text-slate-800 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">{formatCompactCurrency(Number(state.check || 0))}</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Amount to Withdraw</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={withdrawAmount}
              onChange={e => { setWithdrawAmount(e.target.value); setWithdrawError(''); setWithdrawSuccess('') }}
              placeholder="0.00"
              className="w-full p-3 border rounded-xl font-bold text-slate-800"
            />
          </div>
          <button
            onClick={handleWithdraw}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Withdraw
          </button>
        </div>
        {withdrawError && <p className="mt-2 text-sm text-rose-600 font-semibold">{withdrawError}</p>}
        {withdrawSuccess && <p className="mt-2 text-sm text-emerald-600 font-semibold">✓ {withdrawSuccess}</p>}
        <p className="mt-3 text-xs text-slate-400">Transfers funds from your savings account into checking immediately.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Checking</p>
          <p title={Number(state.check || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="block text-[clamp(1rem,2.3vw,1.4rem)] font-bold text-slate-800 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">{formatCompactCurrency(Number(state.check || 0))}</p>
        </div>
        <div className="glass p-4">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Savings</p>
          <p title={Number(state.savings || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="block text-[clamp(1rem,2.3vw,1.4rem)] font-bold text-blue-600 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">{formatCompactCurrency(Number(state.savings || 0))}</p>
        </div>
        <div className="glass p-4">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Debt</p>
          <p title={Number(state.debt || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="block text-[clamp(1rem,2.3vw,1.4rem)] font-bold text-rose-600 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">{formatCompactCurrency(Number(state.debt || 0))}</p>
        </div>
      </div>

      <div className="glass p-6 space-y-4">
        <h3 className="font-bold text-lg">Monthly Banking Health</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700">
          Total liquid funds: <span title={(Number(state.check || 0) + Number(state.savings || 0)).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="font-bold tabular-nums">{formatCompactCurrency(Number(state.check || 0) + Number(state.savings || 0))}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700">
          Net cash after debt: <span title={(Number(state.check || 0) + Number(state.savings || 0) - Number(state.debt || 0)).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="font-bold tabular-nums">{formatCompactCurrency(Number(state.check || 0) + Number(state.savings || 0) - Number(state.debt || 0))}</span>
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-2">Profile Comparison Moved</h3>
        <p className="text-sm text-slate-600">Detailed player comparison, lane badges, and the filterable leaderboard now live in Profile Studio.</p>
      </div>
    </div>
  )
}
