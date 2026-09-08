import Papa from 'papaparse'
import pako from 'pako'
import FitParser from 'fit-file-parser'
import { Buffer } from 'buffer'

if (typeof window !== 'undefined' && !window.Buffer) window.Buffer = Buffer

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
  // "Jun 22, 2026, 2:41:54 PM"
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
  // List CSV (root) and the "activities" subfolder + its contents in one go via recursive query
  const rootRes = await fetch(`${DRIVE_API}/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name,mimeType)&key=${API_KEY}&pageSize=1000`)
  const rootData = await rootRes.json()
  if (rootData.error) throw new Error(`Drive API error: ${rootData.error.message}`)

  const csvFile = rootData.files.find(f => f.name === 'activities.csv')
  const activitiesFolder = rootData.files.find(f => f.name === 'activities' && f.mimeType === 'application/vnd.google-apps.folder')
  if (!csvFile) throw new Error('No se encontró activities.csv en la carpeta de Drive')
  if (!activitiesFolder) throw new Error('No se encontró la subcarpeta activities en Drive')

  let fitFiles = []
  let pageToken = null
  do {
    const url = `${DRIVE_API}/files?q='${activitiesFolder.id}'+in+parents&fields=files(id,name),nextPageToken&pageSize=1000&key=${API_KEY}` + (pageToken ? `&pageToken=${pageToken}` : '')
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) throw new Error(`Drive API error: ${data.error.message}`)
    fitFiles = fitFiles.concat(data.files)
    pageToken = data.nextPageToken
  } while (pageToken)

  return { csvFileId: csvFile.id, fitFiles }
}

async function downloadDriveFile(fileId, asBinary = false) {
  const url = `${DRIVE_API}/files/${fileId}?alt=media&key=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error descargando archivo ${fileId}: ${res.status}`)
  return asBinary ? res.arrayBuffer() : res.text()
}

async function extractGps(fitGzBuffer) {
  try {
    const gunzipped = pako.ungzip(new Uint8Array(fitGzBuffer))
    const fitParser = new FitParser({ force: true, mode: 'list' })
    const data = await fitParser.parseAsync(Buffer.from(gunzipped))
    const records = data.records || []
    let pts = records
      .filter(r => r.position_lat != null && r.position_long != null)
      .map(r => [Math.round(r.position_lat * 1e6) / 1e6, Math.round(r.position_long * 1e6) / 1e6])
    if (pts.length > 150) {
      const step = Math.floor(pts.length / 150)
      pts = pts.filter((_, i) => i % step === 0)
    }
    return pts
  } catch {
    return []
  }
}

export async function fetchDashboardData(onProgress) {
  if (!API_KEY || !FOLDER_ID) {
    throw new Error('Falta configurar VITE_GOOGLE_API_KEY y VITE_DRIVE_FOLDER_ID en el archivo .env')
  }

  onProgress?.('Listando archivos de Drive...')
  const { csvFileId, fitFiles } = await listDriveFiles()
  const fitByName = new Map(fitFiles.map(f => [f.name, f.id]))

  onProgress?.('Descargando activities.csv...')
  const csvText = await downloadDriveFile(csvFileId)
  const parsed = Papa.parse(csvText, { header: false })
  const rows = parsed.data.filter(r => r.length > 1)
  const headers = rows[0]
  const distIdx = headers.indexOf('Distance')
  const timeIdx = headers.indexOf('Moving Time')
  const typeIdx = headers.indexOf('Activity Type')
  const dateIdx = headers.indexOf('Activity Date')
  const nameIdx = headers.indexOf('Activity Name')
  const fileIdx = headers.indexOf('Filename')

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
    const fname = (row[fileIdx] || '').trim().replace(/^activities\//, '')

    runs.push({
      date: key,
      name: (row[nameIdx] || 'Run').trim(),
      dist: Math.round(distKm * 100) / 100,
      pace: Math.round(pace * 100) / 100,
      paceStr: fmtPace(pace),
      time_min: Math.round((movingS / 60) * 10) / 10,
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      monthLabel: `${MES_EN[dt.getMonth()]} ${dt.getFullYear()}`,
      ym: `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}`,
      _fitName: fname,
    })
  }

  runs.sort((a, b) => a.date.localeCompare(b.date))

  onProgress?.(`Descargando rutas GPS (0/${runs.length})...`)
  let done = 0
  const CONCURRENCY = 3
  const BATCH_DELAY_MS = 250
  for (let i = 0; i < runs.length; i += CONCURRENCY) {
    const batch = runs.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async r => {
      const fileId = fitByName.get(r._fitName)
      r.gps = []
      if (fileId) {
        try {
          const buf = await downloadDriveFile(fileId, true)
          r.gps = await extractGps(buf)
        } catch { /* skip run without usable GPS */ }
      }
      done++
      onProgress?.(`Descargando rutas GPS (${done}/${runs.length})...`)
      delete r._fitName
    }))
    if (i + CONCURRENCY < runs.length) {
      await new Promise(res => setTimeout(res, BATCH_DELAY_MS))
    }
  }

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
    const paces = yr.filter(r => r.pace > 0).map(r => r.pace)
    perYear[String(y)] = {
      km: Math.round(yr.reduce((a,r)=>a+r.dist,0) * 10) / 10,
      runs: yr.length,
      avgPace: paces.length ? fmtPace(paces.reduce((a,b)=>a+b,0)/paces.length) : '-',
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
