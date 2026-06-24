export default function YearCards({ perYear, years, yearColors }) {
  return (
    <div className="year-grid" style={{ '--year-count': years.length }}>
      {years.map(y => {
        const d = perYear[y]
        const color = yearColors[y]
        return (
          <div key={y} style={{ background:'var(--card)', border:'1px solid var(--border)', borderTop:`3px solid ${color}`, borderRadius:4, padding:'16px 20px', transition:'background 0.25s, border-color 0.25s' }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:13, letterSpacing:4, color, marginBottom:14, textTransform:'uppercase' }}>{y}</div>
            <div className="year-stat-row">
              <Stat label="KM" value={d.km.toFixed(1)} color={color} />
              <Stat label="RUNS" value={d.runs} color={color} />
              <Stat label="AVG PACE" value={d.avgPace} color={color} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:30, color, letterSpacing:-0.5 }}>{value}</div>
      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:600, fontSize:10, letterSpacing:2, color:'var(--muted)', textTransform:'uppercase', marginTop:2 }}>{label}</div>
    </div>
  )
}
