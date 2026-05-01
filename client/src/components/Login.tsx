import React, { useState } from 'react'
import { useGame } from '../context/GameContext'
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy'

export default function Login() {
  const { login, createUser } = useGame()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isCreateMode, setIsCreateMode] = useState(false)

  const handleUsernameChange = (value: string) => {
    if (isCreateMode) {
      setUsername(value.replace(/[^A-Za-z0-9]/g, ''))
      return
    }
    setUsername(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Username and password are required.')
      return
    }

    if (isCreateMode) {
      if (!isPasswordValid(password)) {
        setError(PASSWORD_POLICY_MESSAGE)
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    const result = isCreateMode
      ? await createUser(username, password)
      : await login(username, password)

    if (!result?.ok) {
      setError(result?.error || (isCreateMode
        ? 'Unable to create user. Username may already exist.'
        : 'Invalid credentials or unable to reach server.'))
    }
  }

  return (
    <div className="min-h-screen bg-white/50 flex items-start sm:items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="glass p-8 rounded-xl w-full max-w-sm">
        <img src="/LedgerLegends.png" alt="Ledger Legends" className="w-full mb-4 rounded-xl" />
        <h2 className="text-2xl font-small mb-4 ">
          {isCreateMode ? 'Create your account' : 'Your neighbors missed you. (The nice ones, anyway.)'}
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-1">Username</label>
          <input value={username} onChange={e => handleUsernameChange(e.target.value)} className="w-full p-3 border rounded" placeholder="Enter your username" />
          {isCreateMode ? (
            <>
              <p className="mt-1 text-xs text-slate-500">Hint: choose a unique username you will remember.</p>
              <p className="mt-1 text-xs text-amber-700">For privacy, do not use your real name in your username.</p>
            </>
          ) : null}
        </div>
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-600 mb-1">Password</label>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full p-3 border rounded" placeholder="Password" />
        </div>
        {isCreateMode ? (
          <>
            <div className="mb-3">
              <label className="block text-sm font-bold text-slate-600 mb-1">Retype Password</label>
              <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" className="w-full p-3 border rounded" placeholder="Retype password" />
            </div>
            <p className="mb-4 text-xs text-slate-500">{PASSWORD_POLICY_MESSAGE}</p>
          </>
        ) : null}
        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded font-bold hover:bg-slate-800">
          {isCreateMode ? 'Create User' : 'Sign In'}
        </button>
        <button
          type="button"
          onClick={() => {
            setError('')
            setPassword('')
            setConfirmPassword('')
            setIsCreateMode((prev) => !prev)
          }}
          className="mt-4 w-full text-sm text-slate-700 underline"
        >
          {isCreateMode ? 'Back to Sign In' : 'Create user'}
        </button>
      </form>
    </div>
  )
}
