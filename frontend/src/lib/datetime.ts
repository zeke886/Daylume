export const LIFEOS_TIME_ZONE = 'Asia/Shanghai'

// Date-only arithmetic must not depend on the browser host's time zone or DST.
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export function monthStart(date: string): string { return `${date.slice(0, 7)}-01` }
export function shiftMonth(date: string, amount: number): string {
  const value = new Date(`${monthStart(date)}T12:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() + amount)
  return value.toISOString().slice(0, 10)
}
export function weekStart(date: string): string {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
  return shiftDate(date, -((weekday + 6) % 7))
}
export function dayLabel(date: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'UTC', month: 'long', day: 'numeric', ...options })
    .format(new Date(`${date}T12:00:00Z`))
}
export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
}

export function localDateFromInstant(instant: string | Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LIFEOS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant))
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function formatLocalDate(date: string | Date = new Date()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: LIFEOS_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(date))
}

export function formatLocalTime(instant: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: LIFEOS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant))
}
