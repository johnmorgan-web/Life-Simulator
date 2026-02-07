import { useGame } from '../context/GameContext'
import type { TransitOption } from '../types/models.types'
import { useState } from 'react'

export default function Transit() {
  const { state, dispatch, transitOptions, vehicleDatabase, calculateVehicleValue, calculateMonthlyPayment, calculateMonthlyGasCost, calculateMonthlyMaintenanceCost } = useGame()
  const garage = state.garage || []
  const [tab, setTab] = useState<'transit' | 'vehicles' | 'owned'>('transit')
  const [selectedCondition, setSelectedCondition] = useState<'new' | 'used' | 'lease'>('new')
  const [financingModal, setFinancingModal] = useState<any>(null)
  const [transitConfirm, setTransitConfirm] = useState<any>(null)

  // Get APR based on credit score
  const getAPR = () => {
    if (state.credit >= 750) return 0.045
    if (state.credit >= 700) return 0.055
    if (state.credit >= 650) return 0.065
    return 0.085
  }

  // Purchase vehicle handler - show financing choice
  const showFinancingModal = (vehicle: any, condition: 'new' | 'used' | 'lease') => {
    if (condition === 'lease') {
      // Lease doesn't need financing choice
      purchaseVehicle(vehicle, condition, false)
      return
    }
    
    const price = condition === 'new' ? vehicle.newPrice : vehicle.usedPrice
    const monthlyPayment = calculateMonthlyPayment(price, getAPR(), 60)
    const canPayCash = state.save >= price || state.check >= price
    
    setFinancingModal({ vehicle, condition, price, monthlyPayment, canPayCash })
  }

  // Purchase vehicle handler - with financing choice
  const purchaseVehicle = (vehicle: any, condition: 'new' | 'used' | 'lease', finance: boolean = true) => {
    let price = 0
    let monthlyPayment = 0
    let monthsRemaining = 0

    if (condition === 'lease') {
      monthlyPayment = vehicle.leasePrice
      monthsRemaining = 36
      price = 0
    } else if (condition === 'new') {
      price = vehicle.newPrice
    } else {
      price = vehicle.usedPrice
    }

    // For purchase (not lease)
    if (condition !== 'lease') {
      if (finance) {
        // Financing option
        const apr = getAPR()
        const term = vehicleDatabase.financingTerms.monthlyPaymentMonths
        monthlyPayment = calculateMonthlyPayment(price, apr, term)
        monthsRemaining = term
      } else {
        // Cash payment - no financing
        monthlyPayment = 0
        monthsRemaining = 0
      }

      // Check if user can afford it
      if (state.save >= price) {
        // Use savings
        const newSave = Math.round((state.save - price) * 100) / 100
        const newVehicle = {
          id: `${vehicle.id}-${state.month}-${state.year}`,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          condition,
          purchasePrice: price,
          purchaseMonth: state.month,
          purchaseYear: state.year,
          monthlyPayment,
          monthsRemaining,
          purchasedNew: condition === 'new',
          for_sale: false,
          currentValue: price
        }
        dispatch({
          type: 'SET_STATE',
          payload: {
            save: newSave,
            garage: [...garage, newVehicle],
            ownsVehicle: state.ownsVehicle || newVehicle
          }
        })
        setFinancingModal(null)
      } else if (state.check >= price) {
        // Use checking
        const newCheck = Math.round((state.check - price) * 100) / 100
        const newVehicle = {
          id: `${vehicle.id}-${state.month}-${state.year}`,
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          condition,
          purchasePrice: price,
          purchaseMonth: state.month,
          purchaseYear: state.year,
          monthlyPayment,
          monthsRemaining,
          purchasedNew: condition === 'new',
          for_sale: false,
          currentValue: price
        }
        dispatch({
          type: 'SET_STATE',
          payload: {
            check: newCheck,
            garage: [...garage, newVehicle],
            ownsVehicle: state.ownsVehicle || newVehicle
          }
        })
        setFinancingModal(null)
      } else {
        alert('Insufficient funds in savings or checking account')
      }
    } else {
      // Lease
      const newVehicle = {
        id: `${vehicle.id}-lease-${state.month}-${state.year}`,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        condition: 'lease',
        purchasePrice: 0,
        purchaseMonth: state.month,
        purchaseYear: state.year,
        monthlyPayment,
        monthsRemaining,
        purchasedNew: false,
        for_sale: false,
        currentValue: 0
      }
      dispatch({ type: 'SET_STATE', payload: { garage: [...garage, newVehicle], ownsVehicle: state.ownsVehicle || newVehicle } })
    }
  }

  // Sell vehicle handler
  const sellVehicle = () => {
    // Mark primary vehicle for sale
    if (!state.ownsVehicle) return
    const currentValue = calculateVehicleValue(state.ownsVehicle, state.month, state.year)
    // update in garage as well
    const updatedGarage = (garage || []).map((g: any) => g.id === state.ownsVehicle.id ? { ...g, for_sale: true, listPrice: currentValue, monthsOnMarket: 0 } : g)
    dispatch({ type: 'SET_STATE', payload: { garage: updatedGarage, ownsVehicle: { ...state.ownsVehicle, for_sale: true, listPrice: currentValue, monthsOnMarket: 0 } } })
  }

  // Complete sale handler
  const completeSale = () => {
    if (!state.ownsVehicle || !state.ownsVehicle.for_sale) return
    const proceeds = state.ownsVehicle.listPrice || 0
    const newSave = Math.round((state.save + proceeds) * 100) / 100
    // remove from garage
    const updatedGarage = (garage || []).filter((g: any) => g.id !== state.ownsVehicle.id)
    // update ownsVehicle to next available or null
    const newPrimary = updatedGarage.length > 0 ? updatedGarage[0] : null
    dispatch({ type: 'SET_STATE', payload: { save: newSave, ownsVehicle: newPrimary, garage: updatedGarage, vehicleHistory: [...(state.vehicleHistory || []), state.ownsVehicle] } })
  }

  // Sell a specific vehicle in garage (non-primary)
  const sellGarageVehicle = (id: string) => {
    const v = garage.find((g: any) => g.id === id)
    if (!v) return
    const currentValue = calculateVehicleValue(v, state.month, state.year)
    const updatedGarage = (garage || []).map((g: any) => g.id === id ? { ...g, for_sale: true, listPrice: currentValue, monthsOnMarket: 0 } : g)
    dispatch({ type: 'SET_STATE', payload: { garage: updatedGarage } })
  }

  const completeGarageSale = (id: string) => {
    const v = garage.find((g: any) => g.id === id)
    if (!v || !v.for_sale) return
    const proceeds = v.listPrice || 0
    const newSave = Math.round((state.save + proceeds) * 100) / 100
    const updatedGarage = (garage || []).filter((g: any) => g.id !== id)
    // if sold was primary, update ownsVehicle
    let newPrimary = state.ownsVehicle
    if (state.ownsVehicle?.id === id) {
      newPrimary = updatedGarage.length > 0 ? updatedGarage[0] : null
    }
    dispatch({ type: 'SET_STATE', payload: { save: newSave, garage: updatedGarage, ownsVehicle: newPrimary, vehicleHistory: [...(state.vehicleHistory || []), v] } })
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button className={`px-3 py-2 rounded ${tab === 'transit' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setTab('transit')}>Transit Options</button>
        <button className={`px-3 py-2 rounded ${tab === 'vehicles' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setTab('vehicles')}>Buy/Lease Vehicle</button>
        <button className={`px-3 py-2 rounded ${tab === 'owned' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setTab('owned')}>My Vehicle</button>
      </div>

      {tab === 'transit' && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">🚌 Public Transit Options</h3>
          <div className="grid grid-cols-3 gap-4">
            {transitOptions.map((o: TransitOption) => {
              const requiresVehicle = o.l === 3 && (o.n.includes('Car') || o.n.includes('Chauffer') || o.n.includes('Helicopter'))
              const canSelect = !requiresVehicle || (state.garage && state.garage.length > 0)
              const disabled = !canSelect
              
              return (
                <div key={o.n} className={`glass p-6 ${state.transit.name === o.n ? 'card-active' : ''} ${state.pendingTransit?.n === o.n ? 'card-pending' : ''} ${disabled ? 'opacity-50' : ''}`}>
                  <h4 className="font-bold">{o.n}</h4>
                  <p className="text-sm">${o.c}/mo</p>
                  {o.subText && <p className="text-xs text-slate-400">{o.subText}</p>}
                  {disabled && <p className="text-xs text-red-600 font-bold mt-2">Requires vehicle ownership</p>}
                  {state.transit.name === o.n ? (
                    <button disabled className="mt-4 w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">CURRENT</button>
                  ) : state.pendingTransit?.n === o.n ? (
                    <button className="mt-4 w-full py-2 bg-amber-500 text-white rounded-lg text-xs font-bold">PENDING</button>
                  ) : (
                    <button disabled={disabled} onClick={() => !disabled && setTransitConfirm(o)} className={`mt-4 w-full py-2 rounded-lg text-xs font-bold ${disabled ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-slate-900 text-white'}`}>SELECT</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'vehicles' && (
        <div className="space-y-6">
          <h3 className="font-bold text-lg">🚗 Vehicle Market</h3>
          
          <div className="flex gap-2 mb-4">
            <button className={`px-3 py-2 rounded ${selectedCondition === 'new' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setSelectedCondition('new')}>New</button>
            <button className={`px-3 py-2 rounded ${selectedCondition === 'used' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setSelectedCondition('used')}>Used</button>
            <button className={`px-3 py-2 rounded ${selectedCondition === 'lease' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`} onClick={() => setSelectedCondition('lease')}>Lease</button>
          </div>

          <div className="space-y-6">
            {Object.entries(vehicleDatabase.classes).map(([classKey, classData]: any) => (
              <div key={classKey}>
                <h4 className="font-bold text-sm mb-3">{classData.name} Class • {classData.gasMileage} MPG • {(classData.maintenanceFactor * 100).toFixed(0)}% maintenance</h4>
                <div className="grid grid-cols-2 gap-3">
                  {vehicleDatabase.vehicles
                    .filter((v: any) => v.class === classKey)
                    .map((vehicle: any) => {
                      const price = selectedCondition === 'new' ? vehicle.newPrice : selectedCondition === 'used' ? vehicle.usedPrice : 0
                      const monthlyPayment = selectedCondition === 'lease' ? vehicle.leasePrice : calculateMonthlyPayment(price, getAPR(), 60)
                      
                      return (
                        <div key={vehicle.id} className="glass p-3">
                          <p className="text-2xl mb-1">{vehicle.icon}</p>
                          <p className="font-bold text-sm">{vehicle.name}</p>
                          <p className="text-xs text-slate-600">{vehicle.body}</p>
                              <div className="border-t border-slate-200 pt-2 mt-2">
                                {selectedCondition === 'lease' ? (
                                  <p className="text-sm font-bold text-emerald-600">${monthlyPayment}/mo (36 mo)</p>
                                ) : (
                                  <>
                                    <p className="text-sm font-bold text-emerald-600">${price.toLocaleString()}</p>
                                    <p className="text-xs text-slate-600">${monthlyPayment}/mo × 60</p>
                                  </>
                                )}
                                {(() => {
                                  const ownedEntry = garage.find((g: any) => g.vehicleId === vehicle.id && !g.for_sale)
                                  const financingEntry = garage.find((g: any) => g.vehicleId === vehicle.id && g.monthsRemaining > 0)
                                  if (financingEntry) {
                                    return <button disabled className="w-full mt-2 py-1 rounded bg-amber-500 text-white text-xs font-bold">Financing (In Garage)</button>
                                  }
                                  if (ownedEntry) {
                                    return <button disabled className="w-full mt-2 py-1 rounded bg-slate-400 text-white text-xs font-bold">Owned (In Garage)</button>
                                  }
                                  return <button onClick={() => showFinancingModal(vehicle, selectedCondition)} className="w-full mt-2 py-1 rounded bg-emerald-600 text-white text-xs font-bold">Buy Now</button>
                                })()}
                              </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'owned' && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">🏎️ My Vehicle</h3>
          {garage && garage.length > 0 ? (
            <div className="space-y-4">
              <div className="glass p-6 space-y-4">
                <h4 className="font-bold">Primary Vehicle</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold">Vehicle</p>
                    <p className="font-bold">{state.ownsVehicle?.vehicleName}</p>
                    <p className="text-xs text-slate-600">{state.ownsVehicle?.condition}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 font-bold">Purchase Price</p>
                    <p className="font-bold">${state.ownsVehicle?.purchasePrice?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-slate-600">{state.ownsVehicle?.purchaseMonth}/{state.ownsVehicle?.purchaseYear}</p>
                  </div>
                </div>

                {state.ownsVehicle?.condition !== 'lease' && state.ownsVehicle && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 font-bold">Current Value</p>
                        <p className="font-bold text-emerald-600">${calculateVehicleValue(state.ownsVehicle, state.month, state.year).toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <p className="text-xs text-slate-500 font-bold">Loan Status</p>
                        <p className="font-bold">{state.ownsVehicle.monthsRemaining} months remaining</p>
                        <p className="text-xs text-slate-600">${state.ownsVehicle.monthlyPayment}/month</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <p className="text-xs text-slate-500 font-bold">Monthly Gas</p>
                        <p className="font-bold text-blue-600">${calculateMonthlyGasCost(state.ownsVehicle).toLocaleString()}</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <p className="text-xs text-slate-500 font-bold">Monthly Maintenance</p>
                        <p className="font-bold text-orange-600">${calculateMonthlyMaintenanceCost(state.ownsVehicle, state.month, state.year).toLocaleString()}</p>
                      </div>
                    </div>
                  </>
                )}

                {!state.ownsVehicle?.for_sale ? (
                  <button onClick={sellVehicle} className="w-full py-2 rounded bg-red-600 text-white font-bold">Sell Vehicle</button>
                ) : (
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 space-y-2">
                    <p className="text-xs font-bold text-yellow-800">For Sale - Listed at ${state.ownsVehicle.listPrice?.toLocaleString()}</p>
                    <p className="text-xs text-slate-600">Months on market: {state.ownsVehicle.monthsOnMarket || 0}</p>
                    <button onClick={completeSale} className="w-full py-2 rounded bg-emerald-600 text-white text-sm font-bold">Complete Sale</button>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold mb-2">Garage</h4>
                <div className="grid grid-cols-1 gap-3">
                  {garage.map((g: any) => (
                    <div key={g.id} className="glass p-3 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{g.vehicleName} <span className="text-xs text-slate-500">({g.condition})</span></p>
                        <p className="text-xs text-slate-400">Purchased: {g.purchaseMonth}/{g.purchaseYear} • ${g.purchasePrice.toLocaleString()}</p>
                      </div>
                      <div className="space-x-2">
                        {state.ownsVehicle?.id !== g.id && <button onClick={() => dispatch({ type: 'SET_STATE', payload: { ownsVehicle: g } })} className="py-1 px-2 rounded bg-slate-700 text-white text-xs">Set Primary</button>}
                        {!g.for_sale ? <button onClick={() => sellGarageVehicle(g.id)} className="py-1 px-2 rounded bg-red-600 text-white text-xs">Sell</button> : <button onClick={() => completeGarageSale(g.id)} className="py-1 px-2 rounded bg-emerald-600 text-white text-xs">Complete Sale</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass p-6 text-center">
              <p className="text-slate-600 mb-4">You don't own a vehicle yet.</p>
              <p className="text-sm text-slate-500">Visit the "Buy/Lease Vehicle" tab to purchase or lease a vehicle.</p>
            </div>
          )}
        </div>
      )}

      {/* Financing Modal */}
      {financingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 space-y-4">
            <h3 className="font-bold text-lg">Choose Financing Option</h3>
            <p className="text-sm text-slate-600">{financingModal.vehicle.name} - {financingModal.condition}</p>
            
            <div className="bg-slate-50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-slate-600">Purchase Price:</p>
              <p className="font-bold text-lg">${financingModal.price.toLocaleString()}</p>
            </div>

            {financingModal.canPayCash && (
              <button
                onClick={() => purchaseVehicle(financingModal.vehicle, financingModal.condition, false)}
                className="w-full py-3 rounded bg-blue-600 text-white font-bold"
              >
                💰 Pay Cash ({financingModal.condition === 'new' ? 'No Monthly Payments' : 'Full Payment'})
              </button>
            )}

            {(financingModal.condition !== 'lease' || true) && (
              <button
                onClick={() => purchaseVehicle(financingModal.vehicle, financingModal.condition, true)}
                className="w-full py-3 rounded bg-emerald-600 text-white font-bold"
              >
                📊 Finance 60 Months @ ${financingModal.monthlyPayment}/mo
              </button>
            )}

            <button
              onClick={() => setFinancingModal(null)}
              className="w-full py-2 rounded bg-slate-200 text-slate-800 font-bold"
            >
              Cancel
            </button>

            {financingModal.condition !== 'lease' && (
              <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded">
                <p className="font-bold mb-1">💡 Tips:</p>
                <p>• Cash payment = no monthly costs, but ties up savings</p>
                <p>• Financing = spread payments over 5 years</p>
                <p>• Your credit score: {state.credit} (APR: {(getAPR() * 100).toFixed(1)}%)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transit Confirmation Modal */}
      {transitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 space-y-4">
            <h3 className="font-bold text-lg">Confirm Transit Change</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500 font-bold">Current</p>
                <p className="font-bold">{state.transit.name}</p>
                <p className="text-sm text-slate-600">${state.transit.cost}/mo</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-slate-500 font-bold">New</p>
                <p className="font-bold">{transitConfirm.n}</p>
                <p className="text-sm text-slate-600">${transitConfirm.c}/mo</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500 font-bold mb-1">Monthly Cost Change</p>
              <p className="text-lg font-bold">
                {transitConfirm.c > state.transit.cost ? '+' : ''} ${transitConfirm.c - state.transit.cost}/mo
              </p>
            </div>

            {state.job.tReq > transitConfirm.l && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-300 space-y-1">
                <p className="text-xs font-bold text-red-700">⚠️ Job Requirement Warning</p>
                <p className="text-xs text-red-600">Your job requires transit level {state.job.tReq} but {transitConfirm.n} is level {transitConfirm.l}. You may lose your job!</p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => {
                  dispatch({ type: 'SET_STATE', payload: { pendingTransit: transitConfirm } })
                  setTransitConfirm(null)
                }}
                className="w-full py-3 rounded bg-emerald-600 text-white font-bold"
              >
                Confirm Change
              </button>
              <button
                onClick={() => setTransitConfirm(null)}
                className="w-full py-2 rounded bg-slate-200 text-slate-800 font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
