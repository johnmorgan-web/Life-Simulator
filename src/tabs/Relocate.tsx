import { useGame } from '../context/GameContext'
import type { City } from '../types/models.types'
import { useEffect, useRef, useState } from 'react'
import countries from '../constants/countries.constants'
import countryBoundaries from '../constants/countryBoundaries.constants'

export default function Relocate() {
  const { state, dispatch, cityData, calculateRelocationCost } = useGame()
  const [selected, setSelected] = useState<any | null>(null)
  const [rotation, setRotation] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragging = useRef(false)
  const lastX = useRef(0)

  const cities = (cityData as City[])

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
        ctx.lineWidth = 1.5
        ctx.strokeStyle = 'rgba(255, 255, 255, 0)'
        ctx.fillStyle = 'rgba(6, 181, 212, 0.09)'
        countryBoundaries.forEach(cb => {
          ctx.beginPath()
          let firstPoint = true
          for (let i = 0; i < cb.boundaries.length; i++) {
            const [lat, lon] = cb.boundaries[i]
            const phi = lat * Math.PI/180
            const lambda = (lon * Math.PI/180) + rotation
            const x3 = Math.cos(phi) * Math.sin(lambda)
            const y3 = Math.sin(phi)
            const z3 = Math.cos(phi) * Math.cos(lambda)
            if (z3 > 0.05) { // only visible points
              const x = size/2 + x3 * radius
              const y = size/2 - y3 * radius
              if (firstPoint) {
                ctx.moveTo(x, y)
                firstPoint = false
              } else {
                ctx.lineTo(x, y)
              }
            }
          }
          ctx.stroke()
          ctx.fill()
        })

        // draw latitude and longitude grid (graticule) with enhanced visibility
        ctx.strokeStyle = 'rgba(2, 2, 2, 0)'
        ctx.lineWidth = 2.0
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
          ctx.fillStyle = 'rgba(255,255,255,0.08)'
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
          ctx.arc(x, y, 6, 0, Math.PI*2)
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
    const monthsAhead = 12
    let schedMonth = state.month + monthsAhead
    let schedYear = state.year
    while (schedMonth > 12) { schedMonth -= 12; schedYear += 1 }
    const costInfo = calculateRelocationCost(state.city, selected, state.hasVehicle, state.vehicleValue)
    // set pendingCity with scheduling and costs
    dispatch({ type: 'SET_STATE', payload: { pendingCity: { ...selected, scheduledMonth: schedMonth, scheduledYear: schedYear, relocationCost: costInfo.relocationCost, transportCost: costInfo.transportCost, distanceKm: costInfo.distance }, pendingJob: { title: 'Odd Jobs', base: 600, tReq: 1, odds: 1 } } })
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
              <div>Distance: <strong>{calculateRelocationCost(state.city, selected, state.hasVehicle, state.vehicleValue).distance.toFixed(1)} km</strong></div>
              <div>Estimated move cost: <strong>${calculateRelocationCost(state.city, selected, state.hasVehicle, state.vehicleValue).relocationCost.toFixed(2)}</strong></div>
              <div>Vehicle transport: <strong>${calculateRelocationCost(state.city, selected, state.hasVehicle, state.vehicleValue).transportCost.toFixed(2)}</strong></div>
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
