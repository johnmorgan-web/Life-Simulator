import React, { useState } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'
import Ledger from './components/Ledger'
import { GameProvider, useGame } from './context/GameContext'
import Careers from './tabs/Careers'
import Academy from './tabs/Academy'
import Transit from './tabs/Transit'
import Relocate from './tabs/Relocate'
import Resume from './tabs/Resume'

function TabContent({ tab }: { tab: string }) {
  const { state, checkRow } = useGame()
  const format = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (tab === 'ledger') return <div className="glass p-6"><Ledger ledger={state.ledger} onCheck={checkRow} format={format} /></div>
  if (tab === 'careers') return <Careers />
  if (tab === 'academy') return <Academy />
  if (tab === 'transit') return <Transit />
  if (tab === 'relocate') return <Relocate />
  if (tab === 'resume') return <Resume />
  return <div className="p-6">Unknown tab</div>
}

export default function App() {
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
  const { state, processMonth, openSettlement, acceptJob } = useGame()
  const verifyEnabled = state.ledger && state.ledger.length ? state.ledger.every((t: any) => t.done) : false

  return (
    <>
      <Header state={state} onVerify={openSettlement} verifyEnabled={verifyEnabled} />
      <main className="flex-1 overflow-hidden p-6 max-w-7xl mx-auto w-full grid grid-cols-12 gap-6">
        <Nav tab={tab} setTab={setTab} />
        <div className="col-span-10 overflow-y-auto pb-20">
          <TabContent tab={tab} />
        </div>
      </main>

  {state.showSettlement && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
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
                <label className="text-[10px] font-bold text-slate-400 uppercase">Transfer to Savings</label>
                <input type="number" id="pay-save" className="w-full p-4 border rounded-xl font-bold mt-1" placeholder="0.00" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pay Toward Debt</label>
                <input type="number" id="pay-debt" className="w-full p-4 border rounded-xl font-bold mt-1" placeholder="0.00" />
              </div>
            </div>
            <button onClick={() => {
              const s = parseFloat((document.getElementById('pay-save') as HTMLInputElement).value) || 0
              const d = parseFloat((document.getElementById('pay-debt') as HTMLInputElement).value) || 0
              processMonth(s, d)
            }} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase">Begin Next Month</button>
          </div>
        </div>
      )}
    </>
  )
}
