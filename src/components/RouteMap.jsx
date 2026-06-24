import { useEffect, useRef, useMemo } from 'react'

const DARK_TILE  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const ATTR = '© CartoDB'

export default function RouteMap({ runs, selectedRun, theme }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)
  const tileRef = useRef(null)
  const polylinesRef = useRef([])
  const runsWithGps = useMemo(() => runs.filter(r => r.gps && r.gps.length > 2), [runs])

  const routeColor = theme === 'light' ? '#7AB800' : '#C8F04A'

  useEffect(() => {
    if (instanceRef.current) return
    const L = window.L
    if (!L) return
    const map = L.map(mapRef.current, { zoomControl:true, attributionControl:false })
    tileRef.current = L.tileLayer(theme === 'light' ? LIGHT_TILE : DARK_TILE, { maxZoom:19 }).addTo(map)
    instanceRef.current = map

    const bounds = []
    runsWithGps.forEach(run => {
      const poly = L.polyline(run.gps, { color: routeColor, weight:1.5, opacity:0.6 })
      poly.addTo(map)
      polylinesRef.current.push(poly)
      bounds.push(...run.gps)
    })
    if (bounds.length) map.fitBounds(bounds)

    return () => { map.remove(); instanceRef.current = null }
  }, [])

  // Switch tile layer on theme change
  useEffect(() => {
    const L = window.L
    const map = instanceRef.current
    if (!map || !L) return
    if (tileRef.current) { map.removeLayer(tileRef.current) }
    tileRef.current = L.tileLayer(theme === 'light' ? LIGHT_TILE : DARK_TILE, { maxZoom:19 }).addTo(map)
  }, [theme])

  useEffect(() => {
    const L = window.L
    const map = instanceRef.current
    if (!map || !L) return

    polylinesRef.current.forEach(p => map.removeLayer(p))
    polylinesRef.current = []

    if (!selectedRun) {
      const bounds = []
      runsWithGps.forEach(run => {
        const poly = L.polyline(run.gps, { color: routeColor, weight:1.5, opacity:0.6 })
        poly.addTo(map)
        polylinesRef.current.push(poly)
        bounds.push(...run.gps)
      })
      if (bounds.length) map.fitBounds(bounds)
    } else if (selectedRun.gps && selectedRun.gps.length > 2) {
      const poly = L.polyline(selectedRun.gps, { color: routeColor, weight:3, opacity:1 })
      poly.addTo(map)
      polylinesRef.current.push(poly)
      map.fitBounds(selectedRun.gps, { padding:[30,30] })
    }
  }, [selectedRun, runsWithGps, routeColor])

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:4, overflow:'hidden', display:'flex', flexDirection:'column', transition:'background 0.25s, border-color 0.25s' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:11, letterSpacing:3, color:'var(--muted)', textTransform:'uppercase' }}>GPS ROUTES</div>
        {selectedRun && (
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:12, color:'var(--volt)', letterSpacing:1 }}>
            {selectedRun.name} · {selectedRun.dist.toFixed(2)} km
          </div>
        )}
      </div>
      <div ref={mapRef} style={{ flex:1, minHeight:480 }} />
    </div>
  )
}
