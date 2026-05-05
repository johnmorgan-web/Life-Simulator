import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import type { Job } from '@server/types/models.types'

type LearningLevel = 'elementary' | 'middle-school' | 'high-school' | 'adult'

type AdviceItem = {
  title: string
  reason: string
  move: string
  priority: number
  tag: 'Cash Flow' | 'Debt' | 'Credit' | 'Career' | 'Transport' | 'Investing' | 'Education'
}

type CoachSnapshot = {
  generatedMonth: number
  generatedYear: number
  checking: number
  savings: number
  debt: number
  credit: number
  monthlyIncome: number
  monthlyExpenses: number
  advice: AdviceItem[]
}

function usd(value: number) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function learnerSupportCopy(tag: AdviceItem['tag']) {
  if (tag === 'Cash Flow') {
    return {
      reason: 'Simple view: you need enough money left so surprises do not knock you off track.',
      move: 'Simple move: keep a safety cushion before extra spending.',
    }
  }
  if (tag === 'Debt') {
    return {
      reason: 'Simple view: debt can grow quickly because of interest.',
      move: 'Simple move: pay debt first when possible.',
    }
  }
  if (tag === 'Credit') {
    return {
      reason: 'Simple view: a higher credit score helps you pay less in borrowing costs.',
      move: 'Simple move: pay on time and keep your check math accurate.',
    }
  }
  if (tag === 'Career') {
    return {
      reason: 'Simple view: better jobs can raise your monthly money.',
      move: 'Simple move: apply to one or two stronger options first.',
    }
  }
  if (tag === 'Transport') {
    return {
      reason: 'Simple view: vehicle costs are taking too much of your income.',
      move: 'Simple move: lower vehicle costs until your budget is stronger.',
    }
  }
  if (tag === 'Investing') {
    return {
      reason: 'Simple view: investing is good, but debt and risk balance matter first.',
      move: 'Simple move: reduce risk and debt pressure before adding more stock risk.',
    }
  }
  return {
    reason: 'Simple view: one extra skill can unlock more opportunities.',
    move: 'Simple move: choose the shortest useful learning path and finish it.',
  }
}

function reasonForLearner(item: AdviceItem, level: LearningLevel, plainLanguage: boolean) {
  if (!plainLanguage && level === 'adult') return item.reason
  const support = learnerSupportCopy(item.tag)
  return `${item.reason} ${support.reason}`
}

function moveForLearner(item: AdviceItem, level: LearningLevel, plainLanguage: boolean) {
  if (!plainLanguage && level === 'adult') return item.move
  const support = learnerSupportCopy(item.tag)
  return `${item.move} ${support.move}`
}

function buildCoachSnapshot(
  state: any,
  jobBoard: Job[],
  getJobEligibility: (state: any, job: Job) => any,
  calculateDynamicAPR: (credit: number) => number,
): CoachSnapshot {
  const checking = Number(state.check || 0)
  const savings = Number(state.savings || 0)
  const debt = Number(state.debt || 0)
  const credit = Number(state.credit || 600)
  const credentials = Array.isArray(state.credentials) ? state.credentials : []
  const garage = Array.isArray(state.garage) ? state.garage : []
  const portfolio = Array.isArray(state.portfolio) ? state.portfolio : []
  const marketPrices = state.marketPrices || {}
  const monthlyIncome = Math.max(0, Number(state.job?.base || 0) * Number(state.city?.p || 1) * 0.8)

  const monthlyExpenses = Array.isArray(state.ledger)
    ? state.ledger.reduce((sum: number, row: any) => {
      const amount = Number(row?.amt || 0)
      return amount < 0 ? sum + Math.abs(amount) : sum
    }, 0)
    : 0

  const emergencyTarget = Math.max(1200, monthlyExpenses * 1.5)
  const emergencyGap = Math.max(0, emergencyTarget - savings)

  const carLoanMonthly = garage.reduce((sum: number, g: any) => {
    const monthsRemaining = Number(g?.monthsRemaining || 0)
    const monthlyPayment = Number(g?.monthlyPayment || 0)
    return monthsRemaining > 0 ? sum + monthlyPayment : sum
  }, 0)

  const portfolioValue = portfolio.reduce((sum: number, h: any) => {
    const shares = Number(h?.shares || 0)
    const price = Number(marketPrices[h?.ticker] || 0)
    return sum + (shares * price)
  }, 0)

  const largestHoldingValue = portfolio.reduce((max: number, h: any) => {
    const shares = Number(h?.shares || 0)
    const price = Number(marketPrices[h?.ticker] || 0)
    return Math.max(max, shares * price)
  }, 0)
  const concentration = portfolioValue > 0 ? largestHoldingValue / portfolioValue : 0

  const apr = calculateDynamicAPR(credit)
  const advice: AdviceItem[] = []

  if (checking < 250) {
    advice.push({
      title: 'Protect your month-end cash',
      reason: `Checking is ${usd(checking)}, which is low for surprise costs.`,
      move: 'Trim entertainment/subscriptions this month and keep at least $300 to avoid emergency borrowing.',
      priority: 100,
      tag: 'Cash Flow',
    })
  }

  if (savings < emergencyTarget) {
    advice.push({
      title: 'Build a starter emergency fund',
      reason: `Savings is ${usd(savings)} and the short-term safety target is about ${usd(emergencyTarget)}.`,
      move: `Route a small fixed amount monthly to savings until you close about ${usd(emergencyGap)}.`,
      priority: 90,
      tag: 'Cash Flow',
    })
  }

  if (debt > 0) {
    advice.push({
      title: 'Reduce interest drag first',
      reason: `You carry ${usd(debt)} debt at about ${(apr * 100).toFixed(1)}% APR.`,
      move: 'Make at least one focused extra debt payment before increasing optional spending.',
      priority: 95,
      tag: 'Debt',
    })
  }

  if (credit < 670) {
    advice.push({
      title: 'Raise credit for better loan terms',
      reason: `Credit score is ${Math.round(credit)}, which keeps borrowing costs high.`,
      move: 'Prioritize on-time debt payments and accurate monthly checks to steadily improve score.',
      priority: 85,
      tag: 'Credit',
    })
  }

  if (monthlyIncome > 0 && carLoanMonthly > monthlyIncome * 0.2) {
    advice.push({
      title: 'Car loans are heavy for current income',
      reason: `Vehicle payments are ${usd(carLoanMonthly)} per month, above 20% of net pay (${usd(monthlyIncome)}).`,
      move: 'Consider downgrading vehicle costs or delaying new vehicle purchases until cash buffer improves.',
      priority: 80,
      tag: 'Transport',
    })
  }

  const higherPayEligible = (Array.isArray(jobBoard) ? jobBoard : [])
    .filter((job: Job) => Number(job.base || 0) > Number(state.job?.base || 0) * 1.08)
    .map((job: Job) => ({ job, eligibility: getJobEligibility(state, job) }))
    .filter(({ eligibility }: any) => eligibility?.canApply)
    .sort((a: any, b: any) => Number(b.job.base || 0) - Number(a.job.base || 0))
    .slice(0, 3)

  if (higherPayEligible.length > 0) {
    const titles = higherPayEligible.map((j: any) => j.job.title).join(', ')
    advice.push({
      title: 'You are eligible for higher-pay roles now',
      reason: `You already meet requirements for: ${titles}.`,
      move: 'Apply to 1-2 of these roles this cycle to improve monthly cash flow.',
      priority: 88,
      tag: 'Career',
    })
  }

  if (higherPayEligible.length === 0 && credentials.length < 3) {
    advice.push({
      title: 'One more credential can unlock better jobs',
      reason: `Current credential count is ${credentials.length}. More credentials increase job eligibility depth.`,
      move: 'Start a short academy path tied to your target career track.',
      priority: 72,
      tag: 'Education',
    })
  }

  if (debt > 0 && Number(state.stockInvestedLastMonth || 0) > 0) {
    advice.push({
      title: 'Balance investing with debt payoff',
      reason: `You invested ${usd(Number(state.stockInvestedLastMonth || 0))} last month while still carrying debt.`,
      move: 'Temporarily split extra cash toward debt first, then scale stock buys back up.',
      priority: 84,
      tag: 'Investing',
    })
  }

  if (portfolioValue > 0 && concentration > 0.5) {
    advice.push({
      title: 'Portfolio is concentrated in one position',
      reason: `Largest holding is about ${Math.round(concentration * 100)}% of your portfolio.`,
      move: 'Spread new buys across other assets to reduce single-stock risk.',
      priority: 70,
      tag: 'Investing',
    })
  }

  if (!advice.length) {
    advice.push({
      title: 'You are in a stable zone',
      reason: 'No high-risk financial pressure flags were detected right now.',
      move: 'Keep your momentum: maintain savings growth and selectively target higher-pay roles.',
      priority: 50,
      tag: 'Cash Flow',
    })
  }

  advice.sort((a, b) => b.priority - a.priority)

  return {
    generatedMonth: Number(state.month || 0),
    generatedYear: Number(state.year || 0),
    checking,
    savings,
    debt,
    credit,
    monthlyIncome,
    monthlyExpenses,
    advice,
  }
}

export default function AICoach() {
  const { state, dispatch, jobBoard, getJobEligibility, calculateDynamicAPR } = useGame()
  const learningLevel: LearningLevel = state.learningLevel || state.marketLearningLevel || state.realEstateLearningLevel || 'adult'
  const usePlainLanguage = Boolean(state.usePlainLanguage ?? state.marketUsePlainLanguage ?? state.realEstateUsePlainLanguage)

  const generatedThisMonth = Number(state.aiCoachGeneratedMonth || 0) === Number(state.month || 0)
    && Number(state.aiCoachGeneratedYear || 0) === Number(state.year || 0)

  const activeSnapshot = useMemo(() => {
    if (!generatedThisMonth) return null
    const snapshot = state.aiCoachSnapshot
    if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(snapshot.advice)) return null
    return snapshot as CoachSnapshot
  }, [generatedThisMonth, state.aiCoachSnapshot])

  const top3 = (activeSnapshot?.advice || []).slice(0, 3)

  const generateAdvice = () => {
    if (generatedThisMonth) return
    const snapshot = buildCoachSnapshot(
      state,
      Array.isArray(jobBoard) ? jobBoard : [],
      getJobEligibility,
      calculateDynamicAPR,
    )
    dispatch({
      type: 'SET_STATE',
      payload: {
        aiCoachSnapshot: snapshot,
        aiCoachGeneratedMonth: Number(state.month || 0),
        aiCoachGeneratedYear: Number(state.year || 0),
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="glass p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">AI Coach</h3>
            <p className="text-sm text-slate-600 mt-1">Optional guidance based on your life data. You can generate advice once per month reconciliation.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700 font-bold">Advisory Only</span>
            <button
              type="button"
              onClick={generateAdvice}
              disabled={generatedThisMonth}
              className={`px-3 py-1.5 rounded text-xs font-bold ${generatedThisMonth ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
            >
              {generatedThisMonth ? 'Generated This Month' : 'Generate Advice'}
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-600">
            Learning level
            <select
              value={learningLevel}
              onChange={(e) => dispatch({
                type: 'SET_STATE',
                payload: {
                  learningLevel: e.target.value,
                  marketLearningLevel: e.target.value,
                  realEstateLearningLevel: e.target.value,
                },
              })}
              className="mt-1 w-full border rounded px-2 py-1 text-sm text-slate-700"
            >
              <option value="elementary">Elementary</option>
              <option value="middle-school">Middle School</option>
              <option value="high-school">High School</option>
              <option value="adult">Adult</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 inline-flex items-center gap-2 mt-5 md:mt-0">
            <input
              type="checkbox"
              checked={usePlainLanguage}
              onChange={(e) => dispatch({
                type: 'SET_STATE',
                payload: {
                  usePlainLanguage: e.target.checked,
                  marketUsePlainLanguage: e.target.checked,
                  realEstateUsePlainLanguage: e.target.checked,
                },
              })}
            />
            Use plain language
          </label>
        </div>
        <p className="text-xs text-slate-500 mt-3">Month lock: {Number(state.month || 0)}/{Number(state.year || 0)}</p>
      </div>

      {!activeSnapshot ? (
        <div className="glass p-5 text-sm text-slate-600">
          No advice has been generated for this month yet. Click <strong>Generate Advice</strong> to create your monthly recommendations.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass p-3">
              <p className="text-[10px] uppercase font-bold text-slate-500">Checking</p>
              <p className="text-lg font-bold text-slate-800">{usd(activeSnapshot.checking)}</p>
            </div>
            <div className="glass p-3">
              <p className="text-[10px] uppercase font-bold text-slate-500">Savings</p>
              <p className="text-lg font-bold text-slate-800">{usd(activeSnapshot.savings)}</p>
            </div>
            <div className="glass p-3">
              <p className="text-[10px] uppercase font-bold text-slate-500">Debt</p>
              <p className="text-lg font-bold text-slate-800">{usd(activeSnapshot.debt)}</p>
            </div>
            <div className="glass p-3">
              <p className="text-[10px] uppercase font-bold text-slate-500">Credit</p>
              <p className="text-lg font-bold text-slate-800">{Math.round(activeSnapshot.credit)}</p>
            </div>
          </div>

          <div className="glass p-5">
            <h4 className="font-bold text-slate-800 mb-3">Top Next Moves</h4>
            <div className="space-y-3">
              {top3.map((item, idx) => (
                <div key={`${item.title}-${idx}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-800">{idx + 1}. {item.title}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">{item.tag}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1"><strong>Why:</strong> {reasonForLearner(item, learningLevel, usePlainLanguage)}</p>
                  <p className="text-sm text-slate-700 mt-1"><strong>Suggested move:</strong> {moveForLearner(item, learningLevel, usePlainLanguage)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-5">
            <h4 className="font-bold text-slate-800 mb-3">Full Recommendation Queue</h4>
            <div className="space-y-2">
              {activeSnapshot.advice.map((item, idx) => (
                <div key={`${item.title}-full-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                    <p className="text-xs text-slate-600 truncate">{moveForLearner(item, learningLevel, usePlainLanguage)}</p>
                  </div>
                  <span className="ml-3 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold shrink-0">P{item.priority}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
