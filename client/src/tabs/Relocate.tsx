import { useGame } from '../context/GameContext'
import type { City } from '@server/types/models.types'
import { useEffect, useMemo, useRef, useState } from 'react'
import countries from '../constants/countries.constants'
//import countryBoundaries from '../constants/countryBoundaries.constants'

function getSupplyPressure(usersInCity: number, city: any) {
  const demandBase = 1 + Math.min(0.45, (Math.max(1, usersInCity) - 1) * 0.07)
  const multiplier = Math.max(0.75, Math.min(1.9, demandBase * (0.9 + (Number(city?.p || 1) - 1) * 0.6)))
  let label = 'Loose'
  if (multiplier >= 1.35) label = 'Tight'
  else if (multiplier >= 1.1) label = 'Active'
  else if (multiplier >= 0.95) label = 'Balanced'
  return { multiplier, label }
}

export default function Relocate() {
  const { state, dispatch, cityData, calculateRelocationCost, cityUserCounts } = useGame()
  const [selected, setSelected] = useState<any | null>(null)
  const rotationRef = useRef(0)
  const tiltRef = useRef(0)
  const selectedRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)
  const pulseRef = useRef(0)
  const geoRingsRef = useRef<Array<Array<[number, number]>>>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragging = useRef(false)
  const lastX = useRef(0)
  const lastY = useRef(0)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedTransit, setSelectedTransit] = useState<'public' | 'personal' | 'luxury'>('public')

  const cities = (cityData as City[])
  const selectedCityInsights = useMemo(() => {
    if (!selected) return null
    const usersInCity = Math.max(0, Number(cityUserCounts[selected.name] || 0))
    const pressure = getSupplyPressure(usersInCity, selected)
    return { usersInCity, pressureLabel: pressure.label, pressureMultiplier: pressure.multiplier }
  }, [cityUserCounts, selected])
  
  const hasVehicle = state.garage && state.garage.length > 0
  const primaryVehicle = state.ownsVehicle || (hasVehicle ? state.garage[0] : null)
  // Define relocation transit options with costs
  const relocationTransitOptions = [
    { id: 'personal', label: 'Personal Vehicle', costPerKm: 0.35, requiresVehicle: true, note: 'Drive your own vehicle + moving truck' },
    { id: 'luxury', label: 'Limousine Service', costPerKm: 0.75, requiresVehicle: true, note: 'Full-service limousine relocation' }
  ]

  useEffect(() => {
    fetch('/ne_110m_countries.geojson')
      .then(r => r.json())
      .then((data: any) => {
        const rings: Array<Array<[number, number]>> = []
        for (const feature of data.features) {
          const geom = feature.geometry
          if (geom.type === 'Polygon') {
            for (const ring of geom.coordinates) rings.push(ring)
          } else if (geom.type === 'MultiPolygon') {
            for (const poly of geom.coordinates)
              for (const ring of poly) rings.push(ring)
          }
        }
        geoRingsRef.current = rings
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const size = Math.max(240, Math.min(760, window.innerWidth - 80, window.innerHeight - 220))
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)
    const radius = size / 2 - 12

    function draw() {
      // Auto-rotate when not dragging; ease tilt back to 0
      if (!dragging.current) {
        rotationRef.current += 0.002
        tiltRef.current *= 0.97
      }
      pulseRef.current += 0.04
      const rot = rotationRef.current
      const tilt = tiltRef.current

      ctx.clearRect(0, 0, size, size)

      // Atmosphere glow (outside globe circle)
      const atmGrad = ctx.createRadialGradient(size/2, size/2, radius * 0.85, size/2, size/2, radius + 22)
      atmGrad.addColorStop(0, 'rgba(6,182,212,0)')
      atmGrad.addColorStop(0.6, 'rgba(6,182,212,0.18)')
      atmGrad.addColorStop(1, 'rgba(6,182,212,0)')
      ctx.beginPath()
      ctx.arc(size/2, size/2, radius + 22, 0, Math.PI*2)
      ctx.fillStyle = atmGrad
      ctx.fill()

      // Stars scattered around the globe edge
      for (let i = 0; i < 60; i++) {
        const angle = (i * 137.508) * Math.PI / 180
        const dist = radius + 10 + (i % 18) * 1.8
        const sx = size/2 + Math.cos(angle) * dist
        const sy = size/2 + Math.sin(angle) * dist
        if (sx < 0 || sx > size || sy < 0 || sy > size) continue
        ctx.beginPath()
        ctx.fillStyle = `rgba(255,255,255,${0.25 + (i % 4) * 0.12})`
        ctx.arc(sx, sy, 0.4 + (i % 3) * 0.35, 0, Math.PI*2)
        ctx.fill()
      }

      // Clip all globe content to the sphere
      ctx.save()
      ctx.beginPath()
      ctx.arc(size/2, size/2, radius, 0, Math.PI*2)
      ctx.clip()

      // Ocean fill
      const oceanGrad = ctx.createRadialGradient(size/2 - radius*0.3, size/2 - radius*0.35, radius*0.05, size/2, size/2, radius)
      oceanGrad.addColorStop(0, '#1a4a8a')
      oceanGrad.addColorStop(0.55, '#174e9c')
      oceanGrad.addColorStop(1, '#23366b')
      ctx.beginPath()
      ctx.arc(size/2, size/2, radius, 0, Math.PI*2)
      ctx.fillStyle = oceanGrad
      ctx.fill()

      // Country polygons (Natural Earth 110m)
      if (geoRingsRef.current.length > 0) {
        ctx.fillStyle = 'rgba(74,120,64,0.55)'
        ctx.strokeStyle = 'rgba(160,210,140,0.5)'
        ctx.lineWidth = 0.6
        for (const ring of geoRingsRef.current) {
          ctx.beginPath()
          let penDown = false
          for (const [lon, lat] of ring) {
            const phi = lat * Math.PI / 180
            const lambda = (lon * Math.PI / 180) + rot
            const x3r = Math.cos(phi) * Math.sin(lambda)
            const y3r = Math.sin(phi)
            const z3r = Math.cos(phi) * Math.cos(lambda)
            const x3 = x3r
            const y3 = y3r * Math.cos(tilt) - z3r * Math.sin(tilt)
            const z3 = y3r * Math.sin(tilt) + z3r * Math.cos(tilt)
            if (z3 > 0) {
              const x = size / 2 + x3 * radius
              const y = size / 2 - y3 * radius
              if (!penDown) { ctx.moveTo(x, y); penDown = true }
              else ctx.lineTo(x, y)
            } else {
              penDown = false
            }
          }
          ctx.fill()
          ctx.stroke()
        }
      }

      // Graticule (latitude/longitude grid)
      ctx.lineWidth = 0.8
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      for (let lon = -180; lon < 180; lon += 10) {
        ctx.beginPath()
        for (let lat = -90; lat <= 90; lat += 1.5) {
          const phi = lat * Math.PI/180
          const lambda = (lon * Math.PI/180) + rot
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
      for (let lat = -60; lat <= 60; lat += 10) {
        ctx.beginPath()
        for (let lon = -180; lon <= 180; lon += 1.5) {
          const phi = lat * Math.PI/180
          const lambda = (lon * Math.PI/180) + rot
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

      // Country markers
      countries.forEach(ct => {
        if (typeof ct.lat !== 'number' || typeof ct.lon !== 'number') return
        const phi = ct.lat * Math.PI/180
        const lambda = (ct.lon * Math.PI/180) + rot
        const x3r = Math.cos(phi) * Math.sin(lambda)
        const y3r = Math.sin(phi)
        const z3r = Math.cos(phi) * Math.cos(lambda)
        const x3 = x3r
        const y3 = y3r * Math.cos(tilt) - z3r * Math.sin(tilt)
        const z3 = y3r * Math.sin(tilt) + z3r * Math.cos(tilt)
        if (z3 > 0) {
          const x = size/2 + x3 * radius
          const y = size/2 - y3 * radius
          ctx.beginPath()
          ctx.fillStyle = 'rgba(255,255,255,0.12)'
          ctx.arc(x, y, 3, 0, Math.PI*2)
          ctx.fill()
          ctx.fillStyle = 'rgba(200,220,240,0.85)'
          ctx.font = '10px DM Sans'
          ctx.fillText(ct.code, x + 6, y + 4)
        }
      })

      // City dots — sized by pay multiplier, selected city pulses
      const selCity = selectedRef.current
      cities.forEach(c => {
        if (typeof c.lat !== 'number' || typeof c.lon !== 'number') return
        const phi = c.lat * Math.PI/180
        const lambda = (c.lon * Math.PI/180) + rot
        const x3r = Math.cos(phi) * Math.sin(lambda)
        const y3r = Math.sin(phi)
        const z3r = Math.cos(phi) * Math.cos(lambda)
        const x3 = x3r
        const y3 = y3r * Math.cos(tilt) - z3r * Math.sin(tilt)
        const z3 = y3r * Math.sin(tilt) + z3r * Math.cos(tilt)
        if (z3 > 0) {
          const x = size/2 + x3 * radius
          const y = size/2 - y3 * radius
          const dotR = 2 + Math.min(2.5, Number(c.p || 1) * 0.8)
          if (selCity?.name === c.name) {
            const pulse = (Math.sin(pulseRef.current) + 1) / 2
            ctx.beginPath()
            ctx.strokeStyle = `rgba(167,139,250,${0.9 - pulse * 0.7})`
            ctx.lineWidth = 1.5
            ctx.arc(x, y, dotR + 4 + pulse * 9, 0, Math.PI*2)
            ctx.stroke()
            ctx.beginPath()
            ctx.fillStyle = 'rgba(139,92,246,0.95)'
            ctx.arc(x, y, dotR + 1, 0, Math.PI*2)
            ctx.fill()
          } else {
            ctx.beginPath()
            ctx.fillStyle = 'rgba(6,182,212,0.9)'
            ctx.arc(x, y, dotR, 0, Math.PI*2)
            ctx.fill()
          }
          ctx.fillStyle = 'rgba(230,238,246,0.95)'
          ctx.font = '10px DM Sans'
          ctx.fillText(c.icon, x + dotR + 4, y + 4)
        }
      })

      // Edge darkening (inner shadow for 3D depth)
      const edgeGrad = ctx.createRadialGradient(size/2, size/2, radius * 0.65, size/2, size/2, radius)
      edgeGrad.addColorStop(0, 'rgba(0,0,0,0)')
      edgeGrad.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.beginPath()
      ctx.arc(size/2, size/2, radius, 0, Math.PI*2)
      ctx.fillStyle = edgeGrad
      ctx.fill()

      // Specular highlight (upper-left light source)
      const specGrad = ctx.createRadialGradient(
        size/2 - radius*0.4, size/2 - radius*0.4, 0,
        size/2 - radius*0.15, size/2 - radius*0.15, radius*0.65
      )
      specGrad.addColorStop(0, 'rgba(255,255,255,0.16)')
      specGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)')
      specGrad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.arc(size/2, size/2, radius, 0, Math.PI*2)
      ctx.fillStyle = specGrad
      ctx.fill()

      ctx.restore()

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(animFrameRef.current) }
  }, [cities])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    function onDown(e: PointerEvent) {
      dragging.current = true
      lastX.current = e.clientX
      lastY.current = e.clientY
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
      ;(e.target as Element).setPointerCapture(e.pointerId)
    }
    function onUp() {
      dragging.current = false
      // Snap tilt back to 0 after 3 seconds of inactivity
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
      snapTimerRef.current = setTimeout(() => {
        const ease = () => {
          tiltRef.current *= 0.9
          if (Math.abs(tiltRef.current) > 0.001) requestAnimationFrame(ease)
          else tiltRef.current = 0
        }
        requestAnimationFrame(ease)
      }, 3000)
    }
    function onMove(e: PointerEvent) {
      if (!dragging.current) return
      const dx = e.clientX - lastX.current
      const dy = e.clientY - lastY.current
      lastX.current = e.clientX
      lastY.current = e.clientY
      rotationRef.current += dx * 0.01
      tiltRef.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, tiltRef.current - dy * 0.01))
    }
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointermove', onMove)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointermove', onMove)
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
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
      const phi = lat * Math.PI/180
      const lambda = (c.lon * Math.PI/180) + rotationRef.current
      const x3r = Math.cos(phi) * Math.sin(lambda)
      const y3r = Math.sin(phi)
      const z3r = Math.cos(phi) * Math.cos(lambda)
      const tilt = tiltRef.current
      const x3 = x3r
      const y3 = y3r * Math.cos(tilt) - z3r * Math.sin(tilt)
      const z3 = y3r * Math.sin(tilt) + z3r * Math.cos(tilt)
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
    if (picked) { selectedRef.current = picked; setSelected(picked) }
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

    // Only schedule relocation here; fallback job is queued once relocation actually happens.
    dispatch({
      type: 'SET_STATE',
      payload: {
        pendingCity: {
          ...selected,
          scheduledMonth: schedMonth,
          scheduledYear: schedYear,
          relocationCost: totalRelocationCost,
          transportCost: costInfo.transportCost,
          distanceKm: costInfo.distance,
        },
      },
    })
  }

  const sortedCities = useMemo(() => [...cities].sort((a, b) => a.name.localeCompare(b.name)), [cities])

  const handleCityListClick = (c: any) => {
    selectedRef.current = c
    setSelected(c)
    // Snap globe to face this city
    rotationRef.current = -(c.lon * Math.PI / 180)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="glass p-6 md:col-span-2">
        <h3 className="font-bold mb-3">Interactive Globe</h3>
        <canvas ref={canvasRef} onClick={handleCanvasClick} className="w-full" style={{filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.75))'}} />
        <div className="mt-3 text-sm text-slate-400">Drag to rotate. Click a marker on the globe or a city below to select.</div>
        <div className="mt-4">
          <h4 className="font-bold mb-2 text-sm">All Cities</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-64 overflow-y-auto pr-1">
            {sortedCities.map(c => (
              <button
                key={c.name}
                onClick={() => handleCityListClick(c)}
                className={`text-left px-2 py-1.5 rounded text-xs truncate transition-colors ${
                  selected?.name === c.name
                    ? 'bg-violet-600 text-white font-semibold'
                    : 'bg-white bg-opacity-10 hover:bg-opacity-20 text-slate-300'
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass p-6">
        <h4 className="font-bold">Selected</h4>
        {selected ? (
          <>
            <div className="my-3">
              <div className="text-lg font-bold">{selected.icon} {selected.name}</div>
              <div className="text-sm text-slate-400">Rent: {selected.r}x • Pay: {selected.p}x</div>
              <div className="text-sm text-slate-400">Users in city: {selectedCityInsights?.usersInCity ?? 0} • Supply pressure: {selectedCityInsights?.pressureLabel ?? 'Balanced'} ({selectedCityInsights?.pressureMultiplier?.toFixed(2) ?? '1.00'}x)</div>
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
            <div className="mt-1 text-emerald-300">
              Current job remains active until relocation executes on {state.pendingCity.scheduledMonth}/{state.pendingCity.scheduledYear}.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
