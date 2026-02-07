import React, { useState } from 'react'
import { useGame } from '../context/GameContext'

export default function Login() {
  const { login, listSaves } = useGame()
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [existing, setExisting] = useState<string[] | null>(null)

  React.useEffect(() => {
    const keys = listSaves()
    setExisting(keys || [])
  }, [listSaves])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    login(user, password)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="glass p-8 rounded-xl w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4">Welcome — Sign In</h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-1">Username</label>
          <input value={user} onChange={e => setUser(e.target.value)} className="w-full p-3 border rounded" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-600 mb-1">Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full p-3 border rounded" />
        </div>
        <div className="flex gap-3">
          <button type="submit" className="flex-1 bg-slate-900 text-white py-3 rounded font-bold">Sign In</button>
        </div>
        {existing && existing.length > 0 && (
          <div className="mt-4 text-xs text-slate-500">
            Existing saves: {existing.join(', ')}
          </div>
        )}
      </form>
    </div>
  )
}
