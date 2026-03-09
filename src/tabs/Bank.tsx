import { useMemo } from 'react'
import { useGame } from '../context/GameContext'
import { getAffluenceComparisonFromState } from '../utils/affluence'

export default function Bank() {
  const { state } = useGame()

  const comparison = useMemo(() => getAffluenceComparisonFromState(state), [state])

  const format = (amount: number) =>
    amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  const maxForMeter = Math.max(1, comparison.top.affluence, comparison.currentAffluence, comparison.average)
  const currentWidth = Math.min(100, (comparison.currentAffluence / maxForMeter) * 100)
  const averageWidth = Math.min(100, (comparison.average / maxForMeter) * 100)
  const topWidth = Math.min(100, (comparison.top.affluence / maxForMeter) * 100)

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bank & Affluence</h2>
        <p className="text-sm text-slate-600">Your wealth meter compares your affluence against the average and highest user in this browser.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Your Affluence</p>
          <p className="text-2xl font-bold text-emerald-700">{format(comparison.currentAffluence)}</p>
        </div>
        <div className="glass p-4">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Average User</p>
          <p className="text-2xl font-bold text-sky-700">{format(comparison.average)}</p>
        </div>
        <div className="glass p-4">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Most Affluent User</p>
          <p className="text-lg font-bold text-violet-700">{comparison.top.user}</p>
          <p className="text-xl font-bold text-violet-700">{format(comparison.top.affluence)}</p>
        </div>
      </div>

      <div className="glass p-6 space-y-4">
        <h3 className="font-bold text-lg">📈 Affluence Meter</h3>

        <div>
          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
            <span>You</span>
            <span>{format(comparison.currentAffluence)}</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-3 bg-emerald-500 rounded-full" style={{ width: `${currentWidth}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
            <span>Average</span>
            <span>{format(comparison.average)}</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-3 bg-sky-500 rounded-full" style={{ width: `${averageWidth}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
            <span>Top User ({comparison.top.user})</span>
            <span>{format(comparison.top.affluence)}</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-3 bg-violet-500 rounded-full" style={{ width: `${topWidth}%` }} />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700">
          Rank: <span className="font-bold">#{comparison.rank}</span> of <span className="font-bold">{comparison.count}</span>
          {' '}| Percentile: <span className="font-bold">{comparison.percentile}th</span>
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-3">🏦 Top Affluence Board</h3>
        <div className="space-y-2">
          {comparison.topPeers.map((peer, index) => (
            <div key={`${peer.user}-${index}`} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="text-sm font-bold text-slate-700">#{index + 1} {peer.user}</div>
              <div className="text-sm font-bold text-slate-900">{format(peer.affluence)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
