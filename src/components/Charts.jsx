import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend,
  LabelList, ResponsiveContainer
} from 'recharts'

function useThemeVars() {
  const el = document.documentElement
  const s = getComputedStyle(el)
  return {
    volt:    s.getPropertyValue('--volt').trim() || '#C8F04A',
    muted:   s.getPropertyValue('--muted').trim() || '#888',
    border:  s.getPropertyValue('--border').trim() || '#2a2a2a',
    card:    s.getPropertyValue('--card').trim() || '#141414',
    tooltipBg:     s.getPropertyValue('--tooltip-bg').trim() || '#1a1a1a',
    tooltipBorder: s.getPropertyValue('--tooltip-border').trim() || '#333',
    tooltipLabel:  s.getPropertyValue('--tooltip-label').trim() || '#aaa',
    text:    s.getPropertyValue('--text').trim() || '#fff',
  }
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:4, padding:'20px 16px', transition:'background 0.25s, border-color 0.25s' }}>
      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:11, letterSpacing:3, color:'var(--muted)', textTransform:'uppercase', marginBottom:16 }}>{title}</div>
      {children}
    </div>
  )
}

function paceToMin(p) {
  if (!p) return 0
  const [m,s] = String(p).includes(':') ? p.split(':').map(Number) : [Math.floor(p), Math.round((p%1)*60)]
  return m + (s||0)/60
}

function fmtPace(v) {
  const m = Math.floor(v); const s = Math.round((v-m)*60)
  return `${m}:${String(s).padStart(2,'0')}`
}

export default function Charts({ data }) {
  const tv = useThemeVars()
  const { years, yearColors, kmByYear, cntByYear, monthShortLabels, monthLabels, monthAvgPace, monthPaceStr, dowLabels, dowCounts } = data

  const tooltipStyle = {
    contentStyle: { background: tv.tooltipBg, border:`1px solid ${tv.tooltipBorder}`, borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:12 },
    labelStyle: { color: tv.tooltipLabel, fontFamily:'Barlow Condensed, sans-serif', letterSpacing:1 },
    itemStyle: { color: tv.text },
  }

  const axisProps = {
    tick: { fill: tv.muted, fontSize:11, fontFamily:'Barlow Condensed' },
    axisLine: { stroke: tv.border },
    tickLine: false,
  }

  const kmMonthData = monthShortLabels.map((label, i) => {
    const row = { label }
    years.forEach(y => { row[y] = kmByYear[y][i] })
    return row
  })

  const cntMonthData = monthShortLabels.map((label, i) => {
    const row = { label }
    years.forEach(y => { row[y] = cntByYear[y][i] })
    return row
  })

  const paceData = monthLabels.map((label, i) => ({
    label: label.replace(' 20', ' \''),
    paceRaw: paceToMin(monthAvgPace[i]),
    paceStr: monthPaceStr[i],
  }))

  const dowData = dowLabels.map((label, i) => ({ label, count: dowCounts[i] }))

  return (
    <div className="charts-grid">

      <ChartCard title="KM Per Month — Year Over Year">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={kmMonthData} margin={{ top:20, right:8, bottom:0, left:0 }}>
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} axisLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v, name) => [`${v.toFixed(1)} km`, name]} />
            <Legend wrapperStyle={{ fontFamily:'Barlow Condensed', fontSize:12, letterSpacing:1, color: tv.muted }} />
            {years.map(y => (
              <Bar key={y} dataKey={y} fill={yearColors[y]} radius={[2,2,0,0]} maxBarSize={18}>
                <LabelList dataKey={y} position="top" style={{ fill:yearColors[y], fontSize:9, fontFamily:'Barlow Condensed', fontWeight:700 }} formatter={v => v>0 ? v : ''} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Runs Per Month — Year Over Year">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cntMonthData} margin={{ top:20, right:8, bottom:0, left:0 }}>
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} axisLine={false} domain={[0,20]} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontFamily:'Barlow Condensed', fontSize:12, letterSpacing:1, color: tv.muted }} />
            {years.map(y => (
              <Bar key={y} dataKey={y} fill={yearColors[y]} radius={[2,2,0,0]} maxBarSize={18}>
                <LabelList dataKey={y} position="top" style={{ fill:yearColors[y], fontSize:9, fontFamily:'Barlow Condensed', fontWeight:700 }} formatter={v => v>0 ? v : ''} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Avg Pace Per Month (min/km)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={paceData} margin={{ top:20, right:8, bottom:0, left:0 }}>
            <XAxis dataKey="label" {...axisProps} tick={{ ...axisProps.tick, fontSize:10 }} />
            <YAxis domain={[4,8]} reversed tickFormatter={fmtPace} {...axisProps} axisLine={false} />
            <Tooltip {...tooltipStyle} formatter={v => [fmtPace(v), 'Pace']} />
            <Line type="monotone" dataKey="paceRaw" stroke={tv.volt} strokeWidth={2} dot={{ fill:tv.volt, r:3 }} activeDot={{ r:5 }}>
              <LabelList dataKey="paceStr" position="top" style={{ fill:tv.volt, fontSize:9, fontFamily:'Barlow Condensed', fontWeight:700 }} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Runs by Day of Week">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dowData} margin={{ top:20, right:8, bottom:0, left:0 }}>
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} axisLine={false} domain={[0,20]} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="count" fill={tv.volt} radius={[3,3,0,0]} maxBarSize={32}>
              <LabelList dataKey="count" position="top" style={{ fill:tv.volt, fontSize:10, fontFamily:'Barlow Condensed', fontWeight:700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  )
}
