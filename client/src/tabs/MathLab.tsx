import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'

type Challenge = {
  id: string
  title: string
  prompt: string
  formula: string
  expected: number
  tolerance: number
  unit: string
  inputs: Array<{ label: string; value: number }>
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function buildChallenges(state: any): Challenge[] {
  const income = Math.max(1200, round2((Number(state?.job?.base || 1500) * Number(state?.city?.p || 1) * 0.8)))
  const debt = Math.max(0, Number(state?.debt || 0))
  const credit = Math.max(300, Math.min(850, Number(state?.credit || 600)))
  const vehiclePayment = Array.isArray(state?.garage)
    ? round2(state.garage.reduce((sum: number, g: any) => sum + (Number(g?.monthsRemaining || 0) > 0 ? Number(g?.monthlyPayment || 0) : 0), 0))
    : 0

  const principal = Math.max(3000, Math.round((income * 4) + (state?.month || 1) * 150))
  const apr = Math.max(0.035, Math.min(0.22, 0.19 - ((credit - 300) / 550) * 0.12))
  const termMonths = 60
  const monthlyRate = apr / 12
  const payment = monthlyRate === 0
    ? principal / termMonths
    : principal * ((monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1))

  const obligations = round2(Math.max(0, vehiclePayment) + Math.max(0, debt * 0.015) + round2(payment))
  const dtiRatio = obligations / Math.max(1, income)

  const oldPayment = round2(payment)
  const newApr = Math.max(0.03, apr - 0.02)
  const newRate = newApr / 12
  const newPayment = newRate === 0
    ? principal / termMonths
    : principal * ((newRate * Math.pow(1 + newRate, termMonths)) / (Math.pow(1 + newRate, termMonths) - 1))
  const closingFees = 850
  const monthlySavings = Math.max(0, round2(oldPayment - newPayment))
  const breakEven = monthlySavings <= 0 ? Infinity : closingFees / monthlySavings

  const fixedCosts = round2((income * 0.5) + (state?.transit?.cost || 0) + (state?.entertainmentSpending || 0) + (state?.subscriptionEntertainmentSpending || 0))
  const liquidAssets = round2(Math.max(0, Number(state?.check || 0)) + Math.max(0, Number(state?.savings || 0)))
  const runway = fixedCosts <= 0 ? Infinity : liquidAssets / fixedCosts

  return [
    {
      id: 'loan-payment',
      title: 'Loan Payment',
      prompt: 'Calculate the monthly payment for this amortized loan.',
      formula: 'M = P * [r(1+r)^n] / [(1+r)^n - 1]',
      expected: round2(payment),
      tolerance: 1,
      unit: '$/mo',
      inputs: [
        { label: 'Principal (P)', value: principal },
        { label: 'APR', value: round2(apr * 100) },
        { label: 'Term (n)', value: termMonths },
      ],
    },
    {
      id: 'dti-ratio',
      title: 'Debt-to-Income Ratio',
      prompt: 'Compute DTI = monthly obligations / gross monthly income.',
      formula: 'DTI = obligations / income',
      expected: round2(dtiRatio * 100),
      tolerance: 0.5,
      unit: '%',
      inputs: [
        { label: 'Monthly obligations', value: obligations },
        { label: 'Gross monthly income', value: income },
      ],
    },
    {
      id: 'refi-break-even',
      title: 'Refinance Break-even',
      prompt: 'Estimate how many months until refinance fees are recovered.',
      formula: 'Break-even = fees / (oldPayment - newPayment)',
      expected: Number.isFinite(breakEven) ? round2(breakEven) : 999,
      tolerance: 1,
      unit: 'months',
      inputs: [
        { label: 'Old payment', value: oldPayment },
        { label: 'New payment', value: round2(newPayment) },
        { label: 'Refi fees', value: closingFees },
      ],
    },
    {
      id: 'cash-runway',
      title: 'Cash Runway',
      prompt: 'How many months can this user survive with no income?',
      formula: 'Runway months = liquid assets / fixed monthly costs',
      expected: Number.isFinite(runway) ? round2(runway) : 999,
      tolerance: 0.5,
      unit: 'months',
      inputs: [
        { label: 'Liquid assets (checking + savings)', value: liquidAssets },
        { label: 'Fixed monthly costs', value: fixedCosts },
      ],
    },
  ]
}

export default function MathLab() {
  const { state, dispatch } = useGame()
  const [selected, setSelected] = useState('loan-payment')
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const challenges = useMemo(() => buildChallenges(state), [state.month, state.year, state.job?.base, state.city?.p, state.debt, state.credit, state.garage, state.transit?.cost, state.check, state.savings, state.entertainmentSpending, state.subscriptionEntertainmentSpending])
  const challenge = challenges.find((c) => c.id === selected) || challenges[0]

  const solvedThisMonth = Number(state.mathLabLastSolvedMonth || -1) === Number(state.month)
    && Number(state.mathLabLastSolvedYear || -1) === Number(state.year)

  const submit = () => {
    if (!challenge) return
    const numeric = Number(answer)
    if (!Number.isFinite(numeric)) {
      setFeedback('Enter a valid numeric answer.')
      return
    }

    const withinTolerance = Math.abs(numeric - challenge.expected) <= challenge.tolerance
    if (!withinTolerance) {
      setFeedback(`Not quite. Expected is within ±${challenge.tolerance} ${challenge.unit}. Try again.`)
      dispatch({
        type: 'SET_STATE',
        payload: {
          logs: [
            ...(Array.isArray(state.logs) ? state.logs : []),
            { date: `${state.month}/${state.year}`, msg: `🧮 Math Lab miss on ${challenge.title}` }
          ]
        }
      })
      return
    }

    if (solvedThisMonth) {
      setFeedback(`Correct: ${challenge.expected} ${challenge.unit}. Monthly reward already claimed.`)
      return
    }

    const tokenReward = 1
    const cashReward = 150
    const creditBoost = 3
    const nextStreak = Math.max(0, Number(state.mathLabStreak || 0)) + 1

    dispatch({
      type: 'SET_STATE',
      payload: {
        check: round2(Number(state.check || 0) + cashReward),
        credit: Math.max(300, Math.min(850, Number(state.credit || 0) + creditBoost)),
        rewardTokens: Math.max(0, Number(state.rewardTokens || 0)) + tokenReward,
        mathLabLastSolvedMonth: state.month,
        mathLabLastSolvedYear: state.year,
        mathLabStreak: nextStreak,
        logs: [
          ...(Array.isArray(state.logs) ? state.logs : []),
          {
            date: `${state.month}/${state.year}`,
            msg: `🧮 Math Lab solved: ${challenge.title} (+$${cashReward}, +${creditBoost} credit, +${tokenReward} token)`
          }
        ]
      }
    })

    setFeedback(`Correct! ${challenge.expected} ${challenge.unit}. Rewards claimed: +$${cashReward}, +${creditBoost} credit, +${tokenReward} token.`)
  }

  return (
    <div className="space-y-5">
      <div className="glass p-6">
        <h2 className="text-2xl font-bold text-slate-900">🧮 Math Lab</h2>
        <p className="text-sm text-slate-600 mt-1">Solve practical finance calculations. One rewarded solve per in-game month.</p>
        <p className="text-xs text-slate-500 mt-2">Current streak: <span className="font-bold">{Number(state.mathLabStreak || 0)}</span> month(s)</p>
      </div>

      <div className="glass p-5">
        <label className="text-xs font-bold uppercase text-slate-500">Challenge</label>
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value)
            setAnswer('')
            setFeedback(null)
          }}
          className="w-full mt-2 p-3 border rounded-xl"
        >
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {challenge && (
        <div className="glass p-6 space-y-4">
          <h3 className="font-bold text-xl text-slate-900">{challenge.title}</h3>
          <p className="text-sm text-slate-700">{challenge.prompt}</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-xs uppercase font-bold text-slate-500">Formula</p>
            <p className="font-mono text-sm text-slate-800 mt-1">{challenge.formula}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {challenge.inputs.map((input) => (
              <div key={input.label} className="bg-white border border-slate-200 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-bold uppercase">{input.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{input.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase text-slate-500">Your Answer ({challenge.unit})</label>
              <input
                type="number"
                step="0.01"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="w-full mt-1 p-3 border rounded-xl font-bold"
                placeholder="Enter your calculated value"
              />
            </div>
            <button
              onClick={submit}
              className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
            >
              Submit
            </button>
          </div>

          {feedback ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {feedback}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
