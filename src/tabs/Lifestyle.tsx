import { useGame } from '../context/GameContext'
import lifestyleExpenses from '../constants/lifestyleExpenses.constants'
import housingModels from '../constants/housing.constants'
import storeItems from '../constants/store.constants'
import { useState } from 'react'

export default function Lifestyle() {
  const { state, dispatch } = useGame()
  const [tab, setTab] = useState<'Overview' | 'House' | 'Store'>('Overview')

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

  // House purchase handler - pull from savings first, then checking
  const buyHouse = (model: any) => {
    let totalNeeded = model.price
    let newSave = state.save
    let newCheck = state.check
    
    if (newSave >= totalNeeded) {
      // Pull entirely from savings
      newSave = Math.round((newSave - totalNeeded) * 100) / 100
    } else {
      // Use all savings, pull remainder from checking
      const fromSavings = newSave
      const fromChecking = totalNeeded - fromSavings
      if (newCheck < fromChecking) return // Can't afford
      newSave = 0
      newCheck = Math.round((newCheck - fromChecking) * 100) / 100
    }
    
    dispatch({ type: 'SET_STATE', payload: { check: newCheck, save: newSave, house: { model: model.id, level: 1, value: model.price } } })
  }

  // Upgrade house - pull from savings first, then checking
  const upgradeHouse = () => {
    if (!state.house?.model) return
    const model = housingModels.find((m: any) => m.id === state.house.model)
    if (!model) return
    const upgradeCost = model.baseUpgrade * (state.house.level || 1)
    
    let newSave = state.save
    let newCheck = state.check
    
    if (newSave >= upgradeCost) {
      newSave = Math.round((newSave - upgradeCost) * 100) / 100
    } else {
      const fromSavings = newSave
      const fromChecking = upgradeCost - fromSavings
      if (newCheck < fromChecking) return
      newSave = 0
      newCheck = Math.round((newCheck - fromChecking) * 100) / 100
    }
    
    dispatch({ type: 'SET_STATE', payload: { check: newCheck, save: newSave, house: { ...state.house, level: (state.house.level || 0) + 1, value: state.house.value + upgradeCost } } })
  }

  // Store purchase - pull from savings first, then checking
  const buyItem = (item: any) => {
    let newSave = state.save
    let newCheck = state.check
    
    if (newSave >= item.price) {
      newSave = Math.round((newSave - item.price) * 100) / 100
    } else {
      const fromSavings = newSave
      const fromChecking = item.price - fromSavings
      if (newCheck < fromChecking) return
      newSave = 0
      newCheck = Math.round((newCheck - fromChecking) * 100) / 100
    }
    
    const newInv = [...(state.inventory || []), item]
    dispatch({ type: 'SET_STATE', payload: { check: newCheck, save: newSave, inventory: newInv } })
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button className={`px-3 py-2 rounded ${tab === 'Overview' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setTab('Overview')}>Overview</button>
        <button className={`px-3 py-2 rounded ${tab === 'House' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setTab('House')}>House</button>
        <button className={`px-3 py-2 rounded ${tab === 'Store' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setTab('Store')}>Store</button>
      </div>

      {tab === 'Overview' && (
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
                  max={Math.min(netSalary * 0.2, 20000)} // Max 20% of income or $20000
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
      )}

      {tab === 'House' && (
        <div className="space-y-6">
          <h3 className="font-bold text-lg">🏡 Houses</h3>
          <div className="grid grid-cols-3 gap-4">
            {housingModels.map((m: any) => {
              const canAfford = state.save + state.check >= m.price
              return (
                <div key={m.id} className={`glass p-4 ${!canAfford ? 'opacity-60' : ''}`}>
                  <h4 className="font-bold">{m.name}</h4>
                  <p className="text-xs text-slate-600 mb-2">Rooms: {m.rooms} • Size: {m.size}</p>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-emerald-600 mb-2">{m.visual}</pre>
                  <p className="mt-2 font-bold text-emerald-600">${m.price.toLocaleString()}</p>
                  <button onClick={() => buyHouse(m)} disabled={!canAfford} className={`mt-3 w-full py-2 rounded text-white ${canAfford ? 'bg-emerald-600' : 'bg-slate-400 cursor-not-allowed'}`}>Buy</button>
                </div>
              )
            })}
          </div>
          <div className="glass p-6">
            <h4 className="font-bold text-lg mb-4">🏠 Your Property</h4>
            {state.house?.model ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-bold mb-2">Current Property</p>
                  <pre className="text-sm font-mono whitespace-pre-wrap text-emerald-600 mb-4">
                    {housingModels.find(m => m.id === state.house.model)?.visual}
                  </pre>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold">Model</p>
                    <p className="text-sm font-bold">{state.house.model}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold">Upgrade Level</p>
                    <p className="text-sm font-bold">{state.house.level}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold">Total Value</p>
                    <p className="text-sm font-bold text-emerald-600">${state.house.value?.toLocaleString()}</p>
                  </div>
                  <button onClick={upgradeHouse} className="w-full py-2 rounded bg-sky-600 text-white text-sm font-bold">Upgrade Property</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">You do not own a house yet. Select a property above to get started!</p>
            )}
          </div>
        </div>
      )}

      {tab === 'Store' && (
        <div className="space-y-6">
          <h3 className="font-bold text-lg">🛒 Store - Furnishings & Decor</h3>
          <div className="grid grid-cols-2 gap-4">
            {storeItems.map(item => {
              const canAfford = state.save + state.check >= item.price
              return (
                <div key={item.id} className={`glass p-4 ${!canAfford ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-3xl mb-1">{item.icon}</p>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-slate-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <p className="font-bold text-emerald-600 mb-2">${item.price.toLocaleString()}</p>
                    <button 
                      disabled={!canAfford}
                      onClick={() => buyItem(item)} 
                      className={`w-full py-2 rounded text-white text-sm font-bold ${canAfford ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-400 cursor-not-allowed'}`}
                    >
                      {canAfford ? 'Add to Home' : 'Unaffordable'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="glass p-6">
            <h4 className="font-bold text-lg mb-4">📦 Home Inventory</h4>
            {state.inventory && state.inventory.length > 0 ? (
              <div className="space-y-2">
                {state.inventory.map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{it.icon}</span>
                      <div>
                        <p className="font-bold">{it.name}</p>
                        <p className="text-xs text-slate-600">{it.description}</p>
                      </div>
                    </div>
                    <p className="font-bold text-slate-700">${it.price}</p>
                  </div>
                ))}
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 mt-4">
                  <p className="text-xs text-slate-600">Total Items Invested:</p>
                  <p className="font-bold text-emerald-600">
                    ${state.inventory.reduce((sum: number, item: any) => sum + item.price, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No items yet. Browse the store to decorate your home!</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
