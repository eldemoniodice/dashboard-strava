export default function KpiCards({ kpis }) {
  const cards = [
    { label: 'TOTAL KM', value: kpis.totalKm.toFixed(1), unit: 'km' },
    { label: 'TOTAL RUNS', value: kpis.totalRuns, unit: 'runs' },
    { label: 'AVG DISTANCE', value: kpis.avgDist.toFixed(2), unit: 'km / run' },
    { label: 'BEST PACE', value: kpis.bestPace, unit: 'min/km', sub: kpis.bestPaceDate },
    { label: 'LONGEST RUN', value: kpis.longestDist.toFixed(2), unit: 'km', sub: kpis.longestDate },
  ]

  return (
    <div className="kpi-grid">
      {cards.map(c => (
        <div key={c.label} className="kpi-card" style={styles.card}>
          <div className="kpi-label" style={styles.label}>{c.label}</div>
          <div className="kpi-value" style={styles.value}>{c.value}</div>
          <div className="kpi-unit" style={styles.unit}>{c.unit}</div>
          {c.sub && <div className="kpi-sub" style={styles.sub}>{c.sub}</div>}
        </div>
      ))}
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '18px 16px',
    transition: 'background 0.25s, border-color 0.25s',
  },
  label: {
    fontFamily: 'Barlow Condensed, sans-serif',
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: 2.5,
    color: 'var(--muted)',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: 'Barlow Condensed, sans-serif',
    fontWeight: 900,
    fontSize: 44,
    lineHeight: 1,
    color: 'var(--metric-value)',
    letterSpacing: -1,
  },
  unit: {
    fontFamily: 'Barlow Condensed, sans-serif',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: 2,
    color: 'var(--muted)',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  sub: {
    fontFamily: 'Barlow, sans-serif',
    fontSize: 11,
    color: 'var(--muted)',
    marginTop: 6,
  }
}
