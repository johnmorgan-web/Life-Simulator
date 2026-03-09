
import { useGame } from '../context/GameContext'

export default function Nav({ tab, setTab }: any) {
  const { state } = useGame()
  const vehicleCount = Array.isArray(state.garage) ? state.garage.length : 0
  const garageIconStrip = vehicleCount > 0 ? `${'🚘'.repeat(Math.min(vehicleCount, 3))}${vehicleCount > 3 ? '+' : ''}` : 'No vehicles'

  const tabs = [
    { id: 'ledger', label: '📓 Journal' },
    { id: 'careers', label: '💼 Careers' },
    { id: 'academy', label: '🏛️ Academy' },
    { id: 'transit', label: `🚗 Transit (${vehicleCount})` },
    { id: 'relocate', label: '✈️ Relocate' },
    { id: 'resume', label: '📄 Resume' },
    { id: 'lifestyle', label: '💎 Lifestyle' },
    { id: 'loans', label: '💳 Loans' },
    { id: 'bank', label: '🏦 Bank' },
    { id: 'stocks', label: '📈 Stocks' },
    { id: 'rewards', label: '🎁 Rewards' }
  ]
  return (
    <nav className="col-span-2">
      <div className="space-y-2 sticky top-6">
        <div className="glass px-3 py-2 border border-slate-200 bg-white/80">
          <p className="text-[10px] uppercase font-bold tracking-wide text-slate-500">Garage</p>
          <p className="text-xs font-bold text-slate-700">{garageIconStrip}</p>
        </div>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`w-full text-left px-4 py-3 glass ${tab === t.id ? 'tab-active' : 'text-slate-500'}`}>{t.label}</button>
        ))}
      </div>
    </nav>
  )
}
