import React, { useEffect, useState } from 'react'
import { useGame } from '../context/GameContext'
import { isPasswordValid, PASSWORD_POLICY_MESSAGE } from '../utils/passwordPolicy'
import { checkForPublishedUpdate } from '../utils/publishedUpdate'

declare const __APP_VERSION__: string

export default function Login() {
  const { login, createUser } = useGame()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [welcomePopupMessage, setWelcomePopupMessage] = useState<string | null>(null)

  const signInPhrases = [
    'Clock in, check the ledger, and make this month count.',
    'Your city is waiting. Your budget is judging.',
    'Smart moves compound. So do late fees.',
    'One login away from your next promotion.',
    'Balance first, flex later.',
    'Big dreams, small steps, smart choices.',
    'Your piggy bank called. It said, "Let us cook."',
    'Be the boss of your bucks.',
    'Save today, celebrate tomorrow.',
    'Math powers on. Adventure begins.',
    'Build your life one good choice at a time.',
    'Spend like a hero, not like a zero.',
    'Future-you is cheering for today-you.',
    'Login now. Level up your money game.',
    'Your financial journey continues. Let’s make it legendary.',
    'Every login is a step towards your next big win.',
    'Your neighbors are watching. Show them how it’s done.',
    'Your money, your rules. Let’s get started.',
  ]

  const welcomeBackMessages = [
    'Great to see you return. Let\'s continue building your story.',
    'Your city missed you. Let\'s pick up where you left off.',
    'Welcome back! Your next smart move is waiting.',
    'Glad you are back. Time to make this month a good one.',
    'Welcome back! Let\'s keep your progress rolling.',
    'Nice to have you back. Your journey continues today.',
    'Welcome back! Ready for another great chapter?',
    'Good to see you again. Let\'s make more progress together.',
  ]

  useEffect(() => {
    void checkForPublishedUpdate()
  }, [])

  useEffect(() => {
    if (isCreateMode) return
    const timer = window.setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % signInPhrases.length)
    }, 7000)
    return () => window.clearInterval(timer)
  }, [isCreateMode, signInPhrases.length])

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
      return
    }

    if (!isCreateMode) {
      const cleanUsername = String(username || '').trim() || 'Player'
      const message = welcomeBackMessages[Math.floor(Math.random() * welcomeBackMessages.length)]
      setWelcomePopupMessage(`Welcome back, ${cleanUsername}! ${message}`)
    }
  }

  return (
    <div className="min-h-screen bg-white/50 flex items-start sm:items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="glass relative p-8 rounded-xl w-full max-w-sm">
        <img src="/LedgerLegends.png" alt="Ledger Legends" className="w-full mb-4 rounded-xl" />
        <h2 className="text-2xl font-small mb-4 text-center">
          {isCreateMode ? 'Create your account' : signInPhrases[phraseIndex]}
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
        <p className="absolute bottom-3 right-4 text-[10px] text-slate-400">
          v{__APP_VERSION__}
        </p>
      </form>
      {welcomePopupMessage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setWelcomePopupMessage(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-800">Welcome Back</h3>
              <button
                type="button"
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close welcome message"
                onClick={() => setWelcomePopupMessage(null)}
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-700">{welcomePopupMessage}</p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
                onClick={() => setWelcomePopupMessage(null)}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
