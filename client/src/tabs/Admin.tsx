import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy'
// ...existing code...

// ...existing code...

type AdminUserRow = {
  id: string
  username: string
  isAdmin: boolean
  isPrimaryAdminLocked?: boolean
  createdAt?: string
  updatedAt?: string
  balances: {
    checking: number
    savings: number
    debt: number
  }
  progression?: {
    month: number
    year: number
    tenureMonths: number
    jobTitle: string
    jobBase: number
    educationLevel: string
    credentialsCount: number
    activeEducation: string | null
    transitLevel: number
    creditScore: number
    happiness: number
    netWorth: number
    // ...removed event fields...
  }
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value?: string) {
  if (!value) return 'N/A'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return 'N/A'
  return new Date(parsed).toLocaleString()
}

type ManageDraft = {
  id: string
  username: string
  password: string
  confirmPassword: string
  assignedJobTitle: string
}

function rowChanged(current: AdminUserRow, baseline: AdminUserRow) {
  return (
    current.username !== baseline.username
    || current.isAdmin !== baseline.isAdmin
    || Number(current.balances.checking) !== Number(baseline.balances.checking)
    || Number(current.balances.savings) !== Number(baseline.balances.savings)
    || Number(current.balances.debt) !== Number(baseline.balances.debt)
  )
}

export default function Admin() {
  const { state, dispatch, listUsersForAdmin, saveUserAsAdmin, deleteUserAsAdmin, refreshPeerSnapshots, jobBoard, saveGame, loadGame } = useGame()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [baseUsers, setBaseUsers] = useState<Record<string, AdminUserRow>>({})
  const [pendingPasswords, setPendingPasswords] = useState<Record<string, string>>({})
  const [pendingAssignedJobs, setPendingAssignedJobs] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [educationFilter, setEducationFilter] = useState('all')
  const [creditFilter, setCreditFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState('')
  const [sortBy, setSortBy] = useState('created-asc')
  const [riskPreset, setRiskPreset] = useState<'none' | 'at-risk'>('none')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  // ...removed event/economy override state...
  const [manageDraft, setManageDraft] = useState<ManageDraft | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const sortedJobTitles = useMemo(() => {
    return [...(Array.isArray(jobBoard) ? jobBoard : [])]
      .map((job: any) => String(job?.title || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  }, [jobBoard])

  // ...removed event scenario selection...

  // ...removed economy override logic...

  // ...removed economy override logic...

  // ...removed stock shock logic...

  // ...removed reset economy logic...

  const canLoad = useMemo(() => Boolean(state?.isAdmin && state?.id && state?.authToken), [state?.isAdmin, state?.id, state?.authToken])
  const unsavedCount = useMemo(() => {
    return users.filter(user => {
      const baseline = baseUsers[user.id]
      const queuedJob = String(pendingAssignedJobs[user.id] || '').trim()
      const baselineJob = String(baseline?.progression?.jobTitle || '').trim()
      const jobChanged = queuedJob.length > 0 && queuedJob !== baselineJob
      return !!baseline && (rowChanged(user, baseline) || Boolean(pendingPasswords[user.id]) || jobChanged)
    }).length
  }, [users, baseUsers, pendingPasswords, pendingAssignedJobs])
  const educationOptions = useMemo(() => {
    return Array.from(new Set(users.map(user => user.progression?.educationLevel || 'Unknown'))).sort((a, b) => a.localeCompare(b))
  }, [users])

  const yearOptions = useMemo(() => {
    return Array.from(new Set(users.map(user => Number(user.progression?.year || 0)).filter(y => y > 0))).sort((a, b) => b - a)
  }, [users])

  const filteredAndSortedUsers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const normalizedJobFilter = jobFilter.trim().toLowerCase()

    const inCreditBand = (creditScore: number) => {
      switch (creditFilter) {
        case 'sub580': return creditScore < 580
        case '580to669': return creditScore >= 580 && creditScore <= 669
        case '670to739': return creditScore >= 670 && creditScore <= 739
        case '740plus': return creditScore >= 740
        default: return true
      }
    }

    const filtered = users.filter((user) => {
      const jobTitle = String(user.progression?.jobTitle || '').toLowerCase()
      const educationLevel = String(user.progression?.educationLevel || 'Unknown')
      const creditScore = Number(user.progression?.creditScore || 0)
      const year = Number(user.progression?.year || 0)
      const debt = Number(user.balances?.debt || 0)
      const netWorth = Number(user.progression?.netWorth || 0)
      const happiness = Number(user.progression?.happiness || 0)
      const activeEducation = String(user.progression?.activeEducation || '')
      const currentlyInOddJobs = jobTitle.includes('odd jobs')

      if (riskPreset === 'at-risk') {
        const lowCredit = creditScore < 580
        const highDebt = debt >= 5000
        const negativeNetWorth = netWorth < 0
        const lowHappiness = happiness > 0 && happiness < 45
        const noActiveUpskill = !activeEducation
        const stalledAtEntry = currentlyInOddJobs && noActiveUpskill
        const riskHits = [lowCredit, highDebt, negativeNetWorth, lowHappiness, stalledAtEntry].filter(Boolean).length
        if (riskHits < 2) return false
      }

      if (educationFilter !== 'all' && educationLevel !== educationFilter) return false
      if (yearFilter !== 'all' && String(year) !== yearFilter) return false
      if (!inCreditBand(creditScore)) return false
      if (normalizedJobFilter && !jobTitle.includes(normalizedJobFilter)) return false

      if (normalizedSearch) {
        const haystack = [
          user.username,
          String(user.id),
          String(user.progression?.jobTitle || ''),
          String(user.progression?.educationLevel || ''),
          String(user.progression?.activeEducation || ''),
        ].join(' ').toLowerCase()
        if (!haystack.includes(normalizedSearch)) return false
      }

      return true
    })

    return [...filtered].sort((a, b) => {
      const aCreated = Date.parse(String(a.createdAt || ''))
      const bCreated = Date.parse(String(b.createdAt || ''))
      const aUpdated = Date.parse(String(a.updatedAt || ''))
      const bUpdated = Date.parse(String(b.updatedAt || ''))
      const aCredit = Number(a.progression?.creditScore || 0)
      const bCredit = Number(b.progression?.creditScore || 0)
      const aNetWorth = Number(a.progression?.netWorth || 0)
      const bNetWorth = Number(b.progression?.netWorth || 0)
      const aTenure = Number(a.progression?.tenureMonths || 0)
      const bTenure = Number(b.progression?.tenureMonths || 0)
      const aMonthKey = Number(a.progression?.year || 0) * 12 + Number(a.progression?.month || 0)
      const bMonthKey = Number(b.progression?.year || 0) * 12 + Number(b.progression?.month || 0)

      switch (sortBy) {
        case 'created-desc': return (Number.isFinite(bCreated) ? bCreated : 0) - (Number.isFinite(aCreated) ? aCreated : 0)
        case 'updated-desc': return (Number.isFinite(bUpdated) ? bUpdated : 0) - (Number.isFinite(aUpdated) ? aUpdated : 0)
        case 'credit-desc': return bCredit - aCredit
        case 'networth-desc': return bNetWorth - aNetWorth
        case 'tenure-desc': return bTenure - aTenure
        case 'month-desc': return bMonthKey - aMonthKey
        case 'username-asc': return a.username.localeCompare(b.username)
        case 'created-asc':
        default:
          return (Number.isFinite(aCreated) ? aCreated : 0) - (Number.isFinite(bCreated) ? bCreated : 0)
      }
    })
  }, [users, searchQuery, educationFilter, creditFilter, yearFilter, jobFilter, sortBy, riskPreset])

  const applyAtRiskPreset = () => {
    setRiskPreset('at-risk')
    setCreditFilter('all')
    setEducationFilter('all')
    setYearFilter('all')
    setJobFilter('')
    setSearchQuery('')
    setSortBy('networth-desc')
    setMessage('At Risk preset enabled: users with multiple risk indicators are now shown.')
  }

  const clearPreset = () => {
    setRiskPreset('none')
    setMessage('Preset cleared.')
  }

  const handleDeleteUser = async (user: AdminUserRow) => {
    if (!state?.authToken) {
      setError('You must be logged in to delete users.')
      return
    }
    if (user.id === state.id) {
      setError('You cannot delete your own account from admin controls.')
      return
    }
    if (user.isPrimaryAdminLocked) {
      setError('Primary admin account cannot be deleted.')
      return
    }

    const confirmed = window.confirm(
      `Delete user ${user.username}? This permanently removes their saved game state.`
    )
    if (!confirmed) return

    setDeletingUserId(user.id)
    setError('')
    setMessage('')
    const deleted = await deleteUserAsAdmin(user.id)
    setDeletingUserId(null)

    if (!deleted) {
      setError(`Unable to delete ${user.username}.`) 
      return
    }

    setUsers(prev => prev.filter(row => row.id !== user.id))
    setBaseUsers(prev => {
      const next = { ...prev }
      delete next[user.id]
      return next
    })
    setPendingPasswords(prev => {
      const next = { ...prev }
      delete next[user.id]
      return next
    })
    setPendingAssignedJobs(prev => {
      const next = { ...prev }
      delete next[user.id]
      return next
    })
    setManageDraft(prev => (prev?.id === user.id ? null : prev))

    await refreshPeerSnapshots()
    setMessage(`Deleted user ${user.username}.`)
  }

  const loadUsers = async () => {
    if (!canLoad) return
    setError('')
    setMessage('')
    setLoading(true)
    const response = await listUsersForAdmin()
    setLoading(false)

    if (!response) {
      setError('Unable to load users. Your admin session may have expired.')
      return
    }

    setUsers(response)
    setBaseUsers(Object.fromEntries(response.map((user: AdminUserRow) => [user.id, user])))
    setPendingPasswords({})
    setPendingAssignedJobs({})
    setMessage(`Loaded ${response.length} users.`)
  }

  const updateRow = (id: string, key: 'checking' | 'savings' | 'debt', rawValue: string) => {
    const numeric = Number(rawValue)
    setUsers(prev => prev.map(user => {
      if (user.id !== id) return user
      return {
        ...user,
        balances: {
          ...user.balances,
          [key]: Number.isFinite(numeric) ? numeric : 0,
        },
      }
    }))
  }

  const toggleAdmin = (id: string, isAdmin: boolean) => {
    setUsers(prev => prev.map(user => {
      if (user.id !== id) return user
      if (user.isPrimaryAdminLocked && !isAdmin) return user
      return { ...user, isAdmin }
    }))
  }

  const openManage = (user: AdminUserRow) => {
    setError('')
    setManageDraft({
      id: user.id,
      username: user.username,
      password: '',
      confirmPassword: '',
      assignedJobTitle: String(pendingAssignedJobs[user.id] || user.progression?.jobTitle || ''),
    })
  }

  const applyManageChanges = () => {
    if (!manageDraft) return

    const username = String(manageDraft.username || '').trim()
    if (!username) {
      setError('Username is required.')
      return
    }

    const nextPassword = String(manageDraft.password || '')
    if (nextPassword) {
      if (!isPasswordValid(nextPassword)) {
        setError(PASSWORD_POLICY_MESSAGE)
        return
      }
      if (nextPassword !== String(manageDraft.confirmPassword || '')) {
        setError('Passwords do not match.')
        return
      }
    }

    setUsers(prev => prev.map(user => (
      user.id === manageDraft.id
        ? { ...user, username }
        : user
    )))

    setPendingPasswords(prev => {
      const next = { ...prev }
      if (nextPassword) next[manageDraft.id] = nextPassword
      else delete next[manageDraft.id]
      return next
    })

    setPendingAssignedJobs(prev => {
      const next = { ...prev }
      const selected = String(manageDraft.assignedJobTitle || '').trim()
      const baselineJob = String(baseUsers[manageDraft.id]?.progression?.jobTitle || '').trim()
      if (selected && selected !== baselineJob) next[manageDraft.id] = selected
      else delete next[manageDraft.id]
      return next
    })

    setManageDraft(null)
    setMessage(`Queued profile changes for ${username}.`)
  }

  const saveAll = async () => {
    if (!state?.authToken) {
      setError('You must be logged in to save changes.')
      return
    }
    const dirty = users.filter(user => {
      const baseline = baseUsers[user.id]
      const queuedJob = String(pendingAssignedJobs[user.id] || '').trim()
      const baselineJob = String(baseline?.progression?.jobTitle || '').trim()
      const jobChanged = queuedJob.length > 0 && queuedJob !== baselineJob
      return !!baseline && (rowChanged(user, baseline) || Boolean(pendingPasswords[user.id]) || jobChanged)
    })

    if (!dirty.length) {
      setMessage('No pending changes to save.')
      return
    }

    setSavingAll(true)
    setError('')
    setMessage('')

    const failed: string[] = []
    const savedMap: Record<string, AdminUserRow> = {}

    for (const row of dirty) {
      const queuedJob = String(pendingAssignedJobs[row.id] || '').trim()
      const saved = await saveUserAsAdmin(row.id, {
        checking: Number(row.balances.checking || 0),
        savings: Number(row.balances.savings || 0),
        debt: Number(row.balances.debt || 0),
        isAdmin: Boolean(row.isAdmin),
        username: row.username,
        password: pendingPasswords[row.id],
        jobTitle: queuedJob || undefined,
      })

      if (!saved) {
        failed.push(row.username)
      } else {
        savedMap[row.id] = saved
      }
    }

    setSavingAll(false)

    if (Object.keys(savedMap).length) {
      setUsers(prev => prev.map(user => savedMap[user.id] || user))
      setBaseUsers(prev => ({ ...prev, ...savedMap }))
      setPendingPasswords(prev => {
        const next = { ...prev }
        for (const id of Object.keys(savedMap)) delete next[id]
        return next
      })
      setPendingAssignedJobs(prev => {
        const next = { ...prev }
        for (const id of Object.keys(savedMap)) delete next[id]
        return next
      })

      const selfUpdated = state?.id ? savedMap[state.id] : null
      if (selfUpdated) {
        dispatch({
          type: 'SET_STATE',
          payload: {
            username: selfUpdated.username,
            currentUser: selfUpdated.username,
            isAdmin: Boolean(selfUpdated.isAdmin),
            check: Number(selfUpdated.balances?.checking || 0),
            savings: Number(selfUpdated.balances?.savings || 0),
            debt: Number(selfUpdated.balances?.debt || 0),
          },
        })
        if (pendingAssignedJobs[state.id]) {
          await loadGame()
        }
      }

      await refreshPeerSnapshots()
    }

    if (failed.length) {
      setError(`Some users failed to save: ${failed.join(', ')}`)
    }
    if (!failed.length) {
      setMessage(`Saved ${Object.keys(savedMap).length} user updates.`)
    }
  }

  // ...removed save economy preset logic...

  // ...removed load economy preset logic...

  // ...removed apply economy to all users logic...

  // ...removed apply historical event to all users logic...

  // ...removed schedule reset historical event logic...

  if (!state?.isAdmin) {
    return <div className="glass p-4 rounded-xl">Admin access required.</div>
  }

  return (
    <div className="space-y-4">
      <div className="glass p-4 rounded-xl space-y-3 border-l-4 border-amber-500">
        <h2 className="text-xl font-semibold">Admin: Economy God Controls</h2>
        <p className="text-sm text-slate-600">These controls affect next-month stock simulation and live job-market availability for all players on this device profile.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Recession Severity: {economyOverrides.recessionSeverity}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={economyOverrides.recessionSeverity}
              onChange={(e) => updateEconomyOverride('recessionSeverity', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Inflation Pressure: {economyOverrides.inflationPressure}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={economyOverrides.inflationPressure}
              onChange={(e) => updateEconomyOverride('inflationPressure', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Available Jobs Slider: {economyOverrides.jobAvailability}%</span>
            <input
              type="range"
              min={40}
              max={180}
              value={economyOverrides.jobAvailability}
              onChange={(e) => updateEconomyOverride('jobAvailability', Number(e.target.value))}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Market Volatility: {economyOverrides.marketVolatility}%</span>
            <input
              type="range"
              min={50}
              max={220}
              value={economyOverrides.marketVolatility}
              onChange={(e) => updateEconomyOverride('marketVolatility', Number(e.target.value))}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStockShock(-0.25)} className="px-3 py-2 rounded bg-rose-700 text-white text-sm font-semibold">Trigger Crash (-25%)</button>
          <button onClick={() => setStockShock(-0.1)} className="px-3 py-2 rounded bg-orange-600 text-white text-sm font-semibold">Trigger Correction (-10%)</button>
          <button onClick={() => setStockShock(0.12)} className="px-3 py-2 rounded bg-emerald-700 text-white text-sm font-semibold">Trigger Rally (+12%)</button>
          <button onClick={resetEconomyOverrides} className="px-3 py-2 rounded bg-slate-200 text-slate-800 text-sm font-semibold">Reset Controls</button>
          <button onClick={saveEconomyPreset} className="px-3 py-2 rounded bg-slate-900 text-white text-sm font-semibold">Save Sliders</button>
          <button onClick={loadEconomyPreset} className="px-3 py-2 rounded bg-slate-200 text-slate-800 text-sm font-semibold">Load Saved Sliders</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-slate-700">Apply sliders to all users for this many months (optional)</span>
            <input
              type="number"
              min={0}
              max={36}
              value={economyApplyMonths}
              onChange={(e) => setEconomyApplyMonths(Math.max(0, Math.min(36, Number(e.target.value || 0))))}
              className="p-2 border rounded text-sm w-full max-w-sm"
            />
            <span className="text-xs text-slate-500">Use 0 for persistent until changed. Positive values auto-expire after that many processed months.</span>
          </label>
          <button
            onClick={applyEconomyToAllUsers}
            disabled={applyingEconomy}
            className="px-4 py-2 rounded bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {applyingEconomy ? 'Applying...' : 'Apply Sliders To All Users'}
          </button>
        </div>

        <div className="text-xs text-slate-600 space-y-1">
          <p>Recommendation: keep recession under 35% for normal play, 35-65% for hard mode, and above 65% only for crisis scenarios.</p>
          <p>Recommendation: keep available jobs between 85% and 120% to avoid soft-locking progression tracks.</p>
          <p>Recommendation: use market volatility above 140% only for short windows (3-6 months) or portfolio outcomes become highly swingy.</p>
        </div>

        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
          <h3 className="text-base font-semibold text-indigo-900">Historical Finance Scenarios</h3>
          <p className="text-xs text-indigo-800">Reenact major economic periods with predefined impacts and a fixed timeline. Users will see a persistent banner until the event expires.</p>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-indigo-800">Scenario</span>
            <select
              value={selectedHistoricalScenarioId}
              onChange={(e) => {
                const nextId = e.target.value
                setSelectedHistoricalScenarioId(nextId)
                const nextScenario = findHistoricalScenarioById(nextId)
                if (nextScenario) setHistoricalEventApplyMonths(nextScenario.defaultDurationMonths)
              }}
              className="p-2 border rounded text-sm bg-white"
            >
              {historicalEconomicEventScenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>{scenario.title} ({scenario.era})</option>
              ))}
            </select>
          </label>

          {selectedHistoricalScenario ? (
            <div className="rounded-lg border border-indigo-100 bg-white/80 p-3 space-y-2">
              <p className="text-sm font-semibold text-indigo-900">{selectedHistoricalScenario.title}</p>
              <p className="text-xs text-indigo-800">{selectedHistoricalScenario.summary}</p>
              <div className="text-xs text-indigo-900 space-y-1">
                <p><span className="font-semibold">Era:</span> {selectedHistoricalScenario.era}</p>
                <p><span className="font-semibold">Default Duration:</span> {selectedHistoricalScenario.defaultDurationMonths} month(s)</p>
                <p><span className="font-semibold">Economic Sliders:</span> recession {selectedHistoricalScenario.economyOverrides.recessionSeverity}%, inflation {selectedHistoricalScenario.economyOverrides.inflationPressure}%, jobs {selectedHistoricalScenario.economyOverrides.jobAvailability}%, volatility {selectedHistoricalScenario.economyOverrides.marketVolatility}%</p>
                <p><span className="font-semibold">Progression Rule:</span> users already in an active scenario continue until finished unless reset is scheduled for next month.</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-indigo-700">Affected Values</p>
                <ul className="list-disc ml-5 mt-1 text-xs text-indigo-900 space-y-1">
                  {selectedHistoricalScenario.affectedValues.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold text-indigo-800">Scenario duration in months</span>
              <input
                type="number"
                min={1}
                max={36}
                value={historicalEventApplyMonths}
                onChange={(e) => setHistoricalEventApplyMonths(Math.max(1, Math.min(36, Number(e.target.value || 1))))}
                className="p-2 border rounded text-sm w-full max-w-sm bg-white"
              />
              <span className="text-xs text-indigo-700">This becomes the event timer shown in each player's reminder banner.</span>
            </label>
            <button
              onClick={applyHistoricalEventToAllUsers}
              disabled={applyingHistoricalEvent || !selectedHistoricalScenario}
              className="px-4 py-2 rounded bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {applyingHistoricalEvent ? 'Applying Scenario...' : 'Apply Historical Scenario To All Users'}
            </button>
          </div>

          <div className="pt-2 border-t border-indigo-200">
            <button
              onClick={scheduleResetHistoricalEventForAllUsers}
              disabled={resettingHistoricalEvent}
              className="px-4 py-2 rounded bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {resettingHistoricalEvent ? 'Scheduling Reset...' : 'Reset All Users To Normal Next Month'}
            </button>
            <p className="text-xs text-indigo-800 mt-1">This does not clear immediately. Each user is restored to neutral conditions when they process their next month.</p>
          </div>
        </div>
      </div>

      <div className="glass p-4 rounded-xl space-y-3">
        <h2 className="text-xl font-semibold">Admin: User Management</h2>
        <p className="text-sm text-slate-600">Your authenticated admin session is required to load and save updates.</p>
        <div className="flex flex-wrap items-end gap-3">
          <button
            onClick={loadUsers}
            disabled={!canLoad || loading}
            className="px-4 py-2 rounded bg-slate-800 text-white disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Load Users'}
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      </div>

      <div className="glass p-4 rounded-xl overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={applyAtRiskPreset}
            className={`px-3 py-2 rounded text-sm font-semibold ${riskPreset === 'at-risk' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'}`}
          >
            At Risk Preset
          </button>
          <button
            onClick={clearPreset}
            disabled={riskPreset === 'none'}
            className="px-3 py-2 rounded text-sm font-semibold bg-slate-100 text-slate-700 disabled:opacity-60"
          >
            Clear Preset
          </button>
          {riskPreset === 'at-risk' ? (
            <span className="text-xs text-rose-700 font-semibold">Showing users with at least 2 risk signals</span>
          ) : null}
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
            Search
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="username, job, education"
              className="p-2 border rounded text-sm font-normal text-slate-800"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
            Education
            <select
              value={educationFilter}
              onChange={(e) => setEducationFilter(e.target.value)}
              className="p-2 border rounded text-sm font-normal text-slate-800"
            >
              <option value="all">All Education Levels</option>
              {educationOptions.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
            Credit Band
            <select
              value={creditFilter}
              onChange={(e) => setCreditFilter(e.target.value)}
              className="p-2 border rounded text-sm font-normal text-slate-800"
            >
              <option value="all">All Scores</option>
              <option value="sub580">Below 580</option>
              <option value="580to669">580 - 669</option>
              <option value="670to739">670 - 739</option>
              <option value="740plus">740+</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500">
            In-Game Year
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="p-2 border rounded text-sm font-normal text-slate-800"
            >
              <option value="all">All Years</option>
              {yearOptions.map(year => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500 md:col-span-1 xl:col-span-2">
            Job Filter
            <input
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              placeholder="contains job title text"
              className="p-2 border rounded text-sm font-normal text-slate-800"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-slate-500 md:col-span-1 xl:col-span-2">
            Sort By
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="p-2 border rounded text-sm font-normal text-slate-800"
            >
              <option value="created-asc">Created Date (Oldest First)</option>
              <option value="created-desc">Created Date (Newest First)</option>
              <option value="updated-desc">Last Updated (Newest First)</option>
              <option value="month-desc">In-Game Timeline (Latest First)</option>
              <option value="credit-desc">Credit Score (Highest First)</option>
              <option value="networth-desc">Net Worth (Highest First)</option>
              <option value="tenure-desc">Tenure (Longest First)</option>
              <option value="username-asc">Username (A-Z)</option>
            </select>
          </label>
        </div>

        <div className="mb-3 text-xs text-slate-600">
          Showing {filteredAndSortedUsers.length} of {users.length} users
        </div>

        <div className="mb-3 flex justify-end">
          <button
            onClick={saveAll}
            disabled={!state?.authToken || savingAll || !users.length}
            className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-60"
          >
            {savingAll ? 'Saving...' : `Save Changes${unsavedCount > 0 ? ` (${unsavedCount})` : ''}`}
          </button>
        </div>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Checking</th>
              <th className="py-2 pr-3">Savings</th>
              <th className="py-2 pr-3">Debt</th>
              <th className="py-2 pr-3">Progression Snapshot</th>
              <th className="py-2 pr-3">Timeline</th>
              <th className="py-2 pr-3">Admin</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedUsers.map(user => (
              <tr key={user.id} className="border-b border-slate-100 align-middle">
                <td className="py-2 pr-3">
                  <div className="font-semibold">{user.username}</div>
                  <div className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}...</div>
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={user.balances.checking}
                    onChange={e => updateRow(user.id, 'checking', e.target.value)}
                    className="p-2 border rounded w-32"
                  />
                  <div className="text-xs text-slate-500 mt-1">${formatMoney(user.balances.checking)}</div>
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    value={user.balances.savings}
                    onChange={e => updateRow(user.id, 'savings', e.target.value)}
                    className="p-2 border rounded w-32"
                  />
                  <div className="text-xs text-slate-500 mt-1">${formatMoney(user.balances.savings)}</div>
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    min="0"
                    value={user.balances.debt}
                    onChange={e => updateRow(user.id, 'debt', e.target.value)}
                    className="p-2 border rounded w-32"
                  />
                  <div className="text-xs text-slate-500 mt-1">${formatMoney(user.balances.debt)}</div>
                </td>
                <td className="py-2 pr-3">
                  <div className="text-xs space-y-1 min-w-[240px]">
                    <div><span className="font-semibold">Job:</span> {user.progression?.jobTitle || 'Unknown'}</div>
                    {pendingAssignedJobs[user.id] ? <div className="text-indigo-700"><span className="font-semibold">Queued Job:</span> {pendingAssignedJobs[user.id]}</div> : null}
                    <div><span className="font-semibold">Edu:</span> {user.progression?.educationLevel || 'Unknown'} ({user.progression?.credentialsCount || 0} creds)</div>
                    <div><span className="font-semibold">Date:</span> M{user.progression?.month || 0} / Y{user.progression?.year || 0} · Tenure {user.progression?.tenureMonths || 0}mo</div>
                    <div><span className="font-semibold">Credit/Happiness:</span> {user.progression?.creditScore || 0} / {user.progression?.happiness || 0}</div>
                    <div><span className="font-semibold">Transit:</span> L{user.progression?.transitLevel || 0} · <span className="font-semibold">Net Worth:</span> ${formatMoney(user.progression?.netWorth || 0)}</div>
                    {/* Removed event scenario display */}
                    {user.progression?.activeEducation ? <div><span className="font-semibold">Active Edu:</span> {user.progression.activeEducation}</div> : null}
                  </div>
                </td>
                <td className="py-2 pr-3 text-xs text-slate-600 min-w-[190px]">
                  <div><span className="font-semibold">Created:</span> {formatDate(user.createdAt)}</div>
                  <div className="mt-1"><span className="font-semibold">Updated:</span> {formatDate(user.updatedAt)}</div>
                </td>
                <td className="py-2 pr-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(user.isAdmin)}
                      disabled={Boolean(user.isPrimaryAdminLocked)}
                      onChange={e => toggleAdmin(user.id, e.target.checked)}
                    />
                    <span>{user.isAdmin ? 'Yes' : 'No'}</span>
                  </label>
                  {user.isPrimaryAdminLocked ? <div className="text-[11px] text-slate-500">Primary admin (locked)</div> : null}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openManage(user)}
                      className="px-3 py-1 rounded bg-slate-800 text-white"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      disabled={deletingUserId === user.id || user.isPrimaryAdminLocked || user.id === state.id}
                      className="px-3 py-1 rounded bg-rose-700 text-white disabled:opacity-60"
                    >
                      {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length ? <p className="text-sm text-slate-500 mt-3">No users loaded yet.</p> : null}
        {users.length > 0 && filteredAndSortedUsers.length === 0 ? <p className="text-sm text-slate-500 mt-3">No users match the current filters.</p> : null}
      </div>

      {manageDraft ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="glass rounded-xl p-5 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold">Manage User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase font-semibold text-slate-500">Username</span>
                <input
                  value={manageDraft.username}
                  onChange={(e) => setManageDraft({ ...manageDraft, username: e.target.value })}
                  className="p-2 border rounded"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase font-semibold text-slate-500">Assign Job</span>
                <select
                  value={manageDraft.assignedJobTitle}
                  onChange={(e) => setManageDraft({ ...manageDraft, assignedJobTitle: e.target.value })}
                  className="p-2 border rounded"
                >
                  <option value="">Keep current job</option>
                  {sortedJobTitles.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase font-semibold text-slate-500">New Password</span>
                <input
                  type="password"
                  value={manageDraft.password}
                  onChange={(e) => setManageDraft({ ...manageDraft, password: e.target.value })}
                  placeholder="Leave blank to keep current"
                  className="p-2 border rounded"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs uppercase font-semibold text-slate-500">Confirm Password</span>
                <input
                  type="password"
                  value={manageDraft.confirmPassword}
                  onChange={(e) => setManageDraft({ ...manageDraft, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="p-2 border rounded"
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setManageDraft(null)}
                className="px-3 py-2 rounded border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={applyManageChanges}
                className="px-3 py-2 rounded bg-slate-900 text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
