import React, { useState } from 'react'
import { useGame } from '../context/GameContext'

export default function Login() {
  const { login, createUser } = useGame()
  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isCreateMode, setIsCreateMode] = useState(false)

  const passwordRules = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Username and password are required.')
      return
    }

    if (isCreateMode) {
      if (!name) {
        setError('Name is required when creating a user.')
        return
      }

      if (!passwordRules.test(password)) {
        setError('Password must be at least 8 characters and include 1 number and 1 symbol.')
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }
    }

    const ok = isCreateMode
      ? await createUser(username, name, password)
      : await login(username, password)

    if (!ok) {
      setError(isCreateMode
        ? 'Unable to create user. Username may already exist.'
        : 'Invalid credentials or unable to reach server.')
    }
  }

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="glass p-8 rounded-xl w-full max-w-sm">
        <h2 className="text-2xl font-small mb-4 ">
          {isCreateMode ? 'Create your account' : 'Your neighbors missed you. (The nice ones, anyway.)'}
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-600 mb-1">Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)} className="w-full p-3 border rounded" placeholder="Enter your username" />
          {isCreateMode ? (
            <p className="mt-1 text-xs text-slate-500">Hint: choose a unique name you will remember.</p>
          ) : null}
        </div>
        {isCreateMode ? (
          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-600 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border rounded" placeholder="John Morgan" />
          </div>
        ) : null}
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
            <p className="mb-4 text-xs text-slate-500">Must be 8+ characters with at least 1 number and 1 symbol.</p>
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
            setName('')
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
