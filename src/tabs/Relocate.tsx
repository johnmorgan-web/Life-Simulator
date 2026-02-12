import { useGame } from '../context/GameContext'
import type { City } from '../types/models.types'
import { useEffect, useRef, useState } from 'react'
import countries from '../constants/countries.constants'
//import countryBoundaries from '../constants/countryBoundaries.constants'

export default function Relocate() {
  const { state, dispatch, cityData, calculateRelocationCost } = useGame()
  const [selected, setSelected] = useState<any | null>(null)
  const [rotation, setRotation] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragging = useRef(false)
  const lastX = useRef(0)

  const [selectedTransit, setSelectedTransit] = useState<'public' | 'personal' | 'luxury'>('public')

  const cities = (cityData as City[])
  
  const hasVehicle = state.garage && state.garage.length > 0
  const primaryVehicle = state.ownsVehicle || (hasVehicle ? state.garage[0] : null)
  // Define relocation transit options with costs
  const relocationTransitOptions = [
    { id: 'personal', label: 'Personal Vehicle', costPerKm: 0.35, requiresVehicle: true, note: 'Drive your own vehicle + moving truck' },
    { id: 'luxury', label: 'Limousine Service', costPerKm: 0.75, requiresVehicle: true, note: 'Full-service limousine relocation' }
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const size = Math.min(480, window.innerWidth - 120)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)
    const radius = size / 2 - 12

    function draw() {
        ctx.clearRect(0,0,size,size)
        // background circle with subtle gradient to look like a globe
        ctx.beginPath()
        ctx.arc(size/2, size/2, radius, 0, Math.PI*2)
        const grad = ctx.createRadialGradient(size/2 - radius*0.3, size/2 - radius*0.4, radius*0.1, size/2, size/2, radius)
        grad.addColorStop(0, 'rgba(255,255,255,0.06)')
        grad.addColorStop(0.6, 'rgba(6,182,212,0.06)')
        grad.addColorStop(1, 'rgba(3,7,18,0.12)')
        ctx.fillStyle = grad
        ctx.fill()

        // draw country boundaries (polygons) with enhanced visibility
        //ctx.lineWidth = 1.5
       // ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        //ctx.fillStyle = 'rgba(6,182,212,0.12)'
        //countryBoundaries.forEach(cb => {
         // ctx.beginPath()
         // let firstPoint = true
         // for (let i = 0; i < cb.boundaries.length; i++) {
         //   const [lat, lon] = cb.boundaries[i]
         //   const phi = lat * Math.PI/180
         //   const lambda = (lon * Math.PI/180) + rotation
         //   const x3 = Math.cos(phi) * Math.sin(lambda)
         //   const y3 = Math.sin(phi)
         //   const z3 = Math.cos(phi) * Math.cos(lambda)
        //    if (z3 > 0.05) { // only visible points
        //      const x = size/2 + x3 * radius
        //      const y = size/2 - y3 * radius
        //      if (firstPoint) {
        //        ctx.moveTo(x, y)
        //        firstPoint = false
        //      } else {
         //       ctx.lineTo(x, y)
         //     }
         //   }
        //  }
       //   ctx.stroke()
      //    ctx.fill()
      //  })

        // draw latitude and longitude grid (graticule) with enhanced visibility
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)'
        ctx.lineWidth = 1.0
        // longitude lines (more frequent)
        for (let lon = -180; lon < 180; lon += 10) {
          ctx.beginPath()
          for (let lat = -90; lat <= 90; lat += 1.5) {
            const phi = lat * Math.PI/180
            const lambda = (lon * Math.PI/180) + rotation
            const x3 = Math.cos(phi) * Math.sin(lambda)

            const y3 = Math.sin(phi)
            const z3 = Math.cos(phi) * Math.cos(lambda)
            if (z3 > 0) {
              const x = size/2 + x3 * radius
              const y = size/2 - y3 * radius
              if (lat === -90) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
          }
          ctx.stroke()
        }
        // latitude lines (more frequent)
        for (let lat = -60; lat <= 60; lat += 10) {
          ctx.beginPath()
          for (let lon = -180; lon <= 180; lon += 1.5) {
            const phi = lat * Math.PI/180
            const lambda = (lon * Math.PI/180) + rotation
            const x3 = Math.cos(phi) * Math.sin(lambda)
            const y3 = Math.sin(phi)
            const z3 = Math.cos(phi) * Math.cos(lambda)
            if (z3 > 0) {
              const x = size/2 + x3 * radius
              const y = size/2 - y3 * radius
              if (lon === -180) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
          }
          ctx.stroke()
        }

      // draw country markers (simple centers)
      countries.forEach(ct => {
        if (typeof ct.lat !== 'number' || typeof ct.lon !== 'number') return
        const phi = ct.lat * Math.PI/180
        const lambda = (ct.lon * Math.PI/180) + rotation
        const x3 = Math.cos(phi) * Math.sin(lambda)
        const y3 = Math.sin(phi)
        const z3 = Math.cos(phi) * Math.cos(lambda)
        if (z3 > 0) {
          const x = size/2 + x3 * radius
          const y = size/2 - y3 * radius
          ctx.beginPath()
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
          ctx.arc(x, y, 3, 0, Math.PI*2)
          ctx.fill()
          ctx.fillStyle = 'rgba(230,238,246,0.9)'
          ctx.font = '10px DM Sans'
          ctx.fillText(ct.code, x + 6, y + 4)
        }
      })

      // draw city markers
      cities.forEach(c => {
        if (typeof c.lat !== 'number' || typeof c.lon !== 'number') return
        const lat = c.lat
        const lon = c.lon
        const phi = lat * Math.PI/180
        const lambda = (lon * Math.PI/180) + rotation
        const x3 = Math.cos(phi) * Math.sin(lambda)
        const y3 = Math.sin(phi)
        const z3 = Math.cos(phi) * Math.cos(lambda)
        if (z3 > 0) {
          const x = size/2 + x3 * radius
          const y = size/2 - y3 * radius
          ctx.beginPath()
          ctx.fillStyle = selected?.name === c.name ? 'rgba(124,58,237,0.95)' : 'rgba(6,182,212,0.95)'
          ctx.arc(x, y, 3, 0, Math.PI*2)
          ctx.fill()
          ctx.fillStyle = 'rgba(230,238,246,0.95)'
          ctx.font = '10px DM Sans'
          ctx.fillText(c.icon, x+8, y+4)
        }
      })
    }
    draw()
  }, [cities, rotation, selected])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    function onDown(e: PointerEvent) {
      dragging.current = true
      lastX.current = e.clientX
      ;(e.target as Element).setPointerCapture(e.pointerId)
    }
    function onUp() {
      dragging.current = false
    }
    function onMove(e: PointerEvent) {
      if (!dragging.current) return
      const dx = e.clientX - lastX.current
      lastX.current = e.clientX
      setRotation(r => r + dx * 0.01)
    }
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left)
    const y = (e.clientY - rect.top)
    const size = rect.width
    const radius = size/2 - 12
    // find nearest visible city
    let picked = null
    let minDist = 20
    cities.forEach(c => {
      if (typeof c.lat !== 'number' || typeof c.lon !== 'number') return
      const lat = c.lat
      const lon = c.lon
      const phi = lat * Math.PI/180
      const lambda = (lon * Math.PI/180) + rotation
      const x3 = Math.cos(phi) * Math.sin(lambda)
      const y3 = Math.sin(phi)
      const z3 = Math.cos(phi) * Math.cos(lambda)
      if (z3 > 0) {
        const cx = size/2 + x3 * radius
        const cy = size/2 - y3 * radius
        const d = Math.hypot(cx - x, cy - y)
        if (d < minDist) {
          minDist = d
          picked = c
        }
      }
    })
    if (picked) setSelected(picked)
  }

  const planMove = () => {
    if (!selected) return
        // Check if selected transit requires vehicle and player doesn't own one
        const transitOption = relocationTransitOptions.find(t => t.id === selectedTransit)
        if (transitOption?.requiresVehicle && !hasVehicle) {
          alert(`You need a personal vehicle to use ${transitOption.label} for relocation!`)
          return
        }

    const monthsAhead = 12
    let schedMonth = state.month + monthsAhead
    let schedYear = state.year
    while (schedMonth > 12) { schedMonth -= 12; schedYear += 1 }
    const costInfo = calculateRelocationCost(state.city, selected, primaryVehicle)

    // Calculate total relocation cost based on transit method and distance
    const transitOption2 = relocationTransitOptions.find(t => t.id === selectedTransit)
    const transitBaseCost = 500 // base cost for relocation logistics
    const transitDistanceCost = Math.round((costInfo.distance * (transitOption2?.costPerKm || 0.15)) * 100) / 100
    const totalRelocationCost = Math.round((transitBaseCost + transitDistanceCost) * 100) / 100

    // set pendingCity with scheduling and costs
    dispatch({ type: 'SET_STATE', payload: { pendingCity: { ...selected, scheduledMonth: schedMonth, scheduledYear: schedYear, relocationCost: totalRelocationCost, transportCost: costInfo.transportCost, distanceKm: costInfo.distance }, pendingJob: { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 } } })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="glass p-6 md:col-span-2">
        <h3 className="font-bold mb-3">Interactive Globe</h3>
        <canvas ref={canvasRef} onClick={handleCanvasClick} className="w-full" />
        <div className="mt-3 text-sm text-slate-400">Drag to rotate. Click a marker to select a city.</div>
      </div>

      <div className="glass p-6">
        <h4 className="font-bold">Selected</h4>
        {selected ? (
          <>
            <div className="my-3">
              <div className="text-lg font-bold">{selected.icon} {selected.name}</div>
              <div className="text-sm text-slate-400">Rent: {selected.r}x • Pay: {selected.p}x</div>
            </div>
            <div className="mb-3 text-sm">
              <div>Plan relocation date: <strong>{state.month}/{state.year} → in 12 months</strong></div>
              <div>Distance: <strong>{calculateRelocationCost(state.city, selected, primaryVehicle).distance.toFixed(1)} km</strong></div>
              <div className="mt-3 font-semibold">Transit Method:</div>
              <div className="space-y-2 my-2">
                {relocationTransitOptions.map(option => {
                  const costInfo = calculateRelocationCost(state.city, selected, primaryVehicle)
                  const transitCost = Math.round((500 + costInfo.distance * option.costPerKm) * 100) / 100
                  const canSelect = !option.requiresVehicle || hasVehicle
                  return (
                    <label key={option.id} className={`block p-2 rounded cursor-pointer ${selectedTransit === option.id ? 'bg-white bg-opacity-30' : 'bg-white-800'} ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <input 
                        type="radio" 
                        name="transit" 
                        value={option.id} 
                        checked={selectedTransit === option.id}
                        onChange={(e) => setSelectedTransit(e.target.value as any)}
                        disabled={!canSelect}
                        className="mr-2"
                      />
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span className="ml-2 text-xs text-slate-400">+ ${transitCost}</span>
                      {!canSelect && <span className="ml-2 text-xs text-red-400">(Requires vehicle)</span>}
                      <div className="text-xs text-slate-400 mt-1">{option.note}</div>
                    </label>
                  )
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div>Estimated move cost: <strong>${(() => {
                  const costInfo = calculateRelocationCost(state.city, selected, primaryVehicle)
                  const transitOption = relocationTransitOptions.find(t => t.id === selectedTransit)
                  return Math.round((500 + costInfo.distance * (transitOption?.costPerKm || 0.15)) * 100) / 100
                })().toFixed(2)}</strong></div>
              </div>
              {hasVehicle && (
                <div>Vehicle transport: <strong>${calculateRelocationCost(state.city, selected, primaryVehicle).transportCost.toFixed(2)}</strong></div>
              )}
              {!hasVehicle && (
                <div className="text-xs text-slate-400 mt-1">No vehicle to transport</div>
              )}
            </div>
            <button onClick={planMove} className="w-full py-2 bg-slate-900 text-white rounded font-bold">Plan Move (12 months)</button>
          </>
        ) : (
          <div className="text-sm text-slate-400">No city selected. Click a marker on the globe to select.</div>
        )}
        {state.pendingCity && (
          <div className="mt-4 text-xs text-slate-400">
            Pending relocation: <strong>{state.pendingCity.name}</strong> scheduled for {state.pendingCity.scheduledMonth}/{state.pendingCity.scheduledYear} • Cost: ${state.pendingCity.relocationCost}
          </div>
        )}
      </div>
    </div>
  )
}
