import React, { useState } from 'react'
import { useGame } from '../context/GameContext'

export default function Login() {
  const { login } = useGame()
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    login(user, password)
  }

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="glass p-8 rounded-xl w-full max-w-sm">
        <h2 className="text-2xl font-small mb-4 ">Your neighbors missed you. (The nice ones, anyway.)</h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-1">Username</label>
          <input value={user} onChange={e => setUser(e.target.value)} className="w-full p-3 border rounded" placeholder="Enter your username" />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-600 mb-1">Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full p-3 border rounded" placeholder="Password" />
        </div>
        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-bold hover:bg-slate-800">Sign In</button>
      </form>
    </div>
  )
}
