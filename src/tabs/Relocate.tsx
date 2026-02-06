import { useGame } from '../context/GameContext'
import type { City } from '../types/models.types'


export default function Relocate() {
  const { state, dispatch, cityData } = useGame()
  return (
    <div className="grid grid-cols-3 gap-4">
      {(cityData as City[]).sort((a, b) => a.name.localeCompare(b.name)).map((c: any) => (
        <div key={c.name} className={`glass p-6 ${state.city.name === c.name ? 'card-active' : ''}`}>
          <h4 className="font-bold">{c.icon} {c.name}</h4>
          <p className="text-[13px] uppercase font-bold text-slate-400">Rent: {c.r}x | Pay: {c.p}x</p>
          {state.city.name === c.name ? (
            <button onClick={() => {
              // unmark pending city if currently selected
              dispatch({ type: 'SET_STATE', payload: { pendingCity: null, pendingJob: null } })
            }} disabled={state.pendingCity == null} className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">CURRENT</button>
          ) : state.pendingCity?.name === c.name ? (
            <button className="mt-4 w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold">PENDING</button>
          ) : (
            <button onClick={() =>
              // mark city as pending so the move happens on the next month progression
              // do NOT charge debt now; charge occurs when the month advances to prevent spamming
              dispatch({ type: 'SET_STATE', payload: { pendingCity: c, pendingJob: { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 } } })
            } className="mt-4 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">Move ($1,500)</button>
          )}
        </div>
      ))}
    </div>
  )
}
