import { useMemo, useState } from 'react'
import { useGame } from '../context/GameContext'
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy'

type AdminUserRow = {
  id: string
  username: string
  isAdmin: boolean
  isPrimaryAdminLocked?: boolean
  createdAt?: string
  balances: {
    checking: number
    savings: number
    debt: number
  }
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type ManageDraft = {
  id: string
  username: string
  password: string
  confirmPassword: string
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
  const { state, dispatch, listUsersForAdmin, saveUserAsAdmin, refreshPeerSnapshots } = useGame()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [baseUsers, setBaseUsers] = useState<Record<string, AdminUserRow>>({})
  const [pendingPasswords, setPendingPasswords] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [manageDraft, setManageDraft] = useState<ManageDraft | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const canLoad = useMemo(() => Boolean(state?.isAdmin && state?.id && state?.authToken), [state?.isAdmin, state?.id, state?.authToken])
  const unsavedCount = useMemo(() => {
    return users.filter(user => {
      const baseline = baseUsers[user.id]
      return !!baseline && (rowChanged(user, baseline) || Boolean(pendingPasswords[user.id]))
    }).length
  }, [users, baseUsers, pendingPasswords])
  const usersSortedByCreatedDate = useMemo(() => {
    return [...users].sort((a, b) => {
      const aTs = Date.parse(String(a.createdAt || ''))
      const bTs = Date.parse(String(b.createdAt || ''))
      if (!Number.isFinite(aTs) && !Number.isFinite(bTs)) return 0
      if (!Number.isFinite(aTs)) return 1
      if (!Number.isFinite(bTs)) return -1
      return aTs - bTs
    })
  }, [users])

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
      return !!baseline && (rowChanged(user, baseline) || Boolean(pendingPasswords[user.id]))
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
      const saved = await saveUserAsAdmin(row.id, {
        checking: Number(row.balances.checking || 0),
        savings: Number(row.balances.savings || 0),
        debt: Number(row.balances.debt || 0),
        isAdmin: Boolean(row.isAdmin),
        username: row.username,
        password: pendingPasswords[row.id],
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

  if (!state?.isAdmin) {
    return <div className="glass p-4 rounded-xl">Admin access required.</div>
  }

  return (
    <div className="space-y-4">
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
              <th className="py-2 pr-3">Admin</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersSortedByCreatedDate.map(user => (
              <tr key={user.id} className="border-b border-slate-100 align-middle">
                <td className="py-2 pr-3">
                  <div className="font-semibold">{user.username}</div>
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
                    value={user.balances.debt}
                    onChange={e => updateRow(user.id, 'debt', e.target.value)}
                    className="p-2 border rounded w-32"
                  />
                  <div className="text-xs text-slate-500 mt-1">${formatMoney(user.balances.debt)}</div>
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
                  <button
                    onClick={() => openManage(user)}
                    className="px-3 py-1 rounded bg-slate-800 text-white"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length ? <p className="text-sm text-slate-500 mt-3">No users loaded yet.</p> : null}
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
