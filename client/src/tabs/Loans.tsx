import { useGame } from '../context/GameContext'
import gameValues from '../constants/gameValues.constants'

export default function Loans() {
  const { state } = useGame()
  const monthlyInterest = state.debt * (gameValues.loanAPR / 12)
  
  // Estimate payoff time with constant payments (assuming average monthly surplus)
  // This is a rough estimate; real payoff depends on monthly income/expenses
  const avgMonthlySurplus = 500 // Conservative estimate
  const monthsToPayoff = avgMonthlySurplus > 0 ? Math.ceil(state.debt / avgMonthlySurplus) : Infinity
  const payoffYear = state.year + Math.floor((state.month + monthsToPayoff) / 12)
  const payoffMonth = ((state.month + monthsToPayoff - 1) % 12) + 1

  return (
    <div className="space-y-6">
      {state.debt > 0 ? (
        <>
          <div className="glass p-6">
            <h2 className="text-2xl font-bold mb-4">Outstanding Loan</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-slate-600">Balance:</span>
                <span className="font-bold text-lg text-rose-600">${state.debt.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-slate-600">APR:</span>
                <span className="font-bold">{(gameValues.loanAPR * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-slate-600">Monthly Interest Charged:</span>
                <span className="font-bold text-rose-500">${monthlyInterest.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 p-3 rounded-lg border border-amber-200">
                <span className="text-slate-700 font-semibold">Estimated Payoff Date:</span>
                <span className="font-bold text-lg">
                  {monthsToPayoff === Infinity ? 'Never (no surplus)' : `${payoffMonth}/${payoffYear}`}
                </span>
              </div>
            </div>
          </div>

          <div className="glass p-6">
            <h3 className="text-lg font-bold mb-4">📋 Loan Details</h3>
            <div className="text-sm text-slate-600 space-y-2">
              <p>
                <strong>How it works:</strong> Your loan accrues interest at {(gameValues.loanAPR * 100).toFixed(2)}% APR, calculated monthly. 
                This means each month, ${monthlyInterest.toFixed(2)} is added to your outstanding balance.
              </p>
              <p>
                <strong>How to pay it off:</strong> Use the settlement screen to allocate funds toward debt payment. 
                Increase your monthly surplus by earning more income or reducing expenses.
              </p>
              <p>
                <strong>Payoff estimate:</strong> Based on a conservative estimated monthly surplus of ${avgMonthlySurplus}, 
                you could pay off this loan in approximately {monthsToPayoff === Infinity ? 'infinity' : monthsToPayoff} months.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="glass p-6 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-emerald-600 mb-2">Debt Free!</h2>
          <p className="text-slate-600">You have no outstanding loans. Keep up the good financial habits!</p>
        </div>
      )}
    </div>
  )
}
