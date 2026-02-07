import { useGame } from '../context/GameContext'
import lifestyleExpenses from '../constants/lifestyleExpenses.constants'

export default function Lifestyle() {
  const { state, dispatch } = useGame()

  const handleToggleService = (serviceId: string) => {
    const updated = { ...state.luxuryServices, [serviceId]: !state.luxuryServices[serviceId] }
    dispatch({ type: 'SET_STATE', payload: { luxuryServices: updated } })
  }

  const handleEntertainmentChange = (newAmount: number) => {
    dispatch({ type: 'SET_STATE', payload: { entertainmentSpending: newAmount } })
  }

  const getNetSalary = () => {
    const job = state.job
    const grossSalary = job.base * state.city.p
    return Math.round(grossSalary * 0.8) // After 20% taxes
  }

  const netSalary = getNetSalary()
  const currentMonthlyExpenses = state.entertainmentSpending + (
    (state.luxuryServices.chef ? 5250 : 0) +
    (state.luxuryServices.housekeeper ? 2000 : 0) +
    (state.luxuryServices.chauffer ? 3500 : 0) +
    (state.luxuryServices.therapist ? 2500 : 0) +
    (state.luxuryServices.trainer ? 1500 : 0) +
    (state.luxuryServices.concierge ? 3000 : 0)
  )

  return (
    <div className="space-y-8">
      {/* Current Lifestyle Info */}
      <div className="glass p-6 mb-6">
        <h3 className="font-bold text-lg mb-4">📊 Current Lifestyle</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Monthly Income</p>
            <p className="text-xl font-bold text-emerald-600">${netSalary.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Luxury Services</p>
            <p className="text-xl font-bold text-blue-600">${currentMonthlyExpenses.toLocaleString()}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Current Job</p>
            <p className="text-lg font-bold text-slate-800">{state.job.title}</p>
          </div>
        </div>
      </div>

      {/* Luxury Services Section */}
      <div>
        <h3 className="font-bold text-lg mb-4">✨ Luxury Services</h3>
        <div className="grid grid-cols-2 gap-4">
          {lifestyleExpenses.luxuryServices.map(service => {
            const isActive = (state.luxuryServices as any)[service.id]
            const canAfford = netSalary >= service.minSalary
            const affordabilityPercent = Math.round((service.monthlyBase / netSalary) * 100)

            return (
              <div
                key={service.id}
                className={`glass p-4 transition-all ${isActive ? 'ring-2 ring-emerald-500' : ''} ${!canAfford ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-2xl mb-1">{service.icon}</p>
                    <h4 className="font-bold text-sm">{service.name}</h4>
                    <p className="text-[10px] text-slate-600 mt-1">{service.description}</p>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-2 mt-3">
                  <p className="text-xs font-bold text-slate-700">
                    ${service.monthlyBase.toLocaleString()}/mo ({affordabilityPercent}% of income)
                  </p>
                  <p className="text-[10px] text-slate-500 mb-2">
                    Requires: ${service.minSalary.toLocaleString()}/mo
                  </p>
                  <button
                    onClick={() => handleToggleService(service.id)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : canAfford
                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isActive ? '✓ Hired' : canAfford ? 'Hire' : 'Unaffordable'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Entertainment & Subscriptions */}
      <div>
        <h3 className="font-bold text-lg mb-4">🎬 Entertainment & Subscriptions</h3>
        <div className="glass p-6">
          <p className="text-sm text-slate-600 mb-4">Mix and match entertainment options. Select total monthly spending:</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {lifestyleExpenses.entertainmentOptions.map(option => (
              <div key={option.name} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                <div>
                  <p className="text-lg">{option.icon}</p>
                  <p className="text-xs font-bold text-slate-700">{option.name}</p>
                </div>
                <p className="font-bold text-emerald-600">${option.monthlyCost}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 block">
              Monthly Entertainment Spending: ${state.entertainmentSpending}
            </label>
            <input
              type="range"
              min="0"
              max={Math.min(netSalary * 0.2, 500)} // Max 20% of income or $500
              step="5"
              value={state.entertainmentSpending}
              onChange={e => handleEntertainmentChange(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>$0</span>
              <span>${Math.min(netSalary * 0.2, 500)}</span>
            </div>
            <p className="text-[10px] text-slate-600 mt-2">
              {state.entertainmentSpending > 0
                ? `${state.entertainmentSpending}% of your ${state.entertainmentSpending <= 50 ? 'modest' : state.entertainmentSpending <= 100 ? 'comfortable' : 'luxurious'} entertainment budget`
                : 'No entertainment spending (budget lifestyle)'}
            </p>
          </div>
        </div>
      </div>

      {/* Lifestyle Guide */}
      <div className="glass p-6 bg-blue-50 border border-blue-200">
        <h4 className="font-bold text-sm mb-2">💡 Lifestyle Tips</h4>
        <ul className="text-xs text-slate-700 space-y-1">
          <li>• Rent costs 30% of your net salary - higher paying jobs = more luxurious neighborhoods</li>
          <li>• Food costs scale with location and salary level</li>
          <li>• Personal Chef eliminates food costs entirely</li>
          <li>• Personal Chauffeur eliminates gas and transit costs</li>
          <li>• Entertainment spending is discretionary - spend what you can afford</li>
          <li>• Luxury services require minimum salary thresholds to afford</li>
        </ul>
      </div>
    </div>
  )
}
