import { useGame } from '../context/GameContext'
import type { Job } from '../types/models.types'
import { useMemo, useState } from 'react'

type ScoreBreakdown = {
  total: number
  education: number
  certificate: number
  transit: number
  payBump: number
}

const EDU_LEVEL: Record<string, number> = {
  'HS Diploma': 0,
  'Trade Cert': 1,
  'Bachelors Degree': 2,
  'Masters Degree': 3,
  'PhD': 4,
  'Medical School': 3
}

type SortKey = 'best-match' | 'certificates' | 'transit' | 'highest-pay' | 'lowest-pay' | 'alpha' | 'highest-edu' | 'lowest-edu'
type CareerView = 'recommended' | 'all'

export default function Careers() {
  const { state, applyForJob, jobBoard } = useGame()
  const [sort, setSort] = useState<SortKey>('best-match')
  const [view, setView] = useState<CareerView>('all')
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)

  // scoring for recommendation: favors certificate match, transportation match, education match, and pay bump
  const scoreJob = (j: Job): ScoreBreakdown => {
    let education = 0
    let certificate = 0
    let transit = 0
    let payBump = 0

    const currentPay = (state.job?.base || 0) * state.city.p * 0.8
    const jobPay = j.base * state.city.p * 0.8

    if (!j.req || state.credentials.includes(j.req)) {
      education = 30
    } else {
      education = -15
    }

    if (!j.certReq || state.credentials.includes(j.certReq)) {
      certificate = 35
    } else {
      certificate = -10
    }

    if (state.transit.level >= j.tReq) {
      transit = 20
    }

    const payBumpAmount = Math.max(0, jobPay - currentPay)
    payBump = Math.min(25, Math.round((payBumpAmount / Math.max(1, currentPay)) * 100))

    const total = education + certificate + transit + payBump

    return { total, education, certificate, transit, payBump }
  }

  // Get recommendations excluding current job, sorted by score
  const recommendations = useMemo(() => {
    const candidates: { job: Job; breakdown: ScoreBreakdown }[] = jobBoard
      .filter((j: Job) => j.title !== state.job?.title) // Exclude current job
      .map((j: Job) => ({
        job: j,
        breakdown: scoreJob(j)
      }))
    candidates.sort((a, b) => b.breakdown.total - a.breakdown.total)
    return candidates
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
        return copy.sort((a, b) => scoreJob(b).total - scoreJob(a).total)
    }
  }, [jobBoard, sort, state.credentials, state.transit, state.job, state.city])

  return (
    <div>
      {/* View Toggle */}
      <div className="mb-6 flex gap-3 border-b border-slate-300">
        <button
          onClick={() => setView('recommended')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${
            view === 'recommended'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📊 Recommended
        </button>
        <button
          onClick={() => setView('all')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-colors ${
            view === 'all'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          💼 All Jobs
        </button>
      </div>

      {/* Recommended Jobs View */}
      {view === 'recommended' && (
        <>
          {recommendations.length > 0 ? (
            <div className="glass p-6 mb-4">
              <h3 className="font-bold text-lg mb-4">Jobs matched to your profile (sorted by match score)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th className="text-left py-3 px-3 font-bold text-slate-700">Job Title</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">Better Pay?</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">✓ Education</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">✓ Certificate</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">✓ Transport</th>
                      <th className="text-center py-3 px-3 font-bold text-slate-700">Score</th>
                      <th className="text-right py-3 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map(({ job: j, breakdown }) => {
                      const edMet = !j.req || state.credentials.includes(j.req)
                      const certMet = !j.certReq || state.credentials.includes(j.certReq)
                      const trMet = state.transit.level >= j.tReq
                      const canApply = edMet && certMet && trMet
                      const hasApplied = state.applications.some((a: any) => a.job.title === j.title && a.status === 'pending')
                      const currentPay = (state.job?.base || 0) * state.city.p * 0.8
                      const jobPay = j.base * state.city.p * 0.8
                      const payIncrease = jobPay - currentPay
                      const payIncreasePercent = currentPay > 0 ? Math.round((payIncrease / currentPay) * 100) : 0

                      return (
                        <tr key={j.title} className={`border-b border-slate-200 hover:bg-slate-50 ${!canApply ? 'opacity-60' : ''}`}>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{j.title}</div>
                            <div className="text-xs text-slate-500">${Math.round(jobPay)}/mo</div>
                          </td>
                          <td className="text-center py-3 px-3">
                            {payIncrease > 0 ? (
                              <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">
                                +${Math.round(payIncrease)} ({payIncreasePercent}%)
                              </span>
                            ) : payIncrease === 0 ? (
                              <span className="text-xs text-slate-400">Same</span>
                            ) : (
                              <span className="text-xs text-rose-600">−${Math.round(Math.abs(payIncrease))}</span>
                            )}
                          </td>
                          <td className="text-center py-3 px-3 relative">
                            <div
                              onMouseEnter={() => setHoveredTooltip(`${j.title}-edu`)}
                              onMouseLeave={() => setHoveredTooltip(null)}
                              className="cursor-help inline-block"
                            >
                              {edMet ? (
                                <span className="text-lg">✅</span>
                              ) : (
                                <span className="text-lg">❌</span>
                              )}
                            </div>
                            {hoveredTooltip === `${j.title}-edu` && (
                              <div className="absolute z-10 bg-slate-900 text-white text-xs rounded p-2 whitespace-nowrap bottom-full mb-2 left-1/2 transform -translate-x-1/2">
                                {edMet ? (
                                  <div>{j.req ? `✓ Have ${j.req}` : '✓ No requirement'}</div>
                                ) : (
                                  <div>Need: {j.req}</div>
                                )}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-slate-900 border-t-slate-900 border-l-transparent border-r-transparent"></div>
                              </div>
                            )}
                          </td>
                          <td className="text-center py-3 px-3 relative">
                            <div
                              onMouseEnter={() => setHoveredTooltip(`${j.title}-cert`)}
                              onMouseLeave={() => setHoveredTooltip(null)}
                              className="cursor-help inline-block"
                            >
                              {!j.certReq ? (
                                <span className="text-xs text-slate-400">—</span>
                              ) : certMet ? (
                                <span className="text-lg">✅</span>
                              ) : (
                                <span className="text-lg">❌</span>
                              )}
                            </div>
                            {hoveredTooltip === `${j.title}-cert` && (
                              <div className="absolute z-10 bg-slate-900 text-white text-xs rounded p-2 whitespace-nowrap bottom-full mb-2 left-1/2 transform -translate-x-1/2">
                                {!j.certReq ? (
                                  <div>No requirement</div>
                                ) : certMet ? (
                                  <div>✓ Have {j.certReq}</div>
                                ) : (
                                  <div>Need: {j.certReq}</div>
                                )}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-slate-900 border-t-slate-900 border-l-transparent border-r-transparent"></div>
                              </div>
                            )}
                          </td>
                          <td className="text-center py-3 px-3 relative">
                            <div
                              onMouseEnter={() => setHoveredTooltip(`${j.title}-transit`)}
                              onMouseLeave={() => setHoveredTooltip(null)}
                              className="cursor-help inline-block"
                            >
                              {trMet ? (
                                <span className="text-lg">✅</span>
                              ) : (
                                <span className="text-lg">❌</span>
                              )}
                            </div>
                            {hoveredTooltip === `${j.title}-transit` && (
                              <div className="absolute z-10 bg-slate-900 text-white text-xs rounded p-2 whitespace-nowrap bottom-full mb-2 left-1/2 transform -translate-x-1/2">
                                {trMet ? (
                                  <div>✓ Have Level {state.transit.level}</div>
                                ) : (
                                  <div>Need: Level {j.tReq}, Have: Level {state.transit.level}</div>
                                )}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-slate-900 border-t-slate-900 border-l-transparent border-r-transparent"></div>
                              </div>
                            )}
                          </td>
                          <td className="text-center py-3 px-3">
                            <div className="font-bold text-slate-900">{breakdown.total}</div>
                            <div className="text-xs text-slate-500">
                              E:{breakdown.education > 0 ? '+' : ''}{breakdown.education} 
                              {' '}C:{breakdown.certificate > 0 ? '+' : ''}{breakdown.certificate}
                            </div>
                          </td>
                          <td className="text-right py-3 px-3">
                            <button
                              onClick={() => applyForJob(j)}
                              disabled={!canApply || hasApplied}
                              className={`py-1 px-3 rounded text-xs font-bold ${
                                hasApplied 
                                  ? 'bg-amber-500 text-white cursor-not-allowed' 
                                  : canApply 
                                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {hasApplied ? 'APPLIED' : 'APPLY'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass p-6 mb-4 text-center text-slate-600">
              No recommended jobs available. Earn more credentials to unlock opportunities!
            </div>
          )}
        </>
      )}

      {/* All Jobs View */}
      {view === 'all' && (
        <>
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
        </>
      )}
    </div>
  )
}
