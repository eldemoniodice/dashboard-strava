import { useState, useMemo } from 'react'

const PAGE = 19
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ActivityLog({ runs, onSelect, selectedRun }) {
  const [yearFilter, setYearFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => [...runs].sort((a,b) => b.date.localeCompare(a.date)), [runs])
  const years = useMemo(() => [...new Set(sorted.map(r => r.year))].sort((a,b)=>b-a), [sorted])
  const months = useMemo(() => {
    const base = sorted.filter(r => yearFilter==='all' || r.year===+yearFilter)
    return [...new Set(base.map(r => r.month))].sort((a,b)=>a-b)
  }, [sorted, yearFilter])

  const filtered = useMemo(() => sorted.filter(r => {
    if (yearFilter !== 'all' && r.year !== +yearFilter) return false
    if (monthFilter !== 'all' && r.month !== +monthFilter) return false
    return true
  }), [sorted, yearFilter, monthFilter])

  const totalPages = Math.ceil(filtered.length / PAGE)
  const page_ = Math.min(page, Math.max(1, totalPages))
  const displayed = filtered.slice((page_-1)*PAGE, page_*PAGE)

  function changeYear(v) { setYearFilter(v); setMonthFilter('all'); setPage(1) }
  function changeMonth(v) { setMonthFilter(v); setPage(1) }
  function handleSelect(run) {
    if (selectedRun && selectedRun.date===run.date && selectedRun.name===run.name) onSelect(null)
    else onSelect(run)
  }

  function fmtTime(min) {
    const h = Math.floor(min/60), m = Math.floor(min%60), s = Math.round((min%1)*60)
    return h>0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
  }

  return (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:4, padding:'20px 16px', display:'flex', flexDirection:'column', overflow:'hidden', transition:'background 0.25s, border-color 0.25s' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={s.title}>RUN HISTORY</div>
        <div style={{ display:'flex', gap:8 }}>
          <Sel value={yearFilter} onChange={e => changeYear(e.target.value)}>
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </Sel>
          <Sel value={monthFilter} onChange={e => changeMonth(e.target.value)}>
            <option value="all">All Months</option>
            {months.map(m => <option key={m} value={m}>{MONTHS[m-1]}</option>)}
          </Sel>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>{['Date','Name','Dist (km)','Pace','Time'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {displayed.map((r, i) => {
              const isSel = selectedRun && selectedRun.date===r.date && selectedRun.name===r.name
              return (
                <tr key={i} onClick={() => handleSelect(r)}
                  style={{ background: isSel ? 'var(--row-selected)' : i%2===0 ? 'transparent' : 'var(--row-alt)', cursor:'pointer', borderLeft: isSel ? '3px solid var(--volt)' : '3px solid transparent', transition:'background 0.1s' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background='var(--row-hover)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background=i%2===0?'transparent':'var(--row-alt)' }}
                >
                  <td style={s.td}>{r.date}</td>
                  <td style={{ ...s.td, color:'var(--text2)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</td>
                  <td style={{ ...s.td, color:'var(--volt)', fontWeight:700 }}>{r.dist.toFixed(2)}</td>
                  <td style={s.td}>{r.paceStr}</td>
                  <td style={s.td}>{fmtTime(r.time_min)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:11, color:'var(--muted)', letterSpacing:1 }}>
            {filtered.length} RUNS · PAGE {page_} OF {totalPages}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <PBtn onClick={() => setPage(p => Math.max(1,p-1))} disabled={page_===1}>{'<'}</PBtn>
            {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>Math.abs(p-page_)<=2).map(p=>(
              <PBtn key={p} onClick={()=>setPage(p)} active={p===page_}>{p}</PBtn>
            ))}
            <PBtn onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page_===totalPages}>{'>'}</PBtn>
          </div>
        </div>
      )}
    </div>
  )
}

function Sel({ children, ...props }) {
  return (
    <select {...props} style={{ background:'var(--select-bg)', border:'1px solid var(--select-border)', borderRadius:3, color:'var(--muted)', padding:'4px 8px', fontFamily:'Barlow Condensed, sans-serif', fontSize:11, letterSpacing:1, cursor:'pointer', outline:'none' }}>
      {children}
    </select>
  )
}

function PBtn({ children, onClick, active, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: active ? 'var(--page-active-bg)' : 'var(--page-btn-bg)',
      color: active ? 'var(--page-active-text)' : 'var(--muted)',
      border: '1px solid var(--border)',
      borderRadius:3, width:28, height:28,
      fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:12,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>{children}</button>
  )
}

const s = {
  title: { fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:11, letterSpacing:3, color:'var(--muted)', textTransform:'uppercase' },
  th: { fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:10, letterSpacing:2, color:'var(--muted)', textTransform:'uppercase', padding:'6px 10px', textAlign:'left', borderBottom:'1px solid var(--border)', background:'var(--card)', position:'sticky', top:0, zIndex:1 },
  td: { fontFamily:'Barlow, sans-serif', fontSize:12, color:'var(--muted)', padding:'7px 10px' },
}
