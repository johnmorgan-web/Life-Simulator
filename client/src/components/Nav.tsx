
import { useGame } from '../context/GameContext'

export default function Nav({ tab, setTab }: any) {
  const { state } = useGame()
  const vehicleCount = Array.isArray(state.garage) ? state.garage.length : 0
  const propertyCount = Array.isArray(state.investmentProperties) ? state.investmentProperties.length : 0
  const rewardTokens = Number(state.rewardTokens || 0)
  const garageIconStrip = vehicleCount > 0 ? `${'🚘'.repeat(Math.min(vehicleCount, 3))}${vehicleCount > 3 ? '+' : ''}` : 'No vehicles'

  const tabs = [
    { id: 'academy', label: '🏛️ Academy' },
    ...(state.isAdmin ? [{ id: 'admin', label: '🛡️ Admin' }] : []),
    { id: 'bank', label: '🏦 Bank' },
    { id: 'careers', label: '💼 Careers' },
    { id: 'ledger', label: '📓 Journal' },
    { id: 'lifestyle', label: '💎 Lifestyle' },
    { id: 'loans', label: '💳 Loans' },
    { id: 'real-estate', label: `🏘️ Real Estate (${propertyCount})` },
    { id: 'relocate', label: '✈️ Relocate' },
    { id: 'resume', label: '📄 Resume' },
    { id: 'rewards', label: '🎁 Rewards' },
    { id: 'stocks', label: '📈 Stocks' },
    { id: 'transit', label: `🚗 Transit (${vehicleCount})` }
  ]
  return (
    <nav className="col-span-2">
      <div className="space-y-2.5 sticky top-6">
        <div className="glass px-4 py-3 border border-slate-200 bg-white/80">
          <p className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Garage</p>
          <p className="text-sm font-bold text-slate-700">{garageIconStrip}</p>
        </div>
        {tabs.map(t => {
          const isRewards = t.id === 'rewards'
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`w-full text-left px-5 py-3.5 glass ${tab === t.id ? 'tab-active' : 'text-slate-500'} flex items-center justify-between text-base font-semibold`}>
              <span className="leading-tight">{t.label}</span>
              {isRewards && rewardTokens > 0 ? (
                <span className="ml-2 min-w-7 h-7 px-2 rounded-full bg-violet-600 text-white text-sm font-bold inline-flex items-center justify-center">
                  {rewardTokens}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
