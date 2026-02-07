import { useGame } from '../context/GameContext'
import type { Job } from '../types/models.types'
import { useMemo, useState } from 'react'

const EDU_LEVEL: Record<string, number> = {
  'HS Diploma': 0,
  'Trade Cert': 1,
  'Bachelors Degree': 2,
  'Masters Degree': 3,
  'PhD': 4,
  'Medical School': 3
}

type SortKey = 'best-match' | 'certificates' | 'transit' | 'highest-pay' | 'lowest-pay' | 'alpha' | 'highest-edu' | 'lowest-edu'

export default function Careers() {
  const { state, applyForJob, jobBoard } = useGame()
  const [sort, setSort] = useState<SortKey>('best-match')

  // scoring for recommendation: favors certificate match, transportation match, education match, and pay bump
  const scoreJob = (j: Job) => {
    let score = 0
    const currentPay = (state.job?.base || 0) * state.city.p * 0.8
    const jobPay = j.base * state.city.p * 0.8
    if (!j.req || state.credentials.includes(j.req)) score += 30
    if (!j.certReq || state.credentials.includes(j.certReq)) score += 35
    if (state.transit.level >= j.tReq) score += 20
    // penalties for missing requirements
    if (j.certReq && !state.credentials.includes(j.certReq)) score -= 10
    if (j.req && !state.credentials.includes(j.req)) score -= 15
    // pay bump preference (normalized)
    const payBump = Math.max(0, jobPay - currentPay)
    score += Math.min(25, Math.round((payBump / Math.max(1, currentPay)) * 100))
    return score
  }

  // Recommend best job
  const recommended = useMemo(() => {
    const candidates: { job: Job; score: number }[] = jobBoard.map((j: Job) => ({ job: j, score: scoreJob(j) }))
    candidates.sort((a: { job: Job; score: number }, b: { job: Job; score: number }) => b.score - a.score)
    return candidates.length ? candidates[0].job : null
  }, [jobBoard, state.credentials, state.transit, state.job, state.city])

  // Sorting
  const sortedJobs = useMemo(() => {
    const copy = [...jobBoard]
    switch (sort) {
      case 'certificates':
        return copy.sort((a, b) => {
          const aHas = a.certReq ? (state.credentials.includes(a.certReq) ? 1 : 0) : 1
          const bHas = b.certReq ? (state.credentials.includes(b.certReq) ? 1 : 0) : 1
          return bHas - aHas
        })
      case 'transit':
        return copy.sort((a, b) => (state.transit.level >= b.tReq ? 1 : 0) - (state.transit.level >= a.tReq ? 1 : 0)).reverse()
      case 'highest-pay':
        return copy.sort((a, b) => b.base - a.base)
      case 'lowest-pay':
        return copy.sort((a, b) => a.base - b.base)
      case 'alpha':
        return copy.sort((a, b) => a.title.localeCompare(b.title))
      case 'highest-edu':
        return copy.sort((a, b) => (EDU_LEVEL[b.req || 'HS Diploma'] || 0) - (EDU_LEVEL[a.req || 'HS Diploma'] || 0))
      case 'lowest-edu':
        return copy.sort((a, b) => (EDU_LEVEL[a.req || 'HS Diploma'] || 0) - (EDU_LEVEL[b.req || 'HS Diploma'] || 0))
      case 'best-match':
      default:
        return copy.sort((a, b) => scoreJob(b) - scoreJob(a))
    }
  }, [jobBoard, sort, state.credentials, state.transit, state.job, state.city])

  return (
    <div>
      {/* Recommendation Section */}
      {recommended ? (
        <div className="glass p-4 mb-4">
          <h3 className="font-bold">Recommended Next Step</h3>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="font-bold text-lg">{recommended.title}</div>
              <div className="text-emerald-600 font-bold">${Math.round(recommended.base * state.city.p * 0.8)}/mo</div>
              <div className="mt-2 flex gap-2">
                <span className={`req-tag ${!recommended.req || state.credentials.includes(recommended.req) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{recommended.req || 'No Edu'}</span>
                {recommended.certReq && <span className={`req-tag ${state.credentials.includes(recommended.certReq) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{recommended.certReq}</span>}
                <span className={`req-tag ${state.transit.level >= recommended.tReq ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>Transit L{recommended.tReq}</span>
              </div>
            </div>
            <div>
              <button
                onClick={() => applyForJob(recommended)}
                className={`py-2 px-4 ${(!recommended.req || state.credentials.includes(recommended.req)) && (!recommended.certReq || state.credentials.includes(recommended.certReq)) && state.transit.level >= recommended.tReq ? 'bg-slate-900 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'} rounded-lg font-bold`}
                disabled={!( (!recommended.req || state.credentials.includes(recommended.req)) && (!recommended.certReq || state.credentials.includes(recommended.certReq)) && state.transit.level >= recommended.tReq)}
              >
                Suggest Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sort Controls */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-bold text-slate-500">Sort:</label>
        <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className="p-2 border rounded">
          <option value="best-match">Best Match</option>
          <option value="certificates">Certificates (owned first)</option>
          <option value="transit">By Transit Compatibility</option>
          <option value="highest-pay">Highest Pay</option>
          <option value="lowest-pay">Lowest Pay</option>
          <option value="alpha">Alphabetical</option>
          <option value="highest-edu">Highest Education Req</option>
          <option value="lowest-edu">Lowest Education Req</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {sortedJobs.map((j: Job) => {
          const edMet = !j.req || state.credentials.includes(j.req)
          const certMet = !j.certReq || state.credentials.includes(j.certReq)
          const trMet = state.transit.level >= j.tReq
          const hasApplied = state.applications.some((a: any) => a.job.title === j.title && a.status === 'pending')
          const isCurrent = state.job?.title === j.title
          const canApply = edMet && certMet && trMet

          return (
            <div key={j.title} className={`glass p-5 ${!canApply ? 'card-locked' : ''} ${isCurrent ? 'card-active' : ''}`}>
              <h4 className="font-bold text-sm">{j.title}</h4>
              <p className="text-emerald-600 font-bold">${Math.round(j.base * state.city.p * 0.8)}/mo</p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className={`req-tag ${edMet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{j.req || 'No Edu'}</span>
                {j.certReq && <span className={`req-tag ${certMet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{j.certReq}</span>}
                <span className={`req-tag ${trMet ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>Transit L{j.tReq}</span>
              </div>
              <div className="mt-3">
                {isCurrent ? (
                  <button disabled className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">CURRENT</button>
                ) : (
                  <button
                    onClick={() => applyForJob(j)}
                    disabled={!canApply || hasApplied}
                    className={`w-full py-2 ${hasApplied ? 'bg-amber-500 text-white cursor-not-allowed' : canApply ? 'bg-slate-900 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'} rounded-lg text-xs font-bold`}
                  >
                    {hasApplied ? 'APPLIED' : 'APPLY'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
