
import { useGame } from '../context/GameContext'

export default function Nav({ tab, setTab }: any) {
  const { state } = useGame()
  const vehicleCount = Array.isArray(state.garage) ? state.garage.length : 0
  const propertyCount = Array.isArray(state.investmentProperties) ? state.investmentProperties.length : 0
  const rewardTokens = Number(state.rewardTokens || 0)
  const garageIconStrip = vehicleCount > 0 ? `${'🚘'.repeat(Math.min(vehicleCount, 3))}${vehicleCount > 3 ? '+' : ''}` : 'No vehicles'

  const tabs = [
    { id: 'academy', label: '🏛️ Academy' },
    { id: 'ai-coach', label: '🧠 AI Coach' },
    ...(state.isAdmin ? [{ id: 'admin', label: '🛡️ Admin' }] : []),
    { id: 'bank', label: '🏦 Bank' },
    { id: 'careers', label: '💼 Careers' },
    { id: 'ledger', label: '📓 Ledger' },
    { id: 'lifestyle', label: '💎 Lifestyle' },
    { id: 'loans', label: '💳 Loans' },
    { id: 'math-lab', label: '🧮 Math Lab' },
    { id: 'real-estate', label: `🏘️ Real Estate (${propertyCount})` },
    { id: 'relocate', label: '✈️ Relocate' },
    { id: 'resume', label: '📄 Resume' },
    { id: 'rewards', label: '🎁 Rewards' },
    { id: 'stocks', label: '📈 Stocks' },
    { id: 'transit', label: `🚗 Transit (${vehicleCount})` }
  ]
  return (
    <nav className="md:col-span-2">
      <div className="md:space-y-2.5 md:sticky md:top-6">
        <div className="glass px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 bg-white/80 mb-2 md:mb-0">
          <p className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Garage</p>
          <p className="text-sm font-bold text-slate-700">{garageIconStrip}</p>
        </div>
        <div className="mobile-tabs-rail flex md:block gap-2 md:gap-2.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {tabs.map(t => {
            const isRewards = t.id === 'rewards'
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`snap-start shrink-0 md:w-full text-left px-3 sm:px-4 md:px-5 py-2.5 md:py-3.5 glass ${tab === t.id ? 'tab-active' : 'text-slate-500'} flex items-center justify-between text-sm md:text-base font-semibold gap-2`}>
                <span className="leading-tight min-w-0 flex-1 whitespace-nowrap md:whitespace-normal xl:whitespace-nowrap break-words">{t.label}</span>
                {isRewards && rewardTokens > 0 ? (
                  <span className="ml-2 min-w-6 h-6 md:min-w-7 md:h-7 px-2 rounded-full bg-violet-600 text-white text-xs md:text-sm font-bold inline-flex items-center justify-center">
                    {rewardTokens}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
