import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy'
import { findHistoricalScenarioById, historicalEconomicEventScenarios } from '../constants/historicalEconomicEvents.constants'

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
    cityName?: string
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
    pandemicHistoryMonths?: number
    historicalEventId?: string
    historicalEventEra?: string
    historicalEventTitle?: string
    historicalEventMonthsRemaining?: number
    historicalEventResetNextMonth?: boolean
  }
}

function computePandemicEraCounts(users: AdminUserRow[]) {
  const counts: Record<string, number> = {}

  for (const user of users) {
    const monthsRemaining = Math.max(0, Number(user.progression?.historicalEventMonthsRemaining || 0))
    if (monthsRemaining <= 0) continue

    const historicalEventId = String(user.progression?.historicalEventId || '').toLowerCase()
    const historicalEventTitle = String(user.progression?.historicalEventTitle || '').toLowerCase()
    const looksPandemic = historicalEventId.includes('pandemic') || historicalEventTitle.includes('pandemic')
    if (!looksPandemic) continue

    const eraLabel = String(user.progression?.historicalEventEra || '').trim() || 'Unknown Era'
    counts[eraLabel] = (counts[eraLabel] || 0) + 1
  }

  return counts
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
  const { state, dispatch, listUsersForAdmin, saveUserAsAdmin, deleteUserAsAdmin, refreshPeerSnapshots, jobBoard, loadGame } = useGame()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [baseUsers, setBaseUsers] = useState<Record<string, AdminUserRow>>({})
  const [pendingPasswords, setPendingPasswords] = useState<Record<string, string>>({})
  const [pendingAssignedJobs, setPendingAssignedJobs] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [educationFilter, setEducationFilter] = useState('all')
  const [creditFilter, setCreditFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [jobFilter, setJobFilter] = useState('')
  const [sortBy, setSortBy] = useState('updated-desc')
  const [riskPreset, setRiskPreset] = useState<'none' | 'at-risk'>('none')
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [applyingHistoricalEvent, setApplyingHistoricalEvent] = useState(false)
  const [resettingHistoricalEvent, setResettingHistoricalEvent] = useState(false)
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false)
  const [selectedHistoricalScenarioId, setSelectedHistoricalScenarioId] = useState<string>(historicalEconomicEventScenarios[0]?.id || '')
  const [historicalEventApplyMonths, setHistoricalEventApplyMonths] = useState<number>(historicalEconomicEventScenarios[0]?.defaultDurationMonths || 6)
  const [manageDraft, setManageDraft] = useState<ManageDraft | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const sortedJobTitles = useMemo(() => {
    return [...(Array.isArray(jobBoard) ? jobBoard : [])]
      .map((job: any) => String(job?.title || '').trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
  }, [jobBoard])

  const selectedHistoricalScenario = useMemo(() => {
    return findHistoricalScenarioById(selectedHistoricalScenarioId)
  }, [selectedHistoricalScenarioId])

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

  const pandemicEraCounts = useMemo(() => computePandemicEraCounts(users), [users])
  const pandemicEraSummary = useMemo(() => {
    const entries = Object.entries(pandemicEraCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    if (!entries.length) return 'No active pandemic scenarios.'
    return entries.map(([era, count]) => `${era}: ${count}`).join(' | ')
  }, [pandemicEraCounts])

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
          String(user.progression?.cityName || ''),
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
        default:
          return (Number.isFinite(bUpdated) ? bUpdated : 0) - (Number.isFinite(aUpdated) ? aUpdated : 0)
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
    setHasLoadedUsers(true)
    setBaseUsers(Object.fromEntries(response.map((user: AdminUserRow) => [user.id, user])))
    setPendingPasswords({})
    setPendingAssignedJobs({})
    const summary = computePandemicEraCounts(response)
    const entries = Object.entries(summary).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    const pandemicMessage = entries.length
      ? ` Pandemic era totals: ${entries.map(([era, count]) => `${era}: ${count}`).join(' | ')}.`
      : ' Pandemic era totals: none active.'
    setMessage(`Loaded ${response.length} users.${pandemicMessage}`)
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

  const applyHistoricalEventToAllUsers = async () => {
    if (!state?.authToken) {
      setError('You must be logged in to apply historical events.')
      return
    }

    if (!selectedHistoricalScenario) {
      setError('Select a historical event scenario first.')
      return
    }

    const normalizedMonths = Math.max(1, Math.min(36, Math.floor(Number(historicalEventApplyMonths || selectedHistoricalScenario.defaultDurationMonths || 6))))

    setApplyingHistoricalEvent(true)
    setError('')
    setMessage('')

    let targetUsers = users
    if (!targetUsers.length) {
      const response = await listUsersForAdmin()
      if (!response) {
        setApplyingHistoricalEvent(false)
        setError('Unable to load users for historical event broadcast.')
        return
      }
      targetUsers = response
      setUsers(response)
      setBaseUsers(Object.fromEntries(response.map((user: AdminUserRow) => [user.id, user])))
    }

    const failed: string[] = []
    const savedMap: Record<string, AdminUserRow> = {}
    const skippedActive: string[] = []

    for (const row of targetUsers) {
      const activeMonths = Math.max(0, Number(row.progression?.historicalEventMonthsRemaining || 0))
      const alreadyResetScheduled = Boolean(row.progression?.historicalEventResetNextMonth)
      if (activeMonths > 0 && !alreadyResetScheduled) {
        skippedActive.push(row.username)
        continue
      }

      const startMonth = Math.max(1, Math.min(12, Number(row.progression?.month || state.month || 1)))
      const startYear = Math.max(1, Number(row.progression?.year || state.year || 2026))
      const saved = await saveUserAsAdmin(row.id, {
        checking: Number(row.balances.checking || 0),
        savings: Number(row.balances.savings || 0),
        debt: Number(row.balances.debt || 0),
        isAdmin: Boolean(row.isAdmin),
        username: row.username,
        economyOverrides: selectedHistoricalScenario.economyOverrides,
        economyApplyMonths: normalizedMonths,
        historicalEventResetNextMonth: false,
        historicalEconomicEvent: {
          id: selectedHistoricalScenario.id,
          title: selectedHistoricalScenario.title,
          era: selectedHistoricalScenario.era,
          summary: selectedHistoricalScenario.summary,
          realWorldImpact: selectedHistoricalScenario.realWorldImpact || '',
          keyStatistics: Array.isArray(selectedHistoricalScenario.keyStatistics) ? selectedHistoricalScenario.keyStatistics : [],
          totalMonths: normalizedMonths,
          monthsRemaining: normalizedMonths,
          startedMonth: startMonth,
          startedYear: startYear,
          effects: selectedHistoricalScenario.effects,
        },
      })

      if (!saved) {
        failed.push(row.username)
      } else {
        savedMap[row.id] = saved
      }
    }

    setApplyingHistoricalEvent(false)

    if (Object.keys(savedMap).length) {
      setUsers(prev => prev.map(user => savedMap[user.id] || user))
      setBaseUsers(prev => ({ ...prev, ...savedMap }))
      await refreshPeerSnapshots()
    }

    if (failed.length) {
      setError(`Historical event broadcast failed for: ${failed.join(', ')}`)
      return
    }

    const skippedSummary = skippedActive.length
      ? ` Skipped ${skippedActive.length} active user${skippedActive.length === 1 ? '' : 's'} still progressing through existing scenarios.`
      : ''
    setMessage(`Applied historical scenario "${selectedHistoricalScenario.title}" to ${Object.keys(savedMap).length} users for ${normalizedMonths} month${normalizedMonths === 1 ? '' : 's'}.${skippedSummary}`)
  }

  const scheduleResetHistoricalEventForAllUsers = async () => {
    if (!state?.authToken) {
      setError('You must be logged in to schedule historical reset.')
      return
    }

    setResettingHistoricalEvent(true)
    setError('')
    setMessage('')

    let targetUsers = users
    if (!targetUsers.length) {
      const response = await listUsersForAdmin()
      if (!response) {
        setResettingHistoricalEvent(false)
        setError('Unable to load users for reset scheduling.')
        return
      }
      targetUsers = response
      setUsers(response)
      setBaseUsers(Object.fromEntries(response.map((user: AdminUserRow) => [user.id, user])))
    }

    const failed: string[] = []
    const savedMap: Record<string, AdminUserRow> = {}

    for (const row of targetUsers) {
      const saved = await saveUserAsAdmin(row.id, {
        checking: Number(row.balances.checking || 0),
        savings: Number(row.balances.savings || 0),
        debt: Number(row.balances.debt || 0),
        isAdmin: Boolean(row.isAdmin),
        username: row.username,
        historicalEventResetNextMonth: true,
      })

      if (!saved) failed.push(row.username)
      else savedMap[row.id] = saved
    }

    setResettingHistoricalEvent(false)

    if (Object.keys(savedMap).length) {
      setUsers(prev => prev.map(user => savedMap[user.id] || user))
      setBaseUsers(prev => ({ ...prev, ...savedMap }))
      await refreshPeerSnapshots()
    }

    if (failed.length) {
      setError(`Reset scheduling failed for: ${failed.join(', ')}`)
      return
    }

    setMessage(`Scheduled reset to normal circumstances next month for ${Object.keys(savedMap).length} users.`)
  }

  if (!state?.isAdmin) {
    return <div className="glass p-4 rounded-xl">Admin access required.</div>
  }

  return (
    <div className="space-y-4">
      <div className="glass p-4 rounded-xl space-y-3 border-l-4 border-indigo-500">
        <h2 className="text-xl font-semibold">Admin: Historical Crisis Events</h2>
        <p className="text-sm text-slate-600">Run structured economic scenarios to teach risk management, emergency savings, and diversification. Job availability remains deterministic, but crisis effects can still impact job outcomes, income, and market conditions.</p>

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
            {selectedHistoricalScenario.realWorldImpact ? (
              <p className="text-xs text-indigo-900">{selectedHistoricalScenario.realWorldImpact}</p>
            ) : null}
            <div className="text-xs text-indigo-900 space-y-1">
              <p><span className="font-semibold">Default Duration:</span> {selectedHistoricalScenario.defaultDurationMonths} month(s)</p>
              <p><span className="font-semibold">Learning Focus:</span> maintain cash reserves, avoid over-concentration, and prepare for volatility.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-indigo-700">Affected Values</p>
              <ul className="list-disc ml-5 mt-1 text-xs text-indigo-900 space-y-1">
                {selectedHistoricalScenario.affectedValues.map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            </div>
            {Array.isArray(selectedHistoricalScenario.keyStatistics) && selectedHistoricalScenario.keyStatistics.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase text-indigo-700">Historical Stats</p>
                <ul className="list-disc ml-5 mt-1 text-xs text-indigo-900 space-y-1">
                  {selectedHistoricalScenario.keyStatistics.map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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
          </label>
          <button
            onClick={applyHistoricalEventToAllUsers}
            disabled={applyingHistoricalEvent || !selectedHistoricalScenario}
            className="px-4 py-2 rounded bg-indigo-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            {applyingHistoricalEvent ? 'Applying Scenario...' : 'Apply Scenario To All Users'}
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
        {hasLoadedUsers ? <p className="text-sm text-indigo-700"><span className="font-semibold">Active Pandemic Eras:</span> {pandemicEraSummary}</p> : null}
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
                    <div><span className="font-semibold">City:</span> {user.progression?.cityName || 'Unknown'} · <span className="font-semibold">Pandemic History:</span> {Number(user.progression?.pandemicHistoryMonths || 0)} month(s)</div>
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
