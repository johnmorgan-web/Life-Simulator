import { useGame } from '../context/GameContext'

export default function Academy() {
  const { state, dispatch } = useGame()
  const courses = [{ n: 'HS Diploma', m: 1, c: 200 }, { n: 'Trade Cert', m: 3, c: 800 }, { n: 'Degree', m: 12, c: 1200 }]

  return (
    <div className="grid grid-cols-2 gap-4">
      {courses.map(e => {
        const has = state.credentials.includes(e.n)
        const inProgress = state.activeEdu === e.n
        const progress = Math.min(100, (state.eduProgress[e.n] / e.m) * 100)
        return (
          <div key={e.n} className="glass p-6">
            <h4 className="font-bold">{e.n}</h4>
            <p className="text-xs text-slate-500 mb-4">${e.c}/mo x {e.m} months</p>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-4 overflow-hidden"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
            {has ? (
              <p className="text-emerald-600 font-bold text-xs">GRADUATED</p>
            ) : inProgress ? (
              <button disabled className="w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold uppercase">Enrolled</button>
            ) : (
              <button onClick={() => dispatch({ type: 'SET_STATE', payload: { activeEdu: e.n } })} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase">Enroll</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
