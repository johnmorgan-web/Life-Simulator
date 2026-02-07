import { useGame } from '../context/GameContext'
import academyCourses from '../constants/academyCourses.constants'

export default function Academy() {
  const { state, dispatch } = useGame()

  const canEnroll = (course: any) => {
    // Can't enroll if already graduated
    if (state.credentials.includes(course.n)) return false
    // If already in progress, can't enroll another
    if (state.activeEdu === course.n) return true // show as "enrolled" state
    // Check prerequisites
    if (course.prereq && !state.credentials.includes(course.prereq)) {
      return false
    }
    return true
  }

  const getStatusMessage = (course: any) => {
    if (state.credentials.includes(course.n)) {
      return 'GRADUATED'
    }
    if (course.prereq && !state.credentials.includes(course.prereq)) {
      return `Requires: ${course.prereq}`
    }
    return null
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {academyCourses.map(e => {
        const has = state.credentials.includes(e.n)
        const inProgress = state.activeEdu === e.n
        const progress = Math.min(100, (state.eduProgress[e.n] || 0) / e.m * 100)
        const locked = !canEnroll(e)
        const statusMsg = getStatusMessage(e)

        return (
          <div key={e.n} className={`glass p-6 ${locked ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{e.icon}</span>
              <h4 className="font-bold">{e.n}</h4>
            </div>
            <p className="text-xs text-slate-500 mb-2">${e.c}/mo × {e.m} months</p>
            {statusMsg && <p className="text-[10px] text-amber-600 font-bold mb-2">{statusMsg}</p>}
            <div className="w-full bg-slate-100 h-2 rounded-full mb-4 overflow-hidden">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            {has ? (
              <p className="text-emerald-600 font-bold text-xs">✓ GRADUATED</p>
            ) : inProgress ? (
              <button disabled className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold uppercase">In Progress</button>
            ) : (
              <button
                disabled={locked}
                onClick={() => dispatch({ type: 'SET_STATE', payload: { activeEdu: e.n } })}
                className={`w-full py-2 rounded-lg text-xs font-bold uppercase ${locked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white'}`}
              >
                Enroll
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
