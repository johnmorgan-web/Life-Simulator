import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'
import Celebration from './components/Celebration'
import { GameProvider, useGame } from './context/GameContext'
import Login from './components/Login'
import { cosmeticThemes } from './constants/achievements.constants'
import { stockMarketAssets } from './constants/stockMarket.constants'

const Ledger = lazy(() => import('./tabs/Ledger'))
const Careers = lazy(() => import('./tabs/Careers'))
const AICoach = lazy(() => import('./tabs/CoachAi'))
const Academy = lazy(() => import('./tabs/Academy'))
const Transit = lazy(() => import('./tabs/Transit'))
const Relocate = lazy(() => import('./tabs/Relocate'))
const Resume = lazy(() => import('./tabs/Resume'))
const Lifestyle = lazy(() => import('./tabs/Lifestyle'))
const Loans = lazy(() => import('./tabs/Loans'))
const Bank = lazy(() => import('./tabs/Bank'))
const StockMarket = lazy(() => import('./tabs/StockMarket'))
const RealEstate = lazy(() => import('./tabs/RealEstate'))
const Rewards = lazy(() => import('./tabs/Rewards'))
const Admin = lazy(() => import('./tabs/Admin'))
const MathLab = lazy(() => import('./tabs/MathLab'))

declare const __APP_VERSION__: string

function TabContent({ tab }: { tab: string }) {
  const { state, checkRow } = useGame()
  const format = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (tab === 'ledger') return <Ledger ledger={state.ledger} onCheck={checkRow} format={format} isAdmin={state.isAdmin} />
  if (tab === 'careers') return <Careers />
  if (tab === 'ai-coach') return <AICoach />
  if (tab === 'academy') return <Academy />
  if (tab === 'transit') return <Transit />
  if (tab === 'relocate') return <Relocate />
  if (tab === 'resume') return <Resume />
  if (tab === 'lifestyle') return <Lifestyle />
  if (tab === 'loans') return <Loans />
  if (tab === 'bank') return <Bank />
  if (tab === 'stocks') return <StockMarket />
  if (tab === 'real-estate') return <RealEstate />
  if (tab === 'rewards') return <Rewards />
  if (tab === 'admin') return <Admin />
  if (tab === 'math-lab') return <MathLab />
  return <div className="p-6">Unknown tab</div>
}

export function App() {
  const [tab, setTab] = useState('ledger')

  return (
    <GameProvider>
      <div className="h-full flex flex-col">
        <InnerApp tab={tab} setTab={setTab} />
      </div>
    </GameProvider>
  )
}

function cursorEmojiFromState(state: any, vehicleDatabase: any) {
  const owned = state.ownsVehicle
  if (owned?.vehicleId) {
    const vehicle = vehicleDatabase?.vehicles?.find((v: any) => v.id === owned.vehicleId)
    if (vehicle?.icon) return vehicle.icon
  }

  const title = (state.job?.title || '').toLowerCase()
  if (title.includes('doctor') || title.includes('nurse') || title.includes('medic')) return '🩺'
  if (title.includes('lawyer') || title.includes('court')) return '⚖️'
  if (title.includes('engineer') || title.includes('mechanic')) return '🔧'
  if (title.includes('pilot') || title.includes('air')) return '✈️'
  if (title.includes('soldier') || title.includes('military') || title.includes('army') || title.includes('marine')) return '🎖️'
  if (title.includes('teacher') || title.includes('professor')) return '📚'
  if (title.includes('software') || title.includes('data') || title.includes('it')) return '💻'
  if (title.includes('chef') || title.includes('food')) return '🍽️'
  if (title.includes('driver')) return '🚗'
  return '💼'
}

function cursorDataUrl(emoji: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><text x='16' y='22' font-size='20' text-anchor='middle'>${emoji}</text></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, auto`
}

function eventDialogCopy(event: any) {
  const id = String(event?.id || '').toLowerCase()
  const trigger = String(event?.trigger || '').toLowerCase()
  const context = trigger || id.split('_')[0] || 'general'
  const isIncome = event?.type === 'in'

  const contextLabel: Record<string, string> = {
    car: 'Transportation update',
    acad: 'Education update',
    academy: 'Education update',
    health: 'Health update',
    family: 'Family update',
    hazard: 'Worksite update',
    stress: 'Stress update',
    burnout: 'Stress update',
    stocks: 'Portfolio update',
    job: 'Career update',
    all: 'Life update',
    none: 'Life update',
    general: 'Life update'
  }

  const toneLineByContext: Record<string, { in: string; out: string }> = {
    car: {
      in: 'Your transportation situation improved this month.',
      out: 'A vehicle-related issue hit your budget this month.'
    },
    acad: {
      in: 'Your education effort paid off this month.',
      out: 'School-related costs rose unexpectedly this month.'
    },
    academy: {
      in: 'Your education effort paid off this month.',
      out: 'School-related costs rose unexpectedly this month.'
    },
    health: {
      in: 'Your health momentum created a positive outcome.',
      out: 'A health-related expense needs attention this month.'
    },
    family: {
      in: 'Family brought some financial relief this month.',
      out: 'Family needs increased your expenses this month.'
    },
    hazard: {
      in: 'Work conditions turned in your favor for now.',
      out: 'A work-risk incident created an unexpected cost.'
    },
    stress: {
      in: 'Your recovery efforts gave you a boost this month.',
      out: 'Stress-management costs showed up this month.'
    },
    burnout: {
      in: 'Your recovery efforts gave you a boost this month.',
      out: 'Stress-management costs showed up this month.'
    },
    stocks: {
      in: 'Your portfolio generated income this month.',
      out: 'A market-related cost impacted your finances this month.'
    },
    job: {
      in: 'Your work track delivered an upside surprise.',
      out: 'A job-related obligation impacted your finances.'
    },
    all: {
      in: 'A general life event gave you a financial lift.',
      out: 'A general life event created an extra expense.'
    },
    none: {
      in: 'A general life event gave you a financial lift.',
      out: 'A general life event created an extra expense.'
    },
    general: {
      in: 'A general life event gave you a financial lift.',
      out: 'A general life event created an extra expense.'
    }
  }

  const contextKey = toneLineByContext[context] ? context : 'general'

  return {
    headline: isIncome ? 'Good News Event' : 'Unexpected Expense Event',
    badge: contextLabel[context] || contextLabel.general,
    toneLine: isIncome ? toneLineByContext[contextKey].in : toneLineByContext[contextKey].out,
    continueLabel: isIncome ? 'Nice, Continue' : 'Got It, Continue'
  }
}

function InnerApp({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const { state, dispatch, processMonth, openSettlement, acceptJob, gameValues, vehicleDatabase, academyCourses, ledgerEventNotifications, dequeueLedgerEventNotification } = useGame()
  const activeTheme = cosmeticThemes[state.activeTheme || 'default'] || cosmeticThemes.default
  const [pendingPayments, setPendingPayments] = useState<{ savings: number; debt: number; skipped: boolean } | null>(null)
  const [showAutoLoanConfirm, setShowAutoLoanConfirm] = useState(false)
  const [showSkipPaymentConfirm, setShowSkipPaymentConfirm] = useState(false)
  const [showMonthPreview, setShowMonthPreview] = useState(false)
  const [monthPreview, setMonthPreview] = useState<any | null>(null)
  const [autoLoanAmount, setAutoLoanAmount] = useState(0)
  const [paymentInputWarning, setPaymentInputWarning] = useState<string | null>(null)
  const [eventPopup, setEventPopup] = useState<any | null>(null)
  const [achievementToast, setAchievementToast] = useState<{ title: string; category: string } | null>(null)
  const previousAchievementCountRef = useRef(Array.isArray(state.achievementHistory) ? state.achievementHistory.length : 0)
  
  // Calculate dynamic APR based on credit score
  const calculateDynamicAPR = (creditScore: number): number => {
    if (creditScore < 300) return 0.21
    if (creditScore >= 850) return 0.03
    if (creditScore < 600) {
      return 0.21 - ((creditScore - 300) / 300) * 0.105
    } else {
      return 0.105 - ((creditScore - 600) / 250) * 0.075
    }
  }
  
  const dynamicAPR = calculateDynamicAPR(state.credit)

  useEffect(() => {
    document.body.style.cursor = cursorDataUrl(cursorEmojiFromState(state, vehicleDatabase))
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [state.job?.title, state.ownsVehicle?.vehicleId, vehicleDatabase])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--app-accent', activeTheme.accent)
    root.style.setProperty('--app-bg', activeTheme.bg)
    root.style.setProperty('--app-gradient', activeTheme.gradient)
    root.style.setProperty('--app-pattern', activeTheme.pattern)
    root.style.setProperty('--glass-bg', activeTheme.glassBg)
    root.style.setProperty('--glass-border', activeTheme.glassBorder)
    document.body.style.backgroundColor = activeTheme.bg
  }, [activeTheme.accent, activeTheme.bg, activeTheme.gradient, activeTheme.pattern, activeTheme.glassBg, activeTheme.glassBorder])

  useEffect(() => {
    const queued = Array.isArray(ledgerEventNotifications) ? ledgerEventNotifications : []
    if (!queued.length || state.showSettlement || !!eventPopup) return
    setEventPopup(queued[0])
    dequeueLedgerEventNotification()
  }, [ledgerEventNotifications, state.showSettlement, eventPopup, dequeueLedgerEventNotification])

  useEffect(() => {
    const history = Array.isArray(state.achievementHistory) ? state.achievementHistory : []
    if (history.length > previousAchievementCountRef.current && !state.showSettlement) {
      const latest = history[0] as { title?: string; category?: string } | undefined
      if (latest?.title) {
        setAchievementToast({ title: latest.title, category: String(latest.category || 'general') })
      }
    }
    previousAchievementCountRef.current = history.length
  }, [state.achievementHistory, state.showSettlement])

  useEffect(() => {
    if (!achievementToast) return
    const timeout = window.setTimeout(() => setAchievementToast(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [achievementToast])
  
  const verifyEnabled = state.ledger && state.ledger.length ? state.ledger.every((t: any) => t.done) : false

  const handleCelebrationComplete = () => {
    dispatch({ type: 'CLEAR_CELEBRATION' })
  }

  const handleBeginMonth = () => {
    const savings = parseFloat((document.getElementById('pay-save') as HTMLInputElement).value) || 0
    const debtPayment = parseFloat((document.getElementById('pay-debt') as HTMLInputElement).value) || 0
    const currentDebt = Math.max(0, Number(state.debt || 0))
    const totalPayment = savings + debtPayment

    if (debtPayment > currentDebt) {
      setPaymentInputWarning('Debt payment cannot exceed your remaining debt balance.')
      alert(`⚠️ Debt payment exceeds your current debt balance.\n\nCurrent debt: $${currentDebt.toFixed(2)}\nAttempted debt payment: $${debtPayment.toFixed(2)}\n\nPlease enter a debt payment that is less than or equal to your current debt.`)
      return
    }
    
    // Validate that payments won't cause negative balance
    if (!validatePaymentInput(savings, debtPayment)) {
      setPaymentInputWarning('Combined savings + debt payment cannot exceed checking balance.')
      alert(`⚠️ Your combined payments ($${totalPayment.toFixed(2)}) exceed your checking balance ($${state.check.toFixed(2)}).\n\nPlease adjust your payments or use the Skip Payment option if needed.`)
      return
    }

    setPaymentInputWarning(null)
    
    // Check if this would result in negative checking balance (should not happen with validation)
    if (state.check - totalPayment < 0) {
      const loanNeeded = Math.abs(state.check - totalPayment)
      setAutoLoanAmount(loanNeeded)
      setPendingPayments({ savings, debt: debtPayment, skipped: false })
      setMonthPreview(buildMonthPreview(savings, debtPayment, false, loanNeeded))
      setShowMonthPreview(true)
    } else {
      setPendingPayments({ savings, debt: debtPayment, skipped: false })
      setMonthPreview(buildMonthPreview(savings, debtPayment, false, 0))
      setShowMonthPreview(true)
    }
  }

  const estimateDebtPayoffMonths = (debtBalance: number, monthlyPayment: number, annualAPR: number) => {
    if (debtBalance <= 0) return 0
    if (monthlyPayment <= 0) return Number.POSITIVE_INFINITY
    const monthlyRate = annualAPR / 12
    const firstInterest = debtBalance * monthlyRate
    if (monthlyPayment <= firstInterest) return Number.POSITIVE_INFINITY

    let bal = debtBalance
    let months = 0
    while (bal > 0 && months < 1200) {
      bal = bal + (bal * monthlyRate) - monthlyPayment
      months += 1
    }
    return bal <= 0 ? months : Number.POSITIVE_INFINITY
  }

  const formatMonths = (months: number) => {
    if (!Number.isFinite(months)) return 'Not paying down at current rate'
    if (months <= 0) return 'Paid off now'
    const years = Math.floor(months / 12)
    const rem = months % 12
    if (years <= 0) return `${months} month${months === 1 ? '' : 's'}`
    if (rem === 0) return `${years} year${years === 1 ? '' : 's'}`
    return `${years}y ${rem}m`
  }

  const buildMonthPreview = (savings: number, debtPayment: number, skippedPayment: boolean, autoLoanNeeded: number) => {
    const monthlyIncome = Math.round((state.job.base || 0) * (state.city.p || 1) * 0.8)
    const baselineOut = Array.isArray(state.ledger)
      ? state.ledger.reduce((sum: number, row: any) => {
          if (row?.type !== 'out') return sum
          const desc = String(row?.desc || '').toLowerCase()
          if (desc.includes('previous balance')) return sum
          return sum + Number(row?.amt || 0)
        }, 0)
      : 0

    const debtAfterPayment = Math.max(0, Number(state.debt || 0) - (skippedPayment ? 0 : debtPayment))
    const projectedDebtInterest = debtAfterPayment > 0 ? debtAfterPayment * (dynamicAPR / 12) : 0
    const projectedSavingsBase = Math.max(0, Number(state.savings || 0) + savings)
    const projectedSavingsInterest = projectedSavingsBase > 0 ? projectedSavingsBase * (gameValues.hysaAPR / 12) : 0
    const projectedDebtPayoffMonths = estimateDebtPayoffMonths(debtAfterPayment, skippedPayment ? 0 : debtPayment, dynamicAPR)
    const projectedDividendIncome = Math.round(((Array.isArray(state.portfolio) ? state.portfolio : []).reduce((sum: number, holding: any) => {
      const ticker = String(holding?.ticker || '')
      const shares = Number(holding?.shares || 0)
      if (!ticker || shares <= 0) return sum
      const asset = stockMarketAssets.find((a: any) => a.ticker === ticker)
      const annualYield = Number((asset as any)?.dividendYield || 0)
      if (!asset || annualYield <= 0) return sum
      const price = Number((state.marketPrices || {})[ticker] || asset.basePrice || 0)
      if (price <= 0) return sum
      return sum + (shares * price * (annualYield / 12))
    }, 0)) * 100) / 100

    const activeEduName = String(state.activeEdu || '')
    const activeCourse = Array.isArray(academyCourses)
      ? academyCourses.find((c: any) => c.n === activeEduName)
      : null
    const eduDone = Number((state.eduProgress || {})[activeEduName] || 0)
    const eduNeeded = Number(activeCourse?.m || 0)
    const eduRemaining = activeCourse ? Math.max(0, eduNeeded - eduDone) : 0

    const openVehicleLoans = (Array.isArray(state.garage) ? state.garage : []).filter((g: any) => Number(g?.monthsRemaining || 0) > 0)
    const nearestVehiclePayoff = openVehicleLoans.length
      ? Math.min(...openVehicleLoans.map((g: any) => Number(g.monthsRemaining || 0)))
      : 0

    return {
      monthlyIncome,
      baselineOut,
      plannedSavings: savings,
      plannedDebtPayment: skippedPayment ? 0 : debtPayment,
      skippedPayment,
      autoLoanNeeded,
      projectedDebtInterest,
      projectedSavingsInterest,
      projectedDividendIncome,
      projectedDebtPayoffMonths,
      activeEduName,
      eduRemaining,
      hasEducation: !!activeCourse,
      openVehicleLoanCount: openVehicleLoans.length,
      nearestVehiclePayoff,
      nextMonthLabel: new Date(state.year + (state.month === 12 ? 1 : 0), state.month === 12 ? 0 : state.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  const handleConfirmMonthPreview = () => {
    if (!pendingPayments) {
      setShowMonthPreview(false)
      return
    }
    setShowMonthPreview(false)

    const totalPayment = pendingPayments.savings + pendingPayments.debt
    if (state.check - totalPayment < 0) {
      setAutoLoanAmount(Math.abs(state.check - totalPayment))
      setShowAutoLoanConfirm(true)
      return
    }

    processMonth(pendingPayments.savings, pendingPayments.debt, pendingPayments.skipped)
    setPendingPayments(null)
  }

  const handleConfirmSkipPayment = () => {
    if (pendingPayments) {
      processMonth(pendingPayments.savings, 0, true)
      setShowSkipPaymentConfirm(false)
      setPendingPayments(null)
    }
  }

  const handleConfirmAutoLoan = () => {
    if (pendingPayments) {
      processMonth(pendingPayments.savings, pendingPayments.debt, pendingPayments.skipped)
      setShowAutoLoanConfirm(false)
      setPendingPayments(null)
      setAutoLoanAmount(0)
      dispatch({ type: 'UPDATE_CREDIT', payload: Math.max(300, state.credit - 50) })
    }
  }

  const handleAdjustPayments = () => {
    // Close the confirmation modal and let user adjust
    setShowAutoLoanConfirm(false)
    setPendingPayments(null)
    setAutoLoanAmount(0)
  }

  // Validate payment input to prevent negative checking balance
  const validatePaymentInput = (savings: number, debt: number) => {
    if (savings < 0 || debt < 0) return false
    if (debt > Math.max(0, Number(state.debt || 0))) return false
    const totalPayment = savings + debt
    return state.check - totalPayment >= 0
  }

  const handlePaymentChange = () => {
    // Real-time validation as user types
    const savingsEl = document.getElementById('pay-save') as HTMLInputElement
    const debtEl = document.getElementById('pay-debt') as HTMLInputElement
    
    if (savingsEl && debtEl) {
      const savings = parseFloat(savingsEl.value) || 0
      const debt = parseFloat(debtEl.value) || 0
      const debtOverpayment = debt > Math.max(0, Number(state.debt || 0))
      const exceedsChecking = !validatePaymentInput(savings, debt) && !debtOverpayment

      savingsEl.classList.remove('border-rose-500', 'bg-rose-50', 'border-amber-500', 'bg-amber-50')
      debtEl.classList.remove('border-rose-500', 'bg-rose-50', 'border-amber-500', 'bg-amber-50')
      
      if (debtOverpayment) {
        setPaymentInputWarning('Debt payment cannot exceed your remaining debt balance.')
        debtEl.classList.add('border-amber-500', 'bg-amber-50')
      } else if (exceedsChecking) {
        setPaymentInputWarning('Combined savings + debt payment cannot exceed checking balance.')
        // Show visual feedback that combined input would overdraw checking
        savingsEl.classList.add('border-rose-500', 'bg-rose-50')
        debtEl.classList.add('border-rose-500', 'bg-rose-50')
      } else {
        setPaymentInputWarning(null)
      }
    }
  }

  return (
    <div
      className="app-shell"
      style={{
        ['--app-accent' as any]: activeTheme.accent,
        ['--app-bg' as any]: activeTheme.bg,
        ['--app-gradient' as any]: activeTheme.gradient,
        ['--app-pattern' as any]: activeTheme.pattern,
        ['--glass-bg' as any]: activeTheme.glassBg,
        ['--glass-border' as any]: activeTheme.glassBorder,
      }}
    >
        { !state.currentUser ? (
          <Login />
        ) : (
          <>
            <Celebration 
              event={state.celebration} 
              onComplete={handleCelebrationComplete} 
            />
            {achievementToast && (
              <div className="fixed top-[calc(env(safe-area-inset-top,0px)+0.75rem)] right-3 sm:top-5 sm:right-5 z-50 max-w-sm w-[calc(100vw-1.5rem)] sm:w-auto bg-white border border-emerald-200 shadow-xl rounded-2xl px-4 py-3">
                <p className="text-[10px] uppercase font-bold tracking-wide text-emerald-600">Achievement Unlocked</p>
                <p className="text-sm font-bold text-slate-900">{achievementToast.title}</p>
                <p className="text-xs text-slate-500 mt-1">Category: {achievementToast.category} • Reward spin added</p>
              </div>
            )}
            <Header state={state} onVerify={openSettlement} verifyEnabled={verifyEnabled} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:p-7 xl:p-9 max-w-[98vw] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-7 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)]">
              <Nav tab={tab} setTab={setTab} />
              <div 
                className="md:col-span-10 overflow-y-visible md:overflow-y-auto overflow-x-hidden pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:pb-20 tab-panel md:min-h-[calc(100vh-130px)]">
                <Suspense fallback={<div className="glass p-5 text-sm text-slate-600">Loading tab...</div>}>
                  <TabContent tab={tab} />
                </Suspense>
              </div>
            </main>
            <footer className="px-4 pb-4 text-right text-[10px] text-slate-400 sm:px-7 xl:px-9">
              v{__APP_VERSION__}
            </footer>
          </>
        )}
      {state.showSettlement && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => dispatch({ type: 'SET_STATE', payload: { showSettlement: false } })}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
              aria-label="Close reconciliation"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-2">Reconciliation</h2>
            <div className="mb-6 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">Journal verified.</div>
            {state.applicationResults && state.applicationResults.length ? (
              <div className="mb-4">
                {state.applicationResults.map((res: any) => {
                  const chosen = state.applications.find((a: any) => a.id === res.id && a.chosen)
                  return (
                    <div key={res.id} className="flex items-center justify-between mb-2">
                      <div>
                        {res.status === 'accepted' ? <span className="text-green-600 font-bold">✅ HIRED: </span> : <span className="text-rose-600 font-bold">❌ REJECTED: </span>}
                        <span className="font-bold">{res.title}</span>
                        {res.job?.base ? <span className="text-slate-500 ml-2"> — ${Math.round(res.job.base * state.city.p * 0.8)}/mo</span> : null}
                      </div>
                      {res.status === 'accepted' ? (
                        chosen ? (
                          <button disabled className="py-1 px-3 bg-emerald-700 text-white rounded text-xs font-bold">ACCEPTED</button>
                        ) : (
                          <button onClick={() => acceptJob(res.id)} className="py-1 px-3 bg-emerald-600 text-white rounded text-xs font-bold">Accept</button>
                        )
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Transfer to Savings <span className="text-xs text-slate-400">(HYSA: {(gameValues.hysaAPR * 100).toFixed(2)}% APY)</span></label>
                <input 
                  type="number" 
                  id="pay-save" 
                  min="0"
                  max={state.check}
                  onChange={handlePaymentChange}
                  className="w-full p-4 border rounded-xl font-bold mt-1" 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pay Toward Debt <span className="text-xs text-slate-400">(Credit: {state.credit} • Dynamic APR: {(dynamicAPR * 100).toFixed(2)}%)</span></label>
                <input 
                  type="number" 
                  id="pay-debt" 
                  min="0"
                  max={Math.min(Number(state.check || 0), Math.max(0, Number(state.debt || 0)))}
                  onChange={handlePaymentChange}
                  className="w-full p-4 border rounded-xl font-bold mt-1" 
                  placeholder="0.00" 
                />
              </div>
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded">
                <div>Available Checking: <span className="font-bold">${state.check.toFixed(2)}</span></div>
                <div className="mt-1">Max Combined Payment: <span className="font-bold">${state.check.toFixed(2)}</span></div>
                <div className="mt-1">Max Debt Payment: <span className="font-bold">${Math.max(0, Number(state.debt || 0)).toFixed(2)}</span></div>
              </div>
              {paymentInputWarning && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  {paymentInputWarning}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => dispatch({ type: 'SET_STATE', payload: { showSettlement: false } })}
                className="bg-slate-200 text-slate-900 py-4 px-4 rounded-2xl font-bold uppercase hover:bg-slate-300"
              >
                Close
              </button>
              <button
                onClick={handleBeginMonth} 
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase hover:bg-slate-800">
                Begin Next Month
              </button>
            </div>
          </div>
        </div>
      )}

      {showSkipPaymentConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2 text-amber-600">⚠️ Skip Payment?</h2>
            <div className="mb-6 text-sm text-slate-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
              <p className="mb-2">Skipping your debt payment this month will:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Reduce your credit score by 50 points</li>
                <li>Reset your payment streak to 0</li>
                <li>Your loan will still accrue interest</li>
              </ul>
            </div>
            <div className="bg-slate-100 p-4 rounded-xl mb-6 text-sm">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Current Credit:</span>
                <span className="text-lg">{state.credit}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold">
                <span>After Skip:</span>
                <span>{Math.max(300, state.credit - 50)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmSkipPayment}
                className="flex-1 bg-amber-600 text-white py-3 rounded-xl font-bold"
              >
                Confirm Skip
              </button>
              <button
                onClick={() => setShowSkipPaymentConfirm(false)}
                className="flex-1 bg-slate-300 text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showMonthPreview && monthPreview && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2">📋 Monthly Preview</h2>
            <p className="text-sm text-slate-600 mb-5">Estimated summary before starting <span className="font-bold">{monthPreview.nextMonthLabel}</span>.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-sm">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Money In</p>
                <p className="font-bold text-emerald-800">Salary: ${Number(monthPreview.monthlyIncome || 0).toLocaleString()}</p>
                <p className="text-emerald-700">Savings interest est.: +${Number(monthPreview.projectedSavingsInterest || 0).toFixed(2)}</p>
                <p className="text-emerald-700">Dividend income est.: +${Number(monthPreview.projectedDividendIncome || 0).toFixed(2)}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-rose-700">Money Out</p>
                <p className="font-bold text-rose-800">Baseline monthly outflow est.: ${Number(monthPreview.baselineOut || 0).toFixed(2)}</p>
                <p className="text-rose-700">Debt interest est.: +${Number(monthPreview.projectedDebtInterest || 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-slate-500">Planned Payments</p>
                <p>Savings transfer: <span className="font-bold">${Number(monthPreview.plannedSavings || 0).toFixed(2)}</span></p>
                <p>Debt payment: <span className="font-bold">${Number(monthPreview.plannedDebtPayment || 0).toFixed(2)}</span></p>
                {monthPreview.autoLoanNeeded > 0 && (
                  <p className="text-rose-700 font-bold mt-1">Auto-loan would be needed: ${Number(monthPreview.autoLoanNeeded || 0).toFixed(2)}</p>
                )}
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-slate-500">Payoff Timelines</p>
                <p>Debt payoff est.: <span className="font-bold">{formatMonths(Number(monthPreview.projectedDebtPayoffMonths || 0))}</span></p>
                <p>Vehicle loans open: <span className="font-bold">{Number(monthPreview.openVehicleLoanCount || 0)}</span></p>
                <p>Nearest vehicle payoff: <span className="font-bold">{monthPreview.openVehicleLoanCount > 0 ? formatMonths(Number(monthPreview.nearestVehiclePayoff || 0)) : 'None'}</span></p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 text-sm">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Education Progress</p>
              {monthPreview.hasEducation ? (
                <p>
                  <span className="font-bold">{monthPreview.activeEduName}</span> remaining time: <span className="font-bold">{formatMonths(Number(monthPreview.eduRemaining || 0))}</span>
                </p>
              ) : (
                <p>No active degree or certification this month.</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMonthPreview(false)}
                className="flex-1 bg-slate-200 text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-300"
              >
                Back
              </button>
              <button
                onClick={handleConfirmMonthPreview}
                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800"
              >
                Confirm & Start Month
              </button>
            </div>
          </div>
        </div>
      )}

      {showAutoLoanConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-2 text-rose-600">⚠️ Auto-Loan Alert</h2>
            <div className="mb-6 text-sm text-slate-700 bg-rose-50 p-4 rounded-xl border border-rose-200">
              Your payments will exceed your checking balance. An automatic loan will be created to cover the shortfall.
            </div>
            
            <div className="space-y-4 mb-8 bg-slate-50 p-4 rounded-xl">
              <div className="flex justify-between">
                <span className="text-slate-600">Current Checking:</span>
                <span className="font-bold">${state.check.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Planned Payments:</span>
                <span className="font-bold text-rose-600">-${((pendingPayments?.savings || 0) + (pendingPayments?.debt || 0)).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold">Auto-Loan Amount:</span>
                <span className="font-bold text-lg text-rose-600">${autoLoanAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">APR:</span>
                <span className="font-semibold">{(gameValues.loanAPR * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Monthly Interest:</span>
                <span className="font-semibold text-rose-500">${(autoLoanAmount * (gameValues.loanAPR / 12)).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleConfirmAutoLoan}
                className="w-full bg-rose-600 text-white py-3 rounded-xl font-bold"
              >
                Accept Auto-Loan & Continue
              </button>
              <button
                onClick={handleAdjustPayments}
                className="w-full bg-slate-200 text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-300"
              >
                Adjust Payments
              </button>
            </div>
          </div>
        </div>
      )}

      {eventPopup && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-3 sm:p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            {(() => {
              const dialog = eventDialogCopy(eventPopup)
              return (
                <>
                  <div className="inline-block mb-2 px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                    {dialog.badge}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">{eventPopup.icon || '🗞️'} {dialog.headline}</h2>
                  <p className="text-sm text-slate-600 mb-3">{dialog.toneLine}</p>
                </>
              )
            })()}
            <div className="mb-4 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-900">{eventPopup.title}</p>
              <p className="mt-1">{eventPopup.desc || '"Expect the unexpected." -Heraclitus'}</p>
            </div>

            <div className="bg-slate-100 p-4 rounded-xl mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Financial Impact:</span>
                <span className={`font-bold ${eventPopup.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {eventPopup.type === 'in' ? '+' : '-'}${Number(eventPopup.amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-slate-600">Date:</span>
                <span className="font-semibold">{eventPopup.month}/{eventPopup.year}</span>
              </div>
            </div>

            <button
              onClick={() => setEventPopup(null)}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800"
            >
              {eventDialogCopy(eventPopup).continueLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


export default App
