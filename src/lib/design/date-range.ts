/**
 * Rango del mes calendario que contiene `reference` (inicio 00:00, fin último día).
 */
export function getCalendarMonthRange(reference: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export function formatDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
