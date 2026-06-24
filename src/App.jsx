import { useState, useEffect } from 'react'
import KpiCards from './components/KpiCards'
import YearCards from './components/YearCards'
import Charts from './components/Charts'
import ActivityLog from './components/ActivityLog'
import RouteMap from './components/RouteMap'
import { fetchDashboardData } from './lib/driveData'
import './App.css'

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState('Conectando con Drive...')
  const [selectedRun, setSelectedRun] = useState(null)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    fetchDashboardData(setProgress).then(setData).catch(e => setError(e.message))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12, fontFamily:'Barlow Condensed, sans-serif', color:'#ff5555', letterSpacing:1, textAlign:'center', padding:24 }}>
      <div style={{ fontSize:24, fontWeight:900 }}>ERROR</div>
      <div style={{ fontSize:14, maxWidth:500, color:'#aaa' }}>{error}</div>
    </div>
  )

  if (!data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:10, fontFamily:'Barlow Condensed, sans-serif', fontSize:22, color:'var(--volt)', letterSpacing:2 }}>
      <div>LOADING FROM DRIVE...</div>
      <div style={{ fontSize:13, color:'#888', letterSpacing:1 }}>{progress}</div>
    </div>
  )

  const FIXED_YEAR_COLORS = { '2025': 'var(--y2025)', '2026': 'var(--y2026)' }
  const yearColors = Object.fromEntries(
    data.years.map(y => [y, FIXED_YEAR_COLORS[y] || data.yearColors[y]])
  )

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <img
            src={theme === 'light' ? '/branding/nike-logo-black.png' : '/branding/nike-logo-white.png'}
            alt="Nike"
            className="header-logo"
          />
          <span className="header-title">NIKE RUN CLUB</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          <div className="header-sub">PERFORMANCE DASHBOARD</div>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="theme-toggle">
            {theme === 'dark' ? '☀' : '●'}
          </button>
        </div>
      </header>

      <main className="app-body">
        <KpiCards kpis={data.kpis} />
        <YearCards perYear={data.perYear} years={data.years} yearColors={yearColors} />
        <Charts data={{ ...data, yearColors }} />
        <div className="bottom-grid">
          <ActivityLog runs={data.runs} onSelect={setSelectedRun} selectedRun={selectedRun} />
          <RouteMap runs={data.runs} selectedRun={selectedRun} theme={theme} />
        </div>
      </main>
    </div>
  )
}
