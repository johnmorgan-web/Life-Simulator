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
  'Medical School': 3,
  'Flight School': 3
}

// Calculate job compatibility score for current job (0-100 scale)
function calculateJobCompatibilityScore(job: Job, credentials: string[], transitLevel: number): number {
  let score = 50 // Base score
  
  // Education requirement (±20 points)
  if (job.req && credentials.includes(job.req)) {
    score += 20
  } else if (job.req) {
    score -= 15
  }
  
  // Certificate requirement (±15 points)
  if (job.certReq) {
    if (credentials.includes(job.certReq)) {
      score += 15
    } else {
      score -= 10
    }
  }
  
  // Transit requirement (±15 points)
  if (transitLevel >= job.tReq) {
    score += 15
  } else {
    score -= 10
  }
  
  return Math.max(0, Math.min(100, score))
}

type SortKey = 'best-match' | 'certificates' | 'transit' | 'highest-pay' | 'lowest-pay' | 'alpha' | 'highest-edu' | 'lowest-edu'
type CareerView = 'recommended' | 'all'

export default function Careers() {
  const { state, applyForJob, jobBoard, calculatePayNegotiationModifier, dispatch } = useGame()
  const [sort, setSort] = useState<SortKey>('best-match')
  const [view, setView] = useState<CareerView>('all')
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const [showNegotiationModal, setShowNegotiationModal] = useState(false)
  const [negotiationModifier, setNegotiationModifier] = useState(0)

  // Check if user can negotiate pay (6 month cooldown)
  const canNegotiatePay = useMemo(() => {
    if (!state.lastNegotiationMonth || !state.lastNegotiationYear) return true
    const monthsSinceLastNegotiation = (state.year - state.lastNegotiationYear) * 12 + (state.month - state.lastNegotiationMonth)
    return monthsSinceLastNegotiation >= 6
  }, [state.lastNegotiationMonth, state.lastNegotiationYear, state.month, state.year])

  // Get months until next negotiation eligible
  const monthsUntilNegotiationEligible = useMemo(() => {
    if (canNegotiatePay) return 0
    if (!state.lastNegotiationMonth || !state.lastNegotiationYear) return 0
    const monthsSince = (state.year - state.lastNegotiationYear) * 12 + (state.month - state.lastNegotiationMonth)
    return 6 - monthsSince
  }, [canNegotiatePay, state.lastNegotiationMonth, state.lastNegotiationYear, state.month, state.year])

  // Handle negotiation button click
  const handleNegotiatePay = () => {
    const compatibilityScore = calculateJobCompatibilityScore(state.job, state.credentials, state.transit.level)
    const result = calculatePayNegotiationModifier(state.credit, state.tenure, compatibilityScore)
    setNegotiationModifier(result.modifier)
    setShowNegotiationModal(true)
  }

  // Confirm negotiation
  const handleConfirmNegotiation = () => {
    dispatch({ type: 'NEGOTIATE_PAY', payload: { negotiationModifier } })
    setShowNegotiationModal(false)
  }

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
      {/* Current Job Section */}
      <div className="glass p-6 mb-6 border-l-4 border-emerald-600">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-1">Current Position</h3>
            <p className="text-2xl font-bold text-emerald-600 mb-2">{state.job.title}</p>
            <div className="text-sm text-slate-600 space-y-1">
              <p>📊 Base Salary: <span className="font-bold">${state.job.base.toFixed(0)}/mo</span></p>
              <p>💰 Net Monthly: <span className="font-bold">${Math.round(state.job.base * state.city.p * 0.8)}/mo</span></p>
              <p>⏱️ Tenure: <span className="font-bold">{state.tenure} months</span></p>
            </div>
          </div>
          {canNegotiatePay ? (
            <button
              onClick={handleNegotiatePay}
              className="py-3 px-6 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
            >
              💼 Negotiate Pay
            </button>
          ) : (
            <div className="text-right">
              <button disabled className="py-3 px-6 bg-slate-300 text-slate-500 rounded-lg font-bold cursor-not-allowed">
                Negotiate Cooldown
              </button>
              <p className="text-xs text-slate-500 mt-2">
                Available in {monthsUntilNegotiationEligible} month{monthsUntilNegotiationEligible !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

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

      {/* Negotiation Modal */}
      {showNegotiationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass p-8 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Pay Negotiation</h2>
            
            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 p-4 rounded">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Current Base Salary</p>
                <p className="text-3xl font-bold text-slate-900">${state.job.base.toFixed(0)}/mo</p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Proposed Increase</p>
                <p className="text-3xl font-bold text-emerald-600">+{negotiationModifier.toFixed(1)}%</p>
              </div>
              
              <div className="bg-emerald-50 border-l-4 border-emerald-600 p-4 rounded">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">New Base Salary</p>
                <p className="text-3xl font-bold text-emerald-700">
                  ${(state.job.base * (1 + negotiationModifier / 100)).toFixed(0)}/mo
                </p>
              </div>

              <div className="bg-slate-100 p-4 rounded text-sm">
                <p className="font-bold text-slate-900 mb-2">Negotiation Breakdown:</p>
                <ul className="space-y-1 text-slate-700">
                  <li>📊 Credit Score: +{(negotiationModifier * 0.4).toFixed(1)}%</li>
                  <li>⏱️ Tenure ({state.tenure}mo): +{(negotiationModifier * 0.32).toFixed(1)}%</li>
                  <li>✅ Job Fit: +{(negotiationModifier * 0.28).toFixed(1)}%</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNegotiationModal(false)}
                className="flex-1 py-2 px-4 bg-slate-200 text-slate-900 rounded font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNegotiation}
                className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition-colors"
              >
                Accept Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
