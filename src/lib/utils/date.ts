const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const DATETIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date
}

/**
 * @example formatDate('2026-04-12') → "12 abr 2026"
 */
export function formatDate(date: string | Date): string {
  return DATE_FORMATTER.format(toDate(date))
}

/**
 * @example formatDateTime('2026-04-12T14:30:00') → "12 abr 2026, 14:30"
 */
export function formatDateTime(date: string | Date): string {
  return DATETIME_FORMATTER.format(toDate(date))
}

const SECONDS = 1
const MINUTES = 60 * SECONDS
const HOURS = 60 * MINUTES
const DAYS = 24 * HOURS

/**
 * @example formatRelative(twhoHoursAgo) → "hace 2 horas"
 */
export function formatRelative(date: string | Date): string {
  const now = Date.now()
  const then = toDate(date).getTime()
  const diffSec = Math.round((now - then) / 1000)

  if (diffSec < 0) return 'en el futuro'
  if (diffSec < 60 * SECONDS) return 'hace un momento'
  if (diffSec < 2 * MINUTES) return 'hace 1 minuto'
  if (diffSec < 60 * MINUTES) return `hace ${Math.floor(diffSec / MINUTES)} minutos`
  if (diffSec < 2 * HOURS) return 'hace 1 hora'
  if (diffSec < 24 * HOURS) return `hace ${Math.floor(diffSec / HOURS)} horas`
  if (diffSec < 2 * DAYS) return 'ayer'
  if (diffSec < 7 * DAYS) return `hace ${Math.floor(diffSec / DAYS)} días`

  return formatDate(date)
}
