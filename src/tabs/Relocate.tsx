import React from 'react'
import { useGame } from '../context/GameContext'

export default function Relocate() {
  const { state, dispatch, cityData, buildLedger } = useGame()
  return (
    <div className="grid grid-cols-3 gap-4">
      {cityData.map((c: any) => (
        <div key={c.name} className={`glass p-6 ${state.city.name === c.name ? 'card-active' : ''}`}>
          <h4 className="font-bold">{c.icon} {c.name}</h4>
          <p className="text-[10px] uppercase font-bold text-slate-400">Rent: {c.r}x | Pay: {c.p}x</p>
          <button onClick={() => {
            // require relocation funds
            dispatch({ type: 'SET_STATE', payload: { city: c, debt: state.debt + 1500, job: { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 }, jobStartMonth: state.month, jobStartYear: state.year, tenure: 0 } })
            // rebuild ledger to reflect new city
            setTimeout(() => buildLedger(), 0)
          }} className="mt-4 w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase">Move ($1,500)</button>
        </div>
      ))}
    </div>
  )
}
