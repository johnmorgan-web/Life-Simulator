import React from 'react'
import { useGame } from '../context/GameContext'

export default function Resume() {
  const { state } = useGame()

  return (
    <div className="glass p-6">
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">{state.name}</h2>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold border-b text-xs text-slate-400 mb-2 uppercase">Experience</h3>
            <p className="font-bold text-slate-800">{state.job.title} ({state.tenure} mo)</p>

            <div className="mt-4">
              <h4 className="text-xs text-slate-400 uppercase font-bold mb-2">Career History</h4>
              {state.careerHistory && state.careerHistory.length ? (
                state.careerHistory.map((h: any, i: number) => (
                  <div key={i} className="mb-2 text-sm">• {h.title || h.job?.title} — {h.months ?? h.duration ?? 'n/a'} mo ({h.startMonth}/{h.startYear} → {h.endMonth}/{h.endYear})</div>
                ))
              ) : (
                <p className="text-sm italic text-slate-400">No prior roles</p>
              )}
            </div>

            <p className="text-[10px] text-slate-500 uppercase font-bold mt-4 mb-1">System Log</p>
            <div className="bg-slate-50 p-3 rounded-xl border max-h-40 overflow-y-auto text-[10px] font-mono">
              {state.logs && state.logs.length ? (
                state.logs.map((l: any, i: number) => (
                  <div key={i} className="mb-1 border-b border-slate-100 pb-1">[{l.date}] {l.msg}</div>
                ))
              ) : (
                <div className="text-slate-400">No logs yet</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-bold border-b text-xs text-slate-400 mb-2 uppercase">Credentials</h3>
            {state.credentialHistory && state.credentialHistory.length ? (
              state.credentialHistory.map((c: any, i: number) => (
                <p key={i} className="text-sm font-bold">📜 {c.name} — {c.months} mo ({c.month}/{c.year})</p>
              ))
            ) : (state.credentials && state.credentials.length ? (
              state.credentials.map((c: any, i: number) => (
                <p key={i} className="text-sm font-bold">📜 {c}</p>
              ))
            ) : (
              <p className="text-sm italic text-slate-400">No Degree</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
