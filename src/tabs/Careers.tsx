import React from 'react'
import { useGame } from '../context/GameContext'
import { Job } from '../types/models'

export default function Careers() {
  const { state, applyForJob, jobBoard } = useGame()

  return (
    <div className="grid grid-cols-3 gap-4">
      {jobBoard.map((j: Job) => {
        const edMet = !j.req || state.credentials.includes(j.req)
        const trMet = state.transit.level >= j.tReq
        const hasApplied = state.applications.some((a: any) => a.job.title === j.title && a.status === 'pending')
        const isCurrent = state.job?.title === j.title
        return (
          <div key={j.title} className={`glass p-5 ${!edMet || !trMet ? 'card-locked' : ''} ${isCurrent ? 'card-active' : ''}`}>
            <h4 className="font-bold text-sm">{j.title}</h4>
            <p className="text-emerald-600 font-bold">${Math.round(j.base * state.city.p * 0.8)}/mo</p>
            <div className="mt-2 flex gap-1">
              <span className={`req-tag ${edMet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{j.req || 'No Edu'}</span>
              <span className={`req-tag ${trMet ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>Transit L{j.tReq}</span>
            </div>
            <div className="mt-3">
              {isCurrent ? <button disabled className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">CURRENT</button> : <button onClick={() => applyForJob(j)} disabled={!edMet || !trMet || hasApplied} className={`w-full py-2 ${hasApplied ? 'bg-amber-500 text-white cursor-not-allowed' : 'bg-slate-900 text-white'} rounded-lg text-xs font-bold`}>{hasApplied ? 'APPLIED' : 'APPLY'}</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
