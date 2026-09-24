const TZ = 'Asia/Shanghai'

export function dateKey(ts = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts))
}

export function startOfDay(date: string): number {
  return new Date(`${date}T00:00:00+08:00`).getTime()
}

export function nextDayKey(date: string): string {
  return dateKey(startOfDay(date) + 24 * 60 * 60 * 1000)
}

export function addDays(date: string, days: number): string {
  return dateKey(startOfDay(date) + days * 24 * 60 * 60 * 1000)
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

export function yearStart(date: string): string {
  return `${date.slice(0, 4)}-01-01`
}

export function yearEnd(date: string): string {
  return `${date.slice(0, 4)}-12-31`
}

export function monthEnd(date: string): string {
  const [year, month] = date.split('-').map(Number)
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${date.slice(0, 7)}-${String(last).padStart(2, '0')}`
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDurationText(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h === 0 && m === 0) {
    const s = total % 60
    return s > 0 ? `${s}秒` : '0分钟'
  }
  if (h === 0) return `${m}分钟`
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}

export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

export function formatMonthLabel(date: string): string {
  const [y, m] = date.split('-')
  return `${y}年${Number(m)}月`
}

export function weekdayIndex(date: string): number {
  return new Date(`${date}T12:00:00+08:00`).getDay()
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(startOfDay(value))
}

export function formatDateRangeLabel(from: string, to: string) {
  if (from === to) return formatDateLabel(from)
  return `${formatDateLabel(from)} 至 ${formatDateLabel(to)}`
}
