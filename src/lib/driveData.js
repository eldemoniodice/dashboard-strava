import Papa from 'papaparse'

const API_KEY    = import.meta.env.VITE_GOOGLE_API_KEY
const FOLDER_ID  = import.meta.env.VITE_DRIVE_FOLDER_ID
const DRIVE_API  = 'https://www.googleapis.com/drive/v3'

const MES_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const DOW_ORDER = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
const YEAR_COLORS = ["#C8F04A", "#3b82f6", "#22c55e", "#f59e0b"]

function fmtPace(p) {
  if (!p || p <= 0) return '-'
  const m = Math.floor(p)
  const s = Math.floor((p - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDuration(min) {
  if (!min || min <= 0) return '-'
  const h = Math.floor(min / 60)
  const m = Math.floor(min % 60)
  const s = Math.round((min % 1) * 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

function parseActivityDate(str) {
  const m = str.trim().match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/)
  if (!m) return null
  const [, mon, day, year, hh, mm, ss, ampm] = m
  let hour = parseInt(hh, 10)
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0
  const monthIdx = MES_EN.indexOf(mon)
  return new Date(+year, monthIdx, +day, hour, +mm, +ss)
}

function pad2(n) { return String(n).padStart(2, '0') }
function ymd(d) { return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` }

async function listDriveFiles() {
  // Ahora solo buscamos el archivo activities_limpio.csv, sin escanear carpetas
  const rootRes = await fetch(`${DRIVE_API}/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name)&key=${API_KEY}&pageSize=100`)
  const rootData = await rootRes.json()
  if (rootData.error) throw new Error(`Drive API error: ${rootData.error.message}`)

  const csvFile = rootData.files.find(f => f.name === 'activities_limpio.csv')
  if (!csvFile) throw new Error('No se encontró activities_limpio.csv en la carpeta de Drive')

  return { csvFileId: csvFile.id }
}

async function downloadDriveFile(fileId) {
  const url = `${DRIVE_API}/files/${fileId}?alt=media&key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error descargando archivo ${fileId}: ${res.status}`)
  return res.text()
}

export async function fetchDashboardData(onProgress) {
  if (!API_KEY || !FOLDER_ID) {
    throw new Error('Falta configurar VITE_GOOGLE_API_KEY y VITE_DRIVE_FOLDER_ID en el archivo .env')
  }

  onProgress?.('Buscando activities_limpio.csv en Drive...')
  const { csvFileId } = await listDriveFiles()

  onProgress?.('Descargando y procesando datos (1/1)...')
  const csvText = await downloadDriveFile(csvFileId)
  const parsed = Papa.parse(csvText, { header: false })
  const rows = parsed.data.filter(r => r.length > 1)
  const headers = rows[0]
  
  const distIdx = headers.indexOf('Distance')
  const timeIdx = headers.indexOf('Moving Time')
  const typeIdx = headers.indexOf('Activity Type')
  const dateIdx = headers.indexOf('Activity Date')
  const nameIdx = headers.indexOf('Activity Name')
  const gpsIdx = headers.indexOf('GPS_Path') // Nueva columna con coordenadas

  const runs = []
  for (const row of rows.slice(1)) {
    if ((row[typeIdx] || '').trim().toLowerCase() !== 'run') continue
    const dt = parseActivityDate(row[dateIdx] || '')
    if (!dt) continue
    const distKm = parseFloat(row[distIdx]) || 0
    if (distKm < 0.1) continue
    const movingS = parseFloat(row[timeIdx]) || 0
    const pace = distKm > 0 ? (movingS / 60) / distKm : 0
    const key = ymd(dt)

    // Convertimos el texto de la columna a un Array de Javascript
    let rutaGps = []
    if (gpsIdx !== -1 && row[gpsIdx]) {
      try {
        rutaGps = JSON.parse(row[gpsIdx])
      } catch (e) {
        rutaGps = []
      }
    }

    runs.push({
      date: key,
      name: (row[nameIdx] || 'Run').trim(),
      dist: Math.round(distKm * 100) / 100,
      pace: Math.round(pace * 100) / 100,
      paceStr: fmtPace(pace),
      time_min: movingS / 60,
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      monthLabel: `${MES_EN[dt.getMonth()]} ${dt.getFullYear()}`,
      ym: `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}`,
      gps: rutaGps, // Asignación directa, sin descargas extra
    })
  }

  runs.sort((a, b) => a.date.localeCompare(b.date))

  // ---- Aggregations (mirrors generate_data.py) ----
  const years = [...new Set(runs.map(r => r.year))].sort()
  const monthsRange = Array.from({ length: 12 }, (_, i) => i + 1)

  const kmYm = {}, cntYm = {}
  years.forEach(y => { kmYm[y] = {}; cntYm[y] = {}; monthsRange.forEach(m => { kmYm[y][m] = 0; cntYm[y][m] = 0 }) })
  runs.forEach(r => { kmYm[r.year][r.month] += r.dist; cntYm[r.year][r.month] += 1 })
  years.forEach(y => monthsRange.forEach(m => { kmYm[y][m] = Math.round(kmYm[y][m] * 10) / 10 }))

  const byYm = {}
  runs.forEach(r => {
    if (!byYm[r.ym]) byYm[r.ym] = { label: r.monthLabel, paces: [] }
    if (r.pace > 0) byYm[r.ym].paces.push(r.pace)
  })
  const sortedYms = Object.keys(byYm).sort()
  const monthLabels = sortedYms.map(k => byYm[k].label)
  const monthAvgPace = sortedYms.map(k => {
    const p = byYm[k].paces
    return p.length ? Math.round((p.reduce((a,b)=>a+b,0)/p.length) * 100) / 100 : 0
  })
  const monthPaceStr = monthAvgPace.map(fmtPace)

  const dowMap = { 0:'Sun', 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat' }
  const byDow = {}; DOW_ORDER.forEach(d => byDow[d] = 0)
  runs.forEach(r => {
    const [y,m,d] = r.date.split('-').map(Number)
    const dow = dowMap[new Date(y, m-1, d).getDay()]
    byDow[dow] += 1
  })

  const perYear = {}
  years.forEach(y => {
    const yr = runs.filter(r => r.year === y)
    const totalYearKm = yr.reduce((a, r) => a + r.dist, 0)
    const totalYearMinutes = yr.reduce((a, r) => a + r.time_min, 0)
    const yearAvgPace = totalYearKm > 0 ? totalYearMinutes / totalYearKm : 0

    perYear[String(y)] = {
      km: Math.round(totalYearKm * 10) / 10,
      runs: yr.length,
      avgPace: yearAvgPace > 0 ? fmtPace(yearAvgPace) : '-',
    }
  })

  const totalKm = Math.round(runs.reduce((a,r)=>a+r.dist,0) * 10) / 10
  const totalRuns = runs.length
  const avgDist = totalRuns ? Math.round((totalKm/totalRuns) * 100) / 100 : 0
  const withPace = runs.filter(r => r.pace > 0)
  const bestR = withPace.length ? withPace.reduce((a,b) => a.pace < b.pace ? a : b) : null
  const longestR = runs.length ? runs.reduce((a,b) => a.dist > b.dist ? a : b) : null
  const longestTimeR = runs.length ? runs.reduce((a,b) => a.time_min > b.time_min ? a : b) : null

  return {
    runs,
    years: years.map(String),
    yearColors: Object.fromEntries(years.map((y,i) => [String(y), YEAR_COLORS[i % YEAR_COLORS.length]])),
    monthShortLabels: MES_EN,
    kmByYear: Object.fromEntries(years.map(y => [String(y), monthsRange.map(m => kmYm[y][m])])),
    cntByYear: Object.fromEntries(years.map(y => [String(y), monthsRange.map(m => cntYm[y][m])])),
    monthLabels,
    monthAvgPace,
    monthPaceStr,
    dowLabels: DOW_ORDER,
    dowCounts: DOW_ORDER.map(d => byDow[d]),
    perYear,
    kpis: {
      totalKm, totalRuns, avgDist,
      bestPace: bestR ? fmtPace(bestR.pace) : '-',
      bestPaceDate: bestR ? bestR.date : '-',
      longestDist: longestR ? longestR.dist : 0,
      longestDate: longestR ? longestR.date : '-',
      longestTime: longestTimeR ? fmtDuration(longestTimeR.time_min) : '-',
      longestTimeDate: longestTimeR ? longestTimeR.date : '-',
    },
  }
}
