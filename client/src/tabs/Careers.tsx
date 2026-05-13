import { useGame } from '../context/GameContext'
import type { Job } from '@server/types/models.types'
import { useMemo, useState } from 'react'
import { resolveDomainKey, domainBadgeStyle } from '../constants/domainColors.constants'

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
    score -= 20
  }
  
  // Certificate requirement (±15 points)
  if (job.certReq) {
    if (credentials.includes(job.certReq)) {
      score += 15
    } else {
      score -= 15
    }
  }
  
  // Transit requirement (±15 points)
  if (transitLevel >= job.tReq) {
    score += 15
  } else {
    score -= 15
  }
  
  return Math.max(0, Math.min(100, score))
}

function buildPrereqChain(credName: string | null, courses: any[]): any[] {
  if (!credName) return []
  const chain: any[] = []
  let current: string | null = credName
  const seen = new Set<string>()
  while (current && !seen.has(current)) {
    seen.add(current)
    const course = courses.find((c: any) => c.n === current)
    if (!course) break
    chain.unshift(course)
    current = course.prereq ?? null
  }
  return chain
}

type SortKey = 'best-match' | 'certificates' | 'transit' | 'highest-pay' | 'lowest-pay' | 'alpha' | 'highest-edu' | 'lowest-edu'
type CareerView = 'recommended' | 'all' | 'tree'
type ProgressTrack = {
  groupName: string
  jobs: Job[]
}

const WEALTH_NET_WORTH_REQUIREMENTS: Record<string, number> = {
  'Tech Startup Founder': 250000,
  Millionaire: 500000,
  Billionaire: 50000000,
}

function estimateNetWorth(state: any) {
  const checking = Number(state?.check || 0)
  const savings = Number(state?.savings || 0)
  const debt = Math.abs(Number(state?.debt || 0))
  const portfolio = (Array.isArray(state?.portfolio) ? state.portfolio : []).reduce((sum: number, holding: any) => {
    const shares = Number(holding?.shares || 0)
    const avgCost = Number(holding?.avgCost || 0)
    return sum + shares * avgCost
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
  return Math.round((checking + savings + portfolio + vehicleAssets + realEstateEquity - debt) * 100) / 100
}

export default function Careers() {
  const { state, applyForJob, jobBoard, calculatePayNegotiationModifier, dispatch, getJobEligibility, academyCourses } = useGame()
  const [sort, setSort] = useState<SortKey>('best-match')
  const [view, setView] = useState<CareerView>('all')
  const [goalJobTitle, setGoalJobTitle] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const [showNegotiationModal, setShowNegotiationModal] = useState(false)
  const [negotiationModifier, setNegotiationModifier] = useState(0)
  const [negotiationDetails, setNegotiationDetails] = useState<null | {
    creditContribution: number
    tenureContribution: number
    compatibilityContribution: number
    compatibilityScore: number
  }>(null)
  const [calculatedRaiseInput, setCalculatedRaiseInput] = useState('')
  const [calculatedSalaryInput, setCalculatedSalaryInput] = useState('')
  const [negotiationCalcError, setNegotiationCalcError] = useState<string | null>(null)
  const [showNegotiationPracticeMode, setShowNegotiationPracticeMode] = useState(false)
  const [applyingJobTitle, setApplyingJobTitle] = useState<string | null>(null)
  const [applyFeedback, setApplyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const netWorth = useMemo(() => estimateNetWorth(state), [state.check, state.savings, state.debt, state.portfolio, state.garage, state.investmentProperties])

  const handleApplyJob = async (job: Job) => {
    setApplyingJobTitle(job.title)
    const result = await applyForJob(job)
    setApplyingJobTitle(null)

    if (!result) {
      setApplyFeedback({ type: 'error', message: `Application could not be submitted for ${job.title}. Please try again.` })
      return
    }

    if (result.ok) {
      setApplyFeedback({ type: 'success', message: String(result.message || `Applied for ${job.title}`) })
      return
    }

    setApplyFeedback({ type: 'error', message: String(result.message || `Application blocked for ${job.title}`) })
  }

  const isJobVisible = (job: Job) => {
    const threshold = Number(WEALTH_NET_WORTH_REQUIREMENTS[job.title] || 0)
    return threshold <= 0 || netWorth >= threshold
  }

  const getRoleExperienceMonths = (roleTitle: string) => {
    let months = 0
    if (state.job?.title === roleTitle) months += state.tenure || 0
    const history = Array.isArray(state.careerHistory) ? state.careerHistory : []
    for (const role of history) {
      if (role?.title === roleTitle) months += role?.months || 0
    }
    return months
  }

  const monthsSinceLastNegotiation = useMemo(() => {
    if (state.lastNegotiationMonth == null || state.lastNegotiationYear == null) return null
    return (state.year - state.lastNegotiationYear) * 12 + (state.month - state.lastNegotiationMonth)
  }, [state.lastNegotiationMonth, state.lastNegotiationYear, state.month, state.year])

  const negotiationCooldownRemaining = useMemo(() => {
    if (monthsSinceLastNegotiation == null) return 0
    return Math.max(0, 6 - monthsSinceLastNegotiation)
  }, [monthsSinceLastNegotiation])

  const tenureUntilNegotiationEligible = useMemo(() => {
    return Math.max(0, 6 - (state.tenure || 0))
  }, [state.tenure])

  // Check if user can negotiate pay (6 month cooldown)
  const canNegotiatePay = useMemo(() => {
    return negotiationCooldownRemaining === 0 && tenureUntilNegotiationEligible === 0
  }, [negotiationCooldownRemaining, tenureUntilNegotiationEligible])

  // Get months until next negotiation eligible
  const monthsUntilNegotiationEligible = useMemo(() => {
    if (canNegotiatePay) return 0
    return Math.max(negotiationCooldownRemaining, tenureUntilNegotiationEligible)
  }, [canNegotiatePay, negotiationCooldownRemaining, tenureUntilNegotiationEligible])

  // Handle negotiation button click
  const handleNegotiatePay = () => {
    const compatibilityScore = calculateJobCompatibilityScore(state.job, state.credentials, state.transit.level)
    const result = calculatePayNegotiationModifier(state.credit, state.tenure, compatibilityScore)
    setNegotiationModifier(result.modifier)
    setNegotiationDetails({
      creditContribution: result.creditContribution,
      tenureContribution: result.tenureContribution,
      compatibilityContribution: result.compatibilityContribution,
      compatibilityScore
    })
    setCalculatedRaiseInput('')
    setCalculatedSalaryInput('')
    setNegotiationCalcError(null)
    setShowNegotiationPracticeMode(false)
    setShowNegotiationModal(true)
  }

  // Confirm negotiation
  const handleConfirmNegotiation = () => {
    const enteredRaise = Number(calculatedRaiseInput)
    const enteredNewBase = Number(calculatedSalaryInput)
    const expectedRaise = Number(negotiationModifier)
    const expectedNewBase = Number((state.job.base * (1 + negotiationModifier / 100)).toFixed(2))

    if (!Number.isFinite(enteredRaise) || !Number.isFinite(enteredNewBase)) {
      setNegotiationCalcError('Enter both calculated values before submitting.')
      return
    }

    const raiseCorrect = Math.abs(enteredRaise - expectedRaise) <= 0.1
    const salaryCorrect = Math.abs(enteredNewBase - expectedNewBase) <= 1
    if (!raiseCorrect || !salaryCorrect) {
      setNegotiationCalcError('Calculation mismatch. Recheck the percentage sum and new base salary.')
      return
    }

    dispatch({ type: 'NEGOTIATE_PAY', payload: { negotiationModifier } })
    setNegotiationCalcError(null)
    setShowNegotiationPracticeMode(false)
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
      education = 45
    } else {
      education = -30
    }

    if (!j.certReq || state.credentials.includes(j.certReq)) {
      certificate = 35
    } else {
      certificate = -20
    }

    if (state.transit.level >= j.tReq) {
      transit = 20
      } else {
      transit = -25
    }

    const payBumpAmount = Math.max(0, jobPay - currentPay)
    payBump = Math.min(10, Math.round((payBumpAmount / Math.max(1, currentPay)) * 100))

    const eligibility = getJobEligibility(state, j)
    const experienceBonus = eligibility.experienceMet ? 8 : -12
    const capacityBonus = eligibility.capacityMet ? 6 : -20

    const total = education + certificate + transit + payBump + experienceBonus + capacityBonus

    return { total, education, certificate, transit, payBump }
  }

  // Get recommendations excluding current job, sorted by score
  const recommendations = useMemo(() => {
    const candidates: { job: Job; breakdown: ScoreBreakdown }[] = jobBoard
      .filter((j: Job) => j.title !== state.job?.title) // Exclude current job
      .filter((j: Job) => isJobVisible(j))
      .map((j: Job) => ({
        job: j,
        breakdown: scoreJob(j)
      }))
    candidates.sort((a, b) => b.breakdown.total - a.breakdown.total)
    return candidates
  }, [jobBoard, state.credentials, state.transit, state.job, state.city, netWorth])

  // Sorting
  const sortedJobs = useMemo(() => {
    const copy = [...jobBoard].filter((j: Job) => isJobVisible(j))
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
  }, [jobBoard, sort, state.credentials, state.transit, state.job, state.city, netWorth])

  const wealthRecommendations = useMemo(() => {
    return Object.entries(WEALTH_NET_WORTH_REQUIREMENTS)
      .map(([title, minimum]) => ({
        title,
        minimum,
        unlocked: netWorth >= minimum,
        remaining: Math.max(0, minimum - netWorth),
      }))
      .sort((a, b) => a.minimum - b.minimum)
  }, [netWorth])

  const categoryOptions = useMemo(() => {
    return Array.from(new Set<string>(jobBoard.map((j: Job) => j.cat || 'General'))).sort((a, b) => a.localeCompare(b))
  }, [jobBoard])

  const subcategoryOptions = useMemo(() => {
    const byCategory = selectedCategory === 'all'
      ? jobBoard
      : jobBoard.filter((j: Job) => (j.cat || 'General') === selectedCategory)
    return Array.from(new Set<string>(byCategory.map((j: Job) => j.subcat || 'General'))).sort((a, b) => a.localeCompare(b))
  }, [jobBoard, selectedCategory])

  const filteredSortedJobs = useMemo(() => {
    return sortedJobs.filter((j: Job) => {
      const category = j.cat || 'General'
      const subcategory = j.subcat || 'General'
      if (selectedCategory !== 'all' && category !== selectedCategory) return false
      if (selectedSubcategory !== 'all' && subcategory !== selectedSubcategory) return false
      return true
    })
  }, [sortedJobs, selectedCategory, selectedSubcategory])

  const groupedJobs = useMemo(() => {
    const grouped: Record<string, Job[]> = {}
    filteredSortedJobs.forEach((j: Job) => {
      const key = `${j.cat || 'General'} / ${j.subcat || 'General'}`
      grouped[key] = grouped[key] || []
      grouped[key].push(j)
    })
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filteredSortedJobs])

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(({ job: j }) => {
      const category = j.cat || 'General'
      const subcategory = j.subcat || 'General'
      if (selectedCategory !== 'all' && category !== selectedCategory) return false
      if (selectedSubcategory !== 'all' && subcategory !== selectedSubcategory) return false
      return true
    })
  }, [recommendations, selectedCategory, selectedSubcategory])

  const goalJob = useMemo(() => (jobBoard as Job[]).find(j => j.title === goalJobTitle) ?? null, [goalJobTitle, jobBoard])
  const eduChain = useMemo(() => buildPrereqChain(goalJob?.req ?? null, academyCourses as any[]), [goalJob, academyCourses])
  const certChain = useMemo(() => buildPrereqChain(goalJob?.certReq ?? null, academyCourses as any[]), [goalJob, academyCourses])
  const progressionTracks = useMemo(() => {
    const tracks = new Map<string, Job[]>()
    ;(jobBoard as Job[]).forEach((job: Job) => {
      const category = job.cat || 'General'
      const subcategory = job.subcat || 'General'
      if (selectedCategory !== 'all' && category !== selectedCategory) return
      if (selectedSubcategory !== 'all' && subcategory !== selectedSubcategory) return
      const key = `${category} / ${subcategory}`
      if (!tracks.has(key)) tracks.set(key, [])
      tracks.get(key)!.push(job)
    })

    return Array.from(tracks.entries())
      .map(([groupName, jobs]) => ({
        groupName,
        jobs: [...jobs].sort((a, b) => (a.base - b.base) || a.title.localeCompare(b.title))
      }))
      .sort((a, b) => a.groupName.localeCompare(b.groupName))
  }, [jobBoard, selectedCategory, selectedSubcategory]) as ProgressTrack[]

  return (
    <div>
      {state.jobMigrationBanner && (
        <div className="glass p-4 sm:p-5 mb-5 border-l-4 border-blue-500 bg-blue-50/60">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="font-bold text-blue-900">Career Updated</p>
              <p className="text-sm text-blue-800 mt-1">{state.jobMigrationBanner}</p>
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_STATE', payload: { jobMigrationBanner: null } })}
              className="self-start px-3 py-1.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {applyFeedback && (
        <div className={`glass p-4 sm:p-5 mb-5 border-l-4 ${applyFeedback.type === 'success' ? 'border-emerald-600 bg-emerald-50/70' : 'border-rose-600 bg-rose-50/70'}`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className={`font-bold ${applyFeedback.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>
                {applyFeedback.type === 'success' ? 'Application Submitted' : 'Application Blocked'}
              </p>
              <p className={`text-sm mt-1 ${applyFeedback.type === 'success' ? 'text-emerald-800' : 'text-rose-800'}`}>
                {applyFeedback.message}
              </p>
            </div>
            <button
              onClick={() => setApplyFeedback(null)}
              className={`self-start px-3 py-1.5 rounded-md text-xs font-bold ${applyFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Current Job Section */}
      <div className="glass p-4 sm:p-6 mb-6 border-l-4 border-emerald-600">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
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
              className="w-full sm:w-auto py-3 px-5 sm:px-6 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors"
            >
              💼 Negotiate Pay
            </button>
          ) : (
            <div className="text-left sm:text-right w-full sm:w-auto">
              <button disabled className="w-full sm:w-auto py-3 px-5 sm:px-6 bg-slate-300 text-slate-500 rounded-lg font-bold cursor-not-allowed">
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
      <div className="mb-6 flex gap-2 sm:gap-3 border-b border-slate-300 overflow-x-auto mobile-sticky-strip sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
        <button
          onClick={() => setView('recommended')}
          className={`shrink-0 py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-sm border-b-2 transition-colors ${
            view === 'recommended'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📊 Recommended
        </button>
        <button
          onClick={() => setView('all')}
          className={`shrink-0 py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-sm border-b-2 transition-colors ${
            view === 'all'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          💼 All Jobs
        </button>
        <button
          onClick={() => setView('tree')}
          className={`shrink-0 py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-sm border-b-2 transition-colors ${
            view === 'tree'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🗺️ Career Path
        </button>
      </div>

      {/* Recommended Jobs View */}
      {view === 'recommended' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 mobile-sticky-strip sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
            <label className="text-sm font-bold text-slate-500 ml-2">Category:</label>
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value)
                setSelectedSubcategory('all')
              }}
              className="p-2 border rounded"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <label className="text-sm font-bold text-slate-500">Subcategory:</label>
            <select
              value={selectedSubcategory}
              onChange={e => setSelectedSubcategory(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All Subcategories</option>
              {subcategoryOptions.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 mobile-sticky-strip sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
            <button
              onClick={() => setSelectedSubcategory('all')}
              className={`req-tag ${selectedSubcategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              All Tracks
            </button>
            {subcategoryOptions.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub)}
                className={`req-tag ${selectedSubcategory === sub ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="glass p-4 sm:p-5 mb-4 border-l-4 border-amber-500 bg-amber-50/60">
            <p className="text-xs font-bold uppercase text-amber-700">Wealth Track Recommendations</p>
            <p className="text-sm text-slate-700 mt-1">Current net worth: <span className="font-bold">${Math.round(netWorth).toLocaleString()}</span></p>
            <div className="mt-2 space-y-1.5 text-sm">
              {wealthRecommendations.map((item) => (
                <p key={`wealth-${item.title}`} className={item.unlocked ? 'text-emerald-700 font-semibold' : 'text-slate-700'}>
                  {item.unlocked
                    ? `✅ ${item.title} unlocked (requires $${Math.round(item.minimum).toLocaleString()})`
                    : `🔒 ${item.title}: need $${Math.round(item.minimum).toLocaleString()} net worth (remaining $${Math.round(item.remaining).toLocaleString()})`}
                </p>
              ))}
            </div>
          </div>

          {filteredRecommendations.length > 0 ? (
            <div className="glass p-4 sm:p-6 mb-4">
              <h3 className="font-bold text-lg mb-4">Jobs matched to your profile (sorted by match score)</h3>
              <p className="text-[11px] text-slate-500 mb-2 md:hidden">Swipe horizontally to view all recommendation columns.</p>
              <div className="overflow-x-auto relative -mx-2 px-2">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-300">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-3 font-bold text-slate-700">Job Title</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-bold text-slate-700">Better Pay?</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-bold text-slate-700">✓ Education</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-bold text-slate-700">✓ Certificate</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-bold text-slate-700">✓ Transport</th>
                      <th className="text-center py-2 sm:py-3 px-2 sm:px-3 font-bold text-slate-700">Score</th>
                      <th className="text-right py-2 sm:py-3 px-2 sm:px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecommendations.map(({ job: j, breakdown }) => {
                      const domain = resolveDomainKey(`${j.subcat || ''} ${j.cat || ''}`)
                      const eligibility = getJobEligibility(state, j)
                      const edMet = eligibility.educationMet
                      const certMet = eligibility.certificationMet
                      const trMet = eligibility.transitMet
                      const expMet = eligibility.experienceMet
                      const feederRoles = j.expReq?.roles || []
                      const feederRequiredMonths = j.expReq?.minMonths || 0
                      const feederProgress = feederRoles.map(role => ({ role, months: getRoleExperienceMonths(role) }))
                      const bestFeeder = feederProgress.reduce(
                        (best, current) => (current.months > best.months ? current : best),
                        { role: 'N/A', months: 0 }
                      )
                      const canApply = eligibility.canApply
                      const hasApplied = state.applications.some((a: any) => a.job.title === j.title && a.status === 'pending')
                      const currentPay = (state.job?.base || 0) * state.city.p * 0.8
                      const jobPay = j.base * state.city.p * 0.8
                      const payIncrease = jobPay - currentPay
                      const payIncreasePercent = currentPay > 0 ? Math.round((payIncrease / currentPay) * 100) : 0

                      return (
                        <tr key={j.title} className={`border-b border-slate-200 hover:bg-slate-50 ${!canApply ? 'opacity-60' : ''}`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-3">
                            <div className="font-bold text-slate-900">{j.title}</div>
                            <div className="text-xs text-slate-500">${Math.round(jobPay)}/mo</div>
                            <div className="subcat-banner">
                              <span className="category-pill" style={domainBadgeStyle(domain)}>{j.cat || 'General'}</span>
                              <span className="subcat-pill" style={domainBadgeStyle(domain)}>{j.subcat || 'General'}</span>
                            </div>
                          </td>
                          <td className="text-center py-2 sm:py-3 px-2 sm:px-3">
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
                          <td className="text-center py-2 sm:py-3 px-2 sm:px-3 relative">
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
                              <div className="absolute z-20 bg-slate-900 text-white text-xs rounded-md px-3 py-2 top-full mt-2 left-1/2 -translate-x-1/2 w-56 max-w-[85vw] whitespace-normal text-left leading-relaxed break-words shadow-lg">
                                {edMet ? (
                                  <div>{j.req ? `✓ Have ${j.req}` : '✓ No requirement'}</div>
                                ) : (
                                  <div>✗ Need: {j.req}</div>
                                )}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900"></div>
                              </div>
                            )}
                          </td>
                          <td className="text-center py-2 sm:py-3 px-2 sm:px-3 relative">
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
                              <div className="absolute z-20 bg-slate-900 text-white text-xs rounded-md px-3 py-2 top-full mt-2 left-1/2 -translate-x-1/2 w-56 max-w-[85vw] whitespace-normal text-left leading-relaxed break-words shadow-lg">
                                {!j.certReq ? (
                                  <div>✓ No requirement</div>
                                ) : certMet ? (
                                  <div>✓ Have {j.certReq}</div>
                                ) : (
                                  <div>✗ Need: {j.certReq}</div>
                                )}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900"></div>
                              </div>
                            )}
                          </td>
                          <td className="text-center py-2 sm:py-3 px-2 sm:px-3 relative">
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
                              <div className="absolute z-20 bg-slate-900 text-white text-xs rounded-md px-3 py-2 top-full mt-2 left-1/2 -translate-x-1/2 w-56 max-w-[85vw] whitespace-normal text-left leading-relaxed break-words shadow-lg">
                                {trMet ? (
                                  <div>✓ Have Level {state.transit.level}</div>
                                ) : (
                                  <div>Need: Level {j.tReq}, Have: Level {state.transit.level}</div>
                                )}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900"></div>
                              </div>
                            )}
                          </td>
                          <td className="text-center py-2 sm:py-3 px-2 sm:px-3 relative">
                            <div
                              onMouseEnter={() => setHoveredTooltip(`${j.title}-score`)}
                              onMouseLeave={() => setHoveredTooltip(null)}
                              className="cursor-help inline-block"
                            >
                              <div className="font-bold text-slate-900">{breakdown.total}</div>
                              <div className="text-xs text-slate-500">
                                E:{breakdown.education > 0 ? '+' : ''}{breakdown.education}
                                {' '}C:{breakdown.certificate > 0 ? '+' : ''}{breakdown.certificate}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {expMet ? 'Exp OK' : 'Need feeder role'} · {eligibility.openings} openings
                              </div>
                            </div>
                            {hoveredTooltip === `${j.title}-score` && (
                              <div className="absolute z-20 bg-slate-900 text-white text-xs rounded-md px-3 py-2 top-full mt-2 left-1/2 -translate-x-1/2 min-w-[220px] max-w-[85vw] text-left whitespace-normal leading-relaxed break-words shadow-lg">
                                <div className="font-bold mb-1">Score Breakdown</div>
                                <div>Education: {breakdown.education > 0 ? '+' : ''}{breakdown.education}</div>
                                <div>Certificate: {breakdown.certificate > 0 ? '+' : ''}{breakdown.certificate}</div>
                                <div>Transit: {breakdown.transit > 0 ? '+' : ''}{breakdown.transit}</div>
                                <div>Pay Bump: +{breakdown.payBump}</div>
                                <div className="mt-2 font-bold">Feeder Role</div>
                                {feederRoles.length > 0 ? (
                                  <>
                                    <div>Roles: {feederRoles.join(' or ')}</div>
                                    <div>Required: {feederRequiredMonths} months</div>
                                    <div>Best Progress: {bestFeeder.role} ({bestFeeder.months} months)</div>
                                  </>
                                ) : (
                                  <div>No feeder role required</div>
                                )}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900"></div>
                              </div>
                            )}
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-3">
                            <button
                              onClick={() => handleApplyJob(j)}
                              disabled={!canApply || hasApplied || applyingJobTitle === j.title}
                              className={`w-full sm:w-auto py-1 px-3 rounded text-xs font-bold ${
                                hasApplied 
                                  ? 'bg-amber-500 text-white cursor-not-allowed' 
                                  : canApply 
                                  ? 'bg-slate-900 text-white hover:bg-slate-800' 
                                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {hasApplied ? 'APPLIED' : applyingJobTitle === j.title ? 'APPLYING...' : 'APPLY'}
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
          <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 mobile-sticky-strip sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
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

            <label className="text-sm font-bold text-slate-500 ml-2">Category:</label>
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value)
                setSelectedSubcategory('all')
              }}
              className="p-2 border rounded"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <label className="text-sm font-bold text-slate-500">Subcategory:</label>
            <select
              value={selectedSubcategory}
              onChange={e => setSelectedSubcategory(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">All Subcategories</option>
              {subcategoryOptions.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubcategory('all')}
              className={`req-tag ${selectedSubcategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              All Tracks
            </button>
            {subcategoryOptions.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubcategory(sub)}
                className={`req-tag ${selectedSubcategory === sub ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {groupedJobs.map(([groupName, jobs]) => (
              <div key={groupName} className="glass p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">{groupName}</h4>
                  <span className="text-xs text-slate-500 font-bold uppercase">{jobs.length} jobs</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.map((j: Job) => {
              const domain = resolveDomainKey(`${j.subcat || ''} ${j.cat || ''}`)
              const eligibility = getJobEligibility(state, j)
              const edMet = eligibility.educationMet
              const certMet = eligibility.certificationMet
              const trMet = eligibility.transitMet
              const expMet = eligibility.experienceMet
              const hasApplied = state.applications.some((a: any) => a.job.title === j.title && a.status === 'pending')
              const isCurrent = state.job?.title === j.title
              const canApply = eligibility.canApply
              const isLocked = !canApply && !isCurrent

              return (
                <div key={j.title} className={`glass p-5 ${isLocked ? 'card-locked' : ''} ${isCurrent ? 'card-active' : ''}`}>
                  <h4 className="font-bold text-sm">{j.title}</h4>
                  <p className="text-emerald-600 font-bold">${Math.round(j.base * state.city.p * 0.8)}/mo</p>
                  <div className="subcat-banner mt-1">
                    <span className="category-pill" style={domainBadgeStyle(domain)}>{j.cat || 'General'}</span>
                    <span className="subcat-pill" style={domainBadgeStyle(domain)}>{j.subcat || 'General'}</span>
                    <span className="req-tag bg-sky-100 text-sky-700">{eligibility.openings} openings</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className={`req-tag ${edMet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{j.req || 'No Edu'}</span>
                    {j.certReq && <span className={`req-tag ${certMet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{j.certReq}</span>}
                    <span className={`req-tag ${trMet ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>Transit L{j.tReq}</span>
                    {j.expReq && (
                      <span className={`req-tag ${expMet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {j.expReq.minMonths}mo in {j.expReq.roles.join(' or ')}
                      </span>
                    )}
                    <span className={`req-tag ${eligibility.capacityMet ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>Capacity {eligibility.capacityMet ? 'Open' : 'Full'}</span>
                  </div>
                  <div className="mt-3">
                    {isCurrent ? (
                      <button disabled className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">CURRENT</button>
                    ) : (
                      <button
                        onClick={() => handleApplyJob(j)}
                        disabled={!canApply || hasApplied || applyingJobTitle === j.title}
                        className={`w-full py-2 ${hasApplied ? 'bg-amber-500 text-white cursor-not-allowed' : canApply ? 'bg-slate-900 text-white' : 'bg-slate-300 text-slate-500 cursor-not-allowed'} rounded-lg text-xs font-bold`}
                      >
                        {hasApplied ? 'APPLIED' : applyingJobTitle === j.title ? 'APPLYING...' : 'APPLY'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
                </div>
              </div>
            ))}

            {groupedJobs.length === 0 && (
              <div className="glass p-6 text-center text-slate-600">
                No jobs match this category/subcategory filter.
              </div>
            )}
          </div>
        </>
      )}

      {/* Career Path Planner */}
      {view === 'tree' && (
        <div className="space-y-6">
          <div className="glass p-6">
            <h3 className="font-bold text-xl mb-2">🌳 Category Progression Tree</h3>
            <p className="text-sm text-slate-600 mb-4">Use filters to inspect progression within each category and subcategory at a glance.</p>

            <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <label className="text-sm font-bold text-slate-500">Category:</label>
              <select
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value)
                  setSelectedSubcategory('all')
                }}
                className="p-2 border rounded"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <label className="text-sm font-bold text-slate-500">Subcategory:</label>
              <select
                value={selectedSubcategory}
                onChange={e => setSelectedSubcategory(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="all">All Subcategories</option>
                {subcategoryOptions.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {progressionTracks.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No progression tracks found for this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {progressionTracks.map((track) => (
                  <div key={track.groupName} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-slate-900">{track.groupName}</p>
                      <span className="text-xs font-bold text-slate-500 uppercase">{track.jobs.length} steps</span>
                    </div>

                    <div className="flex flex-wrap items-stretch gap-2">
                      {track.jobs.map((job, index) => {
                        const eligibility = getJobEligibility(state, job)
                        const isCurrent = state.job?.title === job.title
                        const statusClass = isCurrent
                          ? 'border-emerald-500 bg-emerald-50'
                          : eligibility.canApply
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-slate-300 bg-slate-50'
                        const statusText = isCurrent ? 'Current' : (eligibility.canApply ? 'Eligible' : 'Locked')

                        return (
                          <div key={job.title} className="flex items-center gap-2">
                            <div className={`min-w-[180px] max-w-[220px] rounded-lg border p-3 ${statusClass}`}>
                              <p className="font-bold text-sm text-slate-900">{job.title}</p>
                              <p className="text-xs font-bold text-emerald-700 mt-0.5">${Math.round(job.base * state.city.p * 0.8).toLocaleString()}/mo</p>
                              <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                <p>Edu: {job.req || 'None'}</p>
                                <p>Cert: {job.certReq || 'None'}</p>
                                <p>Transit: L{job.tReq}</p>
                                {job.expReq && <p>Exp: {job.expReq.minMonths}mo in {job.expReq.roles.join(' or ')}</p>}
                              </div>
                              <p className="mt-2 text-[11px] font-bold text-slate-700">{statusText}</p>
                            </div>
                            {index < track.jobs.length - 1 && (
                              <span className="text-slate-400 font-bold text-lg">→</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass p-6">
            <h3 className="font-bold text-xl mb-2">🗺️ Career Path Planner</h3>
            <p className="text-sm text-slate-600 mb-4">Select any job to see the full roadmap — education prerequisites, certification chains, transit level, and experience requirements.</p>
            <select
              value={goalJobTitle}
              onChange={e => setGoalJobTitle(e.target.value)}
              className="w-full p-3 border rounded-xl font-bold text-slate-800 bg-white"
            >
              <option value="">— Select a target job —</option>
              {[...jobBoard].sort((a: Job, b: Job) => a.title.localeCompare(b.title)).map((j: Job) => (
                <option key={j.title} value={j.title}>{j.title} · ${Math.round(j.base * state.city.p * 0.8).toLocaleString()}/mo</option>
              ))}
            </select>
          </div>

          {!goalJob && (
            <div className="glass p-12 text-center">
              <p className="text-5xl mb-4">🗺️</p>
              <p className="font-bold text-xl text-slate-700">Pick a destination</p>
              <p className="text-sm text-slate-500 mt-2">Choose a target job above to see exactly what you need to get there.</p>
            </div>
          )}

          {goalJob && (() => {
            const eligibility = getJobEligibility(state, goalJob)
            const allNeeded = [...eduChain, ...certChain].filter((c: any) => !state.credentials.includes(c.n) && state.activeEdu !== c.n)
            const totalMonths = allNeeded.reduce((s: number, c: any) => s + c.m, 0)
            const totalCost = allNeeded.reduce((s: number, c: any) => s + c.c * c.m, 0)
            return (
              <div className="space-y-4">
                {/* Target job header */}
                <div className={`glass p-6 border-l-4 ${eligibility.canApply ? 'border-emerald-500' : 'border-amber-500'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500 mb-1">Target Position</p>
                      <h3 className="text-2xl font-bold text-slate-900">{goalJob.title}</h3>
                      <p className="text-emerald-600 font-bold text-lg">${Math.round(goalJob.base * state.city.p * 0.8).toLocaleString()}/mo net</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full font-bold text-sm ${eligibility.canApply ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {eligibility.canApply ? '✓ Eligible Now' : '⚠ Not Yet Eligible'}
                    </span>
                  </div>
                  {allNeeded.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div><p className="text-xs text-slate-500">Credentials Still Needed</p><p className="text-2xl font-bold text-rose-600">{allNeeded.length}</p></div>
                      <div><p className="text-xs text-slate-500">Time to Complete</p><p className="text-2xl font-bold text-slate-900">{totalMonths} mo</p></div>
                      <div><p className="text-xs text-slate-500">Total Cost</p><p className="text-2xl font-bold text-rose-600">${totalCost.toLocaleString()}</p></div>
                    </div>
                  )}
                  {allNeeded.length === 0 && (eduChain.length > 0 || certChain.length > 0) && (
                    <p className="mt-3 text-sm font-bold text-emerald-600">✓ All credential requirements met!</p>
                  )}
                </div>

                {/* Education path */}
                <div className="glass p-6">
                  <p className="text-xs font-bold uppercase text-slate-500 mb-4">📚 Education Requirement</p>
                  {eduChain.length === 0 ? (
                    <p className="text-sm font-bold text-emerald-600">✓ No education required</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {eduChain.map((course: any, i: number) => {
                        const owned = state.credentials.includes(course.n)
                        const inProgress = state.activeEdu === course.n
                        return (
                          <div key={course.n} className="flex items-center gap-2">
                            <div className={`rounded-xl px-3 sm:px-4 py-3 border-2 min-w-[120px] sm:min-w-[130px] ${owned ? 'bg-emerald-50 border-emerald-400' : inProgress ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-300'}`}>
                              <div className="text-sm font-bold text-slate-900">{course.icon} {course.n}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{course.m} mo · ${course.c}/mo</div>
                              <div className={`text-[10px] font-bold mt-1 ${owned ? 'text-emerald-600' : inProgress ? 'text-amber-600' : 'text-rose-600'}`}>
                                {owned ? '✓ Owned' : inProgress ? '⏳ In Progress' : '✗ Needed'}
                              </div>
                            </div>
                            {i < eduChain.length - 1 && <span className="text-slate-400 text-xl font-bold">→</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Cert path */}
                <div className="glass p-6">
                  <p className="text-xs font-bold uppercase text-slate-500 mb-4">🏅 Certificate Requirement</p>
                  {certChain.length === 0 ? (
                    <p className="text-sm font-bold text-emerald-600">✓ No certificate required</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {certChain.map((course: any, i: number) => {
                        const owned = state.credentials.includes(course.n)
                        const inProgress = state.activeEdu === course.n
                        return (
                          <div key={course.n} className="flex items-center gap-2">
                            <div className={`rounded-xl px-3 sm:px-4 py-3 border-2 min-w-[120px] sm:min-w-[130px] ${owned ? 'bg-emerald-50 border-emerald-400' : inProgress ? 'bg-amber-50 border-amber-400' : 'bg-slate-50 border-slate-300'}`}>
                              <div className="text-sm font-bold text-slate-900">{course.icon} {course.n}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{course.m} mo · ${course.c}/mo</div>
                              <div className={`text-[10px] font-bold mt-1 ${owned ? 'text-emerald-600' : inProgress ? 'text-amber-600' : 'text-rose-600'}`}>
                                {owned ? '✓ Owned' : inProgress ? '⏳ In Progress' : '✗ Needed'}
                              </div>
                            </div>
                            {i < certChain.length - 1 && <span className="text-slate-400 text-xl font-bold">→</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Transit + Feeder Role */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass p-6">
                    <p className="text-xs font-bold uppercase text-slate-500 mb-3">🚌 Transit Requirement</p>
                    <div className={`rounded-xl px-4 py-3 border-2 ${state.transit.level >= goalJob.tReq ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-300'}`}>
                      <p className="font-bold">Level {goalJob.tReq} required</p>
                      <p className="text-xs text-slate-500 mt-1">Current: Level {state.transit.level}</p>
                      <p className={`text-xs font-bold mt-1 ${state.transit.level >= goalJob.tReq ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {state.transit.level >= goalJob.tReq ? '✓ Met' : `✗ Need ${goalJob.tReq - state.transit.level} more level(s)`}
                      </p>
                    </div>
                  </div>
                  <div className="glass p-6">
                    <p className="text-xs font-bold uppercase text-slate-500 mb-3">💼 Experience Requirement</p>
                    {!goalJob.expReq ? (
                      <div className="rounded-xl px-4 py-3 border-2 bg-emerald-50 border-emerald-400">
                        <p className="font-bold text-emerald-700">✓ No feeder role required</p>
                      </div>
                    ) : (
                      <div className={`rounded-xl px-4 py-3 border-2 ${eligibility.experienceMet ? 'bg-emerald-50 border-emerald-400' : 'bg-amber-50 border-amber-300'}`}>
                        <p className="font-bold">{goalJob.expReq.roles.join(' or ')}</p>
                        <p className="text-xs text-slate-500 mt-1">{goalJob.expReq.minMonths} months required</p>
                        <p className={`text-xs font-bold mt-1 ${eligibility.experienceMet ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {eligibility.experienceMet ? '✓ Met' : '⏳ Gain experience first'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Negotiation Modal */}
      {showNegotiationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass p-8 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Pay Negotiation Challenge</h2>
            
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <label className="inline-flex items-center gap-2 font-semibold text-blue-800">
                  <input
                    type="checkbox"
                    checked={showNegotiationPracticeMode}
                    onChange={(e) => setShowNegotiationPracticeMode(e.target.checked)}
                  />
                  Practice Mode (show worked example)
                </label>
                <p className="text-xs text-blue-700 mt-1">Optional helper. You still need to submit the calculated values.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Current Base Salary</p>
                <p className="text-3xl font-bold text-slate-900">${state.job.base.toFixed(0)}/mo</p>
              </div>

              <div className="bg-slate-100 p-4 rounded text-sm">
                <p className="font-bold text-slate-900 mb-2">Calculate Your Raise</p>
                <p className="text-xs text-slate-600 mb-2">Step 1: Add the three contributions below.</p>
                <ul className="space-y-1 text-slate-700">
                  <li>📊 Credit Score Contribution: +{(negotiationDetails?.creditContribution || 0).toFixed(2)}%</li>
                  <li>⏱️ Tenure ({state.tenure}mo) Contribution: +{(negotiationDetails?.tenureContribution || 0).toFixed(2)}%</li>
                  <li>✅ Compatibility ({Math.round(negotiationDetails?.compatibilityScore || 0)}/100) Contribution: +{(negotiationDetails?.compatibilityContribution || 0).toFixed(2)}%</li>
                </ul>
                <p className="text-xs text-slate-700 mt-2">Step 2: Cap the final raise at 3.00% if your sum is higher.</p>
              </div>

              {showNegotiationPracticeMode && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-900">
                  <p className="font-bold mb-2">Worked Example</p>
                  <p>1) Sum = {Number(negotiationDetails?.creditContribution || 0).toFixed(2)} + {Number(negotiationDetails?.tenureContribution || 0).toFixed(2)} + {Number(negotiationDetails?.compatibilityContribution || 0).toFixed(2)} = {(Number(negotiationDetails?.creditContribution || 0) + Number(negotiationDetails?.tenureContribution || 0) + Number(negotiationDetails?.compatibilityContribution || 0)).toFixed(2)}%</p>
                  <p className="mt-1">2) Final Raise = min(3.00%, Sum) = {negotiationModifier.toFixed(2)}%</p>
                  <p className="mt-1">3) New Base Salary = ${state.job.base.toFixed(2)} × (1 + {negotiationModifier.toFixed(2)} / 100)</p>
                  <p className="font-bold mt-1">New Base Salary = ${(state.job.base * (1 + negotiationModifier / 100)).toFixed(2)}/mo</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Your Calculated Raise %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calculatedRaiseInput}
                    onChange={(e) => {
                      setCalculatedRaiseInput(e.target.value)
                      if (negotiationCalcError) setNegotiationCalcError(null)
                    }}
                    className="w-full mt-1 p-3 border rounded-lg font-bold"
                    placeholder="e.g. 2.75"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Your Calculated New Base Salary ($/mo)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calculatedSalaryInput}
                    onChange={(e) => {
                      setCalculatedSalaryInput(e.target.value)
                      if (negotiationCalcError) setNegotiationCalcError(null)
                    }}
                    className="w-full mt-1 p-3 border rounded-lg font-bold"
                    placeholder="e.g. 4250.00"
                  />
                </div>
              </div>

              {negotiationCalcError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded p-3">
                  {negotiationCalcError}
                </div>
              )}
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
                Submit Calculation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
