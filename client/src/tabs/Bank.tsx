import { useMemo } from 'react'
import { useGame } from '../context/GameContext'

function CoinHeap({ label, affluence, maxAffluence, accent, stats, userLabel }: {
  label: string
  affluence: number
  maxAffluence: number
  accent: string
  userLabel: string
  stats: {
    annualIncome: number
    checking: number
    savings: number
    investedStocks: number
    carsOwned: number
    luxuryServicesOwned: number
    houseLevel: number
  }
}) {
  const coins = Math.max(4, Math.round((Math.max(0, affluence) / Math.max(1, maxAffluence)) * 18))
  const format = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div className="relative group glass p-4 border border-amber-200 bg-gradient-to-b from-amber-50 to-yellow-100">
      <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-800 mb-2">{userLabel}</p>
      <div className="min-h-[96px] flex flex-wrap-reverse content-end gap-1">
        {Array.from({ length: coins }).map((_, i) => (
          <span
            key={`${label}-${i}`}
            className="coin-dot"
            style={{
              backgroundColor: accent,
              opacity: 0.72 + ((i % 5) * 0.05)
            }}
          />
        ))}
      </div>
      <p className="text-sm font-bold mt-2 text-slate-900">{format(affluence)}</p>

      <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute z-20 left-2 right-2 top-2 bg-slate-900 text-white rounded-xl p-3 shadow-2xl">
        <p className="text-xs font-bold mb-2">{label} Snapshot</p>
        <div className="text-[11px] space-y-1">
          <p>Annual Income: <span className="font-bold">{format(stats.annualIncome)}</span></p>
          <p>Checking: <span className="font-bold">{format(stats.checking)}</span></p>
          <p>Savings: <span className="font-bold">{format(stats.savings)}</span></p>
          <p>Stocks Invested: <span className="font-bold">{format(stats.investedStocks)}</span></p>
          <p>Cars Owned: <span className="font-bold">{stats.carsOwned}</span></p>
          <p>Luxury Services: <span className="font-bold">{stats.luxuryServicesOwned}</span></p>
          <p>House Level: <span className="font-bold">{stats.houseLevel}</span></p>
        </div>
      </div>
    </div>
  )
}

export default function Bank() {
  const { affluenceComparison: comparison } = useGame()

  const maxForMeter = useMemo(() => Math.max(1, comparison.top.affluence, comparison.currentAffluence, comparison.average), [comparison])

  const format = (amount: number) =>
    amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  const currentWidth = Math.min(100, (comparison.currentAffluence / maxForMeter) * 100)
  const averageWidth = Math.min(100, (comparison.average / maxForMeter) * 100)
  const topWidth = Math.min(100, (comparison.top.affluence / maxForMeter) * 100)

  return (
    <div className="space-y-6">
      <div className="glass p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Bank & Affluence</h2>
        <p className="text-sm text-slate-600">Your wealth meter compares your affluence against the average and highest player on the server.</p>
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
        <h3 className="font-bold text-lg mb-1">🪙 Coin Heap Comparison</h3>
        <p className="text-xs text-slate-500 mb-4">Hover each heap to compare annual income, balances, stock investment, cars, luxury services, and house level.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CoinHeap
            label="You"
            userLabel={comparison.currentUser}
            affluence={comparison.currentAffluence}
            maxAffluence={Math.max(1, comparison.currentAffluence, comparison.average, comparison.top.affluence)}
            accent="#f59e0b"
            stats={comparison.currentProfile}
          />
          <CoinHeap
            label="Average"
            userLabel="All Players"
            affluence={comparison.average}
            maxAffluence={Math.max(1, comparison.currentAffluence, comparison.average, comparison.top.affluence)}
            accent="#eab308"
            stats={comparison.averageProfile}
          />
          <CoinHeap
            label="Wealthiest"
            userLabel={comparison.top.user}
            affluence={comparison.top.affluence}
            maxAffluence={Math.max(1, comparison.currentAffluence, comparison.average, comparison.top.affluence)}
            accent="#f97316"
            stats={comparison.topProfile}
          />
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-bold text-lg mb-3">🏦 Top Affluence Board</h3>
        <div className="space-y-2">
          {comparison.topPeers.map((peer: any, index: number) => (
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
