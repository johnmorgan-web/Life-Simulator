import { useState } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'
import Celebration from './components/Celebration'
import { GameProvider, useGame } from './context/GameContext'
import Login from './components/Login'
import Ledger from './tabs/Ledger'
import Careers from './tabs/Careers'
import Academy from './tabs/Academy'
import Transit from './tabs/Transit'
import Relocate from './tabs/Relocate'
import Resume from './tabs/Resume'
import Lifestyle from './tabs/Lifestyle'
import Loans from './tabs/Loans'

function TabContent({ tab }: { tab: string }) {
  const { state, checkRow } = useGame()
  const format = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (tab === 'ledger') return <Ledger ledger={state.ledger} onCheck={checkRow} format={format} />
  if (tab === 'careers') return <Careers />
  if (tab === 'academy') return <Academy />
  if (tab === 'transit') return <Transit />
  if (tab === 'relocate') return <Relocate />
  if (tab === 'resume') return <Resume />
  if (tab === 'lifestyle') return <Lifestyle />
  if (tab === 'loans') return <Loans />
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

function InnerApp({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const { state, dispatch, processMonth, openSettlement, acceptJob, gameValues } = useGame()
  const [pendingPayments, setPendingPayments] = useState<{ savings: number; debt: number; skipped: boolean } | null>(null)
  const [showAutoLoanConfirm, setShowAutoLoanConfirm] = useState(false)
  const [showSkipPaymentConfirm, setShowSkipPaymentConfirm] = useState(false)
  const [autoLoanAmount, setAutoLoanAmount] = useState(0)
  
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
  
  const verifyEnabled = state.ledger && state.ledger.length ? state.ledger.every((t: any) => t.done) : false

  const handleCelebrationComplete = () => {
    dispatch({ type: 'CLEAR_CELEBRATION' })
  }

  const handleBeginMonth = () => {
    const savings = parseFloat((document.getElementById('pay-save') as HTMLInputElement).value) || 0
    const debtPayment = parseFloat((document.getElementById('pay-debt') as HTMLInputElement).value) || 0
    const totalPayment = savings + debtPayment
    
    // Validate that payments won't cause negative balance
    if (!validatePaymentInput(savings, debtPayment)) {
      alert(`⚠️ Your combined payments ($${totalPayment.toFixed(2)}) exceed your checking balance ($${state.check.toFixed(2)}).\n\nPlease adjust your payments or use the Skip Payment option if needed.`)
      return
    }
    
    // Check if this would result in negative checking balance (should not happen with validation)
    if (state.check - totalPayment < 0) {
      const loanNeeded = Math.abs(state.check - totalPayment)
      setAutoLoanAmount(loanNeeded)
      setPendingPayments({ savings, debt: debtPayment, skipped: false })
      setShowAutoLoanConfirm(true)
    } else {
      // No loan needed, process normally
      processMonth(savings, debtPayment, false)
    }
  }

  const handleSkipPayment = () => {
    const savings = parseFloat((document.getElementById('pay-save') as HTMLInputElement).value) || 0
    setPendingPayments({ savings, debt: 0, skipped: true })
    setShowSkipPaymentConfirm(true)
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
      
      if (!validatePaymentInput(savings, debt)) {
        // Show visual feedback that input would cause negative balance
        savingsEl.classList.add('border-rose-500', 'bg-rose-50')
        debtEl.classList.add('border-rose-500', 'bg-rose-50')
      } else {
        savingsEl.classList.remove('border-rose-500', 'bg-rose-50')
        debtEl.classList.remove('border-rose-500', 'bg-rose-50')
      }
    }
  }

  return (
    <>
      {!state.currentUser && <Login />}
      <Celebration 
        event={state.celebration} 
        onComplete={handleCelebrationComplete} 
      />
      <Header state={state} onVerify={openSettlement} verifyEnabled={verifyEnabled} />
      <main className="flex-1 overflow-hidden p-6 max-w-7xl mx-auto w-full grid grid-cols-12 gap-6">
        <Nav tab={tab} setTab={setTab} />
        <div 
          className="col-span-10 overflow-y-auto overflow-x-hidden pb-20 tab-panel"
          style={{ minHeight: 'calc(100vh - 130px)'}}>
          <TabContent tab={tab} />
        </div>
      </main>

      {state.showSettlement && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
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
                  max={state.check}
                  onChange={handlePaymentChange}
                  className="w-full p-4 border rounded-xl font-bold mt-1" 
                  placeholder="0.00" 
                />
              </div>
              <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded">
                <div>Available Checking: <span className="font-bold">${state.check.toFixed(2)}</span></div>
                <div className="mt-1">Max Combined Payment: <span className="font-bold">${state.check.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBeginMonth} 
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase hover:bg-slate-800">
                Begin Next Month
              </button>
              {state.debt > 0 && (
                <button
                  onClick={handleSkipPayment}
                  className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-bold uppercase hover:bg-amber-700"
                  title="Skip payment this month (credit score will be impacted)"
                >
                  ⚠️ Skip Payment
                </button>
                 )}
            </div>
          </div>
        </div>
      )}

      {showSkipPaymentConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
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

      {showAutoLoanConfirm && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
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
    </>
  )
}


export default App
