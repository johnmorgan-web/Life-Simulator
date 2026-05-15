import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'

type Challenge = {
  id: string
  title: string
  gradeBand: string
  level: 'elementary' | 'middle' | 'high' | 'adult'
  prompt: string
  formula: string
  expected: number
  tolerance: number
  unit: string
  inputs: Array<{ label: string; value: number }>
}

type RecommendationSnapshot = {
  month: number
  year: number
  level: Challenge['level']
  typicalAccuracy: number
  monthsPlayed: number
  netWorth: number
}

const RECOMMENDATION_STORAGE_KEY = 'mathLab.recommendationSnapshot.v1'

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function estimateNetWorthForMathLab(state: any) {
  const checking = Number(state?.check || 0)
  const savings = Number(state?.savings || 0)
  const debt = Math.abs(Number(state?.debt || 0))
  const portfolioCostBasis = (Array.isArray(state?.portfolio) ? state.portfolio : []).reduce((sum: number, holding: any) => {
    const shares = Number(holding?.shares || 0)
    const avgCost = Number(holding?.avgCost || 0)
    return sum + (shares * avgCost)
  }, 0)
  const vehicleAssets = (Array.isArray(state?.garage) ? state.garage : []).reduce((sum: number, vehicle: any) => {
    const currentValue = Number(vehicle?.currentValue || 0)
    if (currentValue > 0) return sum + currentValue
    const purchasePrice = Number(vehicle?.purchasePrice || 0)
    return purchasePrice > 0 ? sum + purchasePrice * 0.7 : sum
  }, 0)
  const realEstateEquity = (Array.isArray(state?.investmentProperties) ? state.investmentProperties : []).reduce((sum: number, property: any) => {
    const value = Number(property?.propertyValue || 0)
    const loan = Number(property?.loanBalance || 0)
    return sum + Math.max(0, value - loan)
  }, 0)

  return round2(checking + savings + portfolioCostBasis + vehicleAssets + realEstateEquity - debt)
}

function monthsPlayedEstimate(state: any) {
  const month = Math.max(1, Math.min(12, Number(state?.month || 2)))
  const year = Math.max(2026, Number(state?.year || 2026))
  const startYear = 2026
  const startMonth = 2
  return Math.max(1, ((year - startYear) * 12) + (month - startMonth) + 1)
}

function recommendMathLevel(state: any) {
  const lifetimeSuccesses = Math.max(0, Number(state?.lifetimeCheckSuccesses || 0))
  const lifetimeFailures = Math.max(0, Number(state?.lifetimeCheckFailures || 0))
  const attempts = lifetimeSuccesses + lifetimeFailures
  const rawAccuracy = attempts > 0 ? lifetimeSuccesses / attempts : 0.65
  const calculationStreak = Math.max(0, Number(state?.calculationStreak || 0))
  const streakSignal = Math.max(0, Math.min(1, calculationStreak / 25))
  const typicalAccuracy = Math.max(0, Math.min(1, (rawAccuracy * 0.8) + (streakSignal * 0.2)))

  const monthsPlayed = monthsPlayedEstimate(state)
  const netWorth = estimateNetWorthForMathLab(state)

  let level: Challenge['level'] = 'middle'
  if (typicalAccuracy < 0.58 && monthsPlayed < 6 && netWorth < 20000) {
    level = 'elementary'
  } else if (typicalAccuracy < 0.72 || monthsPlayed < 12 || netWorth < 90000) {
    level = 'middle'
  } else if (typicalAccuracy < 0.85 || monthsPlayed < 24 || netWorth < 600000) {
    level = 'high'
  } else {
    level = 'adult'
  }

  return {
    level,
    typicalAccuracy,
    monthsPlayed,
    netWorth,
    attempts,
  }
}

function readRecommendationSnapshot(): RecommendationSnapshot | null {
  try {
    const raw = localStorage.getItem(RECOMMENDATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      month: Number(parsed.month || 0),
      year: Number(parsed.year || 0),
      level: parsed.level,
      typicalAccuracy: Number(parsed.typicalAccuracy || 0),
      monthsPlayed: Number(parsed.monthsPlayed || 0),
      netWorth: Number(parsed.netWorth || 0),
    }
  } catch {
    return null
  }
}

function levelRank(level: Challenge['level']) {
  switch (level) {
    case 'elementary': return 1
    case 'middle': return 2
    case 'high': return 3
    case 'adult': return 4
    default: return 2
  }
}

function formatDelta(value: number, digits = 0) {
  if (value > 0) return `+${value.toFixed(digits)}`
  return value.toFixed(digits)
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

  const tipMealCost = round2(14 + (Number(state?.month || 1) * 1.75))
  const tipRate = 0.15
  const tipAmount = round2(tipMealCost * tipRate)

  const itemPrice = round2(22 + (Number(state?.month || 1) * 1.1))
  const discountRate = 0.2
  const salesTaxRate = 0.0825
  const discountedPrice = itemPrice * (1 - discountRate)
  const checkoutTotal = round2(discountedPrice * (1 + salesTaxRate))

  const hourlyRate = round2(Math.max(14, income / 150))
  const hoursWorked = 24 + (Number(state?.month || 1) % 6)
  const grossPay = round2(hourlyRate * hoursWorked)

  const basePay = round2(Math.max(1800, income * 0.7))
  const commissionSales = round2(9000 + ((Number(state?.month || 1) + 2) * 350))
  const commissionRate = 0.04
  const commissionPay = round2(basePay + (commissionSales * commissionRate))

  const w2ABox1 = round2(Math.max(22000, income * 5.4))
  const w2ABox2 = round2(w2ABox1 * 0.11)
  const w2BBox1 = round2(Math.max(6000, income * 1.65))
  const w2BBox2 = round2(w2BBox1 * 0.09)
  const totalFederalWithholding = round2(w2ABox2 + w2BBox2)

  const ezWages = round2(Math.max(26000, income * 8.5))
  const ezTaxableInterest = 320
  const ezUnemployment = 1200
  const ezAgi = round2(ezWages + ezTaxableInterest + ezUnemployment)
  const ezStandardDeduction = 13850
  const ezTaxableIncome = Math.max(0, round2(ezAgi - ezStandardDeduction))
  const ezTaxOwed = round2(ezTaxableIncome * 0.1)
  const ezWithheld = round2(Math.max(3200, ezWages * 0.12))
  const ezRefund = round2(ezWithheld - ezTaxOwed)

  return [
    {
      id: 'tip-amount',
      title: 'Restaurant Tip Math',
      gradeBand: 'Grade 4-5',
      level: 'elementary',
      prompt: 'Find a 15% tip for this meal cost.',
      formula: 'Tip = meal cost × tip rate',
      expected: tipAmount,
      tolerance: 0.1,
      unit: '$',
      inputs: [
        { label: 'Meal cost', value: tipMealCost },
        { label: 'Tip rate (%)', value: 15 },
      ],
    },
    {
      id: 'discount-plus-tax',
      title: 'Discount Then Tax',
      gradeBand: 'Grade 6-7',
      level: 'middle',
      prompt: 'Apply discount first, then compute sales tax on the discounted price.',
      formula: 'Total = price × (1 - discount) × (1 + tax)',
      expected: checkoutTotal,
      tolerance: 0.2,
      unit: '$',
      inputs: [
        { label: 'List price', value: itemPrice },
        { label: 'Discount (%)', value: 20 },
        { label: 'Sales tax (%)', value: 8.25 },
      ],
    },
    {
      id: 'hourly-paycheck',
      title: 'Hourly Paycheck',
      gradeBand: 'Grade 6-8',
      level: 'middle',
      prompt: 'Calculate gross pay from hourly wage and hours worked.',
      formula: 'Gross pay = hourly rate × hours worked',
      expected: grossPay,
      tolerance: 0.1,
      unit: '$',
      inputs: [
        { label: 'Hourly rate', value: hourlyRate },
        { label: 'Hours worked', value: hoursWorked },
      ],
    },
    {
      id: 'commission-pay',
      title: 'Sales Commission Pay',
      gradeBand: 'Grade 8-10',
      level: 'high',
      prompt: 'Compute monthly pay with base salary and commission.',
      formula: 'Total pay = base pay + (sales × commission rate)',
      expected: commissionPay,
      tolerance: 0.5,
      unit: '$',
      inputs: [
        { label: 'Base pay', value: basePay },
        { label: 'Sales this month', value: commissionSales },
        { label: 'Commission (%)', value: 4 },
      ],
    },
    {
      id: 'loan-payment',
      title: 'Loan Payment',
      gradeBand: 'Grade 11-12',
      level: 'high',
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
      gradeBand: 'Grade 10-12',
      level: 'high',
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
      id: 'w2-withholding',
      title: 'Read a W-2 (Federal Withholding)',
      gradeBand: 'Grade 11-12',
      level: 'high',
      prompt: 'Two W-2s are shown. Add Box 2 (federal withholding) from both forms.',
      formula: 'Total withholding = W-2A Box 2 + W-2B Box 2',
      expected: totalFederalWithholding,
      tolerance: 0.5,
      unit: '$',
      inputs: [
        { label: 'W-2A Box 1 Wages', value: w2ABox1 },
        { label: 'W-2A Box 2 Federal withholding', value: w2ABox2 },
        { label: 'W-2B Box 1 Wages', value: w2BBox1 },
        { label: 'W-2B Box 2 Federal withholding', value: w2BBox2 },
      ],
    },
    {
      id: 'form-1040ez-refund',
      title: 'Fill a 1040EZ-Style Refund',
      gradeBand: 'Adult / Personal Finance',
      level: 'adult',
      prompt: 'Use the simplified 1040EZ-style values to compute refund (or amount owed).',
      formula: 'AGI = wages + interest + unemployment; Taxable income = AGI - standard deduction; Tax = 10% × taxable income; Refund = withholding - tax',
      expected: ezRefund,
      tolerance: 1,
      unit: '$',
      inputs: [
        { label: 'Wages', value: ezWages },
        { label: 'Taxable interest', value: ezTaxableInterest },
        { label: 'Unemployment compensation', value: ezUnemployment },
        { label: 'Standard deduction', value: ezStandardDeduction },
        { label: 'Federal tax withheld', value: ezWithheld },
      ],
    },
    {
      id: 'refi-break-even',
      title: 'Refinance Break-even',
      gradeBand: 'Adult / Personal Finance',
      level: 'adult',
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
      gradeBand: 'Adult / Personal Finance',
      level: 'adult',
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
  const { state, dispatch, saveGame } = useGame()
  const [selected, setSelected] = useState('loan-payment')
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [previousRecommendation, setPreviousRecommendation] = useState<RecommendationSnapshot | null>(() => readRecommendationSnapshot())

  const challenges = useMemo(() => buildChallenges(state), [state.month, state.year, state.job?.base, state.city?.p, state.debt, state.credit, state.garage, state.transit?.cost, state.check, state.savings, state.entertainmentSpending, state.subscriptionEntertainmentSpending])
  const recommendation = useMemo(() => recommendMathLevel(state), [state.month, state.year, state.check, state.savings, state.debt, state.portfolio, state.garage, state.investmentProperties, state.calculationStreak, state.lifetimeCheckSuccesses, state.lifetimeCheckFailures])
  const orderedChallenges = useMemo(() => {
    return [...challenges].sort((a, b) => {
      const aRecommended = a.level === recommendation.level ? 1 : 0
      const bRecommended = b.level === recommendation.level ? 1 : 0
      if (aRecommended !== bRecommended) return bRecommended - aRecommended
      return a.title.localeCompare(b.title)
    })
  }, [challenges, recommendation.level])
  const challenge = orderedChallenges.find((c) => c.id === selected) || orderedChallenges[0]

  const recommendationTrend = useMemo(() => {
    const previous = previousRecommendation
    if (!previous) {
      return {
        tone: 'pending',
        title: 'Trend unavailable yet',
        detail: 'Play into another month to start month-to-month recommendation tracking.',
      }
    }

    const sameMonth = previous.month === Number(state.month) && previous.year === Number(state.year)
    if (sameMonth) {
      return {
        tone: 'stable',
        title: 'Trend unchanged this month',
        detail: 'Recommendation trend updates when you enter a new in-game month.',
      }
    }

    const previousRank = levelRank(previous.level)
    const currentRank = levelRank(recommendation.level)
    const rankDelta = currentRank - previousRank
    const accuracyDelta = recommendation.typicalAccuracy - previous.typicalAccuracy
    const wealthDelta = recommendation.netWorth - previous.netWorth

    let title = 'Recommendation stable month-over-month'
    let tone: 'up' | 'down' | 'stable' = 'stable'
    if (rankDelta > 0) title = 'Recommendation moved up month-over-month'
    if (rankDelta > 0) tone = 'up'
    if (rankDelta < 0) {
      title = 'Recommendation moved down month-over-month'
      tone = 'down'
    }

    const parts = [
      `Level ${previous.level.toUpperCase()} -> ${recommendation.level.toUpperCase()}`,
      `accuracy ${formatDelta(accuracyDelta * 100, 1)} pts`,
      `net worth ${formatDelta(wealthDelta, 0)}`,
      `months played ${previous.monthsPlayed} -> ${recommendation.monthsPlayed}`,
    ]

    return {
      tone,
      title,
      detail: parts.join(' | '),
    }
  }, [previousRecommendation, recommendation, state.month, state.year])

  const trendToneClasses = useMemo(() => {
    switch (recommendationTrend.tone) {
      case 'up':
        return {
          title: 'text-emerald-800',
          detail: 'text-emerald-700',
        }
      case 'down':
        return {
          title: 'text-rose-800',
          detail: 'text-rose-700',
        }
      case 'stable':
        return {
          title: 'text-amber-800',
          detail: 'text-amber-700',
        }
      default:
        return {
          title: 'text-indigo-800',
          detail: 'text-indigo-700',
        }
    }
  }, [recommendationTrend.tone])

  useEffect(() => {
    const currentSnapshot: RecommendationSnapshot = {
      month: Number(state.month || 0),
      year: Number(state.year || 0),
      level: recommendation.level,
      typicalAccuracy: recommendation.typicalAccuracy,
      monthsPlayed: recommendation.monthsPlayed,
      netWorth: recommendation.netWorth,
    }

    const stored = readRecommendationSnapshot()
    if (stored && (stored.month !== currentSnapshot.month || stored.year !== currentSnapshot.year)) {
      setPreviousRecommendation(stored)
    }

    try {
      localStorage.setItem(RECOMMENDATION_STORAGE_KEY, JSON.stringify(currentSnapshot))
    } catch {
      // Ignore storage write failures and keep in-memory recommendation behavior.
    }
  }, [state.month, state.year, recommendation.level, recommendation.typicalAccuracy, recommendation.monthsPlayed, recommendation.netWorth])

  const solvedThisMonth = Number(state.mathLabLastSolvedMonth || -1) === Number(state.month)
    && Number(state.mathLabLastSolvedYear || -1) === Number(state.year)
  const elementarySolveStreak = Math.max(0, Number(state.mathLabElementarySolveStreak || 0))

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

    const nextElementaryStreak = challenge.level === 'elementary' ? elementarySolveStreak + 1 : 0
    const elementaryRewardLimited = challenge.level === 'elementary' && elementarySolveStreak >= 2

    const tokenReward = elementaryRewardLimited ? 0 : 1
    const cashReward = elementaryRewardLimited ? 60 : 150
    const creditBoost = elementaryRewardLimited ? 1 : 3
    const nextStreak = Math.max(0, Number(state.mathLabStreak || 0)) + 1

    const payload = {
      check: round2(Number(state.check || 0) + cashReward),
      credit: Math.max(300, Math.min(850, Number(state.credit || 0) + creditBoost)),
      rewardTokens: Math.max(0, Number(state.rewardTokens || 0)) + tokenReward,
      mathLabLastSolvedMonth: state.month,
      mathLabLastSolvedYear: state.year,
      mathLabStreak: nextStreak,
      mathLabElementarySolveStreak: nextElementaryStreak,
      logs: [
        ...(Array.isArray(state.logs) ? state.logs : []),
        {
          date: `${state.month}/${state.year}`,
          msg: `🧮 Math Lab solved: ${challenge.title} [${challenge.gradeBand}] (+$${cashReward}, +${creditBoost} credit, +${tokenReward} token${elementaryRewardLimited ? ', elementary reward cap active' : ''})`
        }
      ]
    }
    dispatch({
      type: 'SET_STATE',
      payload,
    })
    window.setTimeout(() => {
      void saveGame()
    }, 0)

    setFeedback(`Correct! ${challenge.expected} ${challenge.unit}. Rewards claimed: +$${cashReward}, +${creditBoost} credit, +${tokenReward} token.${elementaryRewardLimited ? ' Elementary-level reward cap applied due to repeated elementary solves.' : ''}`)
  }

  return (
    <div className="space-y-5">
      <div className="glass p-6">
        <h2 className="text-2xl font-bold text-slate-900">🧮 Math Lab</h2>
        <p className="text-sm text-slate-600 mt-1">Solve practical finance calculations. One rewarded solve per in-game month.</p>
        <p className="text-xs text-slate-500 mt-2">Current streak: <span className="font-bold">{Number(state.mathLabStreak || 0)}</span> month(s)</p>
        <p className="text-xs text-slate-500 mt-1">Elementary solve streak: <span className="font-bold">{elementarySolveStreak}</span> (rewards are reduced after 2 consecutive elementary solves)</p>
        <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs uppercase font-bold text-indigo-700">Recommended Level</p>
          <p className="text-sm font-bold text-indigo-900 mt-1">{recommendation.level.toUpperCase()}</p>
          <p className="text-xs text-indigo-800 mt-1">
            Based on typical accuracy {(recommendation.typicalAccuracy * 100).toFixed(0)}%, {recommendation.monthsPlayed} month(s) played, and net worth ${recommendation.netWorth.toLocaleString()}.
          </p>
          <p className="text-[11px] text-indigo-700 mt-1">Accuracy sample size: {recommendation.attempts} verified check entries</p>
          <p className={`text-[11px] font-bold mt-2 ${trendToneClasses.title}`}>{recommendationTrend.title}</p>
          <p className={`text-[11px] mt-1 ${trendToneClasses.detail}`}>{recommendationTrend.detail}</p>
        </div>
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
          {orderedChallenges.map((c) => (
            <option key={c.id} value={c.id}>{c.title} - {c.gradeBand}{c.level === recommendation.level ? ' [Recommended]' : ''}</option>
          ))}
        </select>
      </div>

      {challenge && (
        <div className="glass p-6 space-y-4">
          <h3 className="font-bold text-xl text-slate-900">{challenge.title}</h3>
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 uppercase">
            Expected Grade Level: {challenge.gradeBand}
          </div>
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
