import { useGame } from '../context/GameContext'
import type { TransitOption } from '../types/models.types'

export default function Transit() {
  const { state, dispatch, transitOptions } = useGame()

  return (
    <div className="grid grid-cols-3 gap-4">
      {transitOptions.map((o: TransitOption) => (
        <div key={o.n} className={`glass p-6 ${state.transit.name === o.n ? 'card-active' : ''} ${state.pendingTransit?.n === o.n ? 'card-pending' : ''}`}>
          <h4 className="font-bold">{o.n}</h4>
          <p className="text-sm">${o.c}/mo</p>
          {o.subText && <p className="text-xs text-slate-400">{o.subText}</p>}
          {state.transit.name === o.n ? (
            <button disabled className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">CURRENT</button>
          ) : state.pendingTransit?.n === o.n ? (
            <button className="mt-4 w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold">PENDING</button>
          ) : (
            <button onClick={() => dispatch({ type: 'SET_STATE', payload: { pendingTransit: o } })} className="mt-4 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">SELECT</button>
          )}
        </div>
      ))}
    </div>
  )
}
