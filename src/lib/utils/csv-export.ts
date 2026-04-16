export interface CSVColumn<T> {
  key: keyof T & string
  header: string
  formatter?: (value: T[keyof T], row: T) => string
}

interface ExportCSVOptions<T> {
  data: T[]
  columns: CSVColumn<T>[]
  filename: string
}

/**
 * Genera y descarga un archivo CSV con encoding UTF-8 BOM
 * para compatibilidad con Excel en español.
 */
export function exportCSV<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
}: ExportCSVOptions<T>): void {
  const headers = columns.map((c) => escapeCSV(c.header))
  const rows = data.map((row) =>
    columns.map((col) => {
      const raw = row[col.key]
      const value = col.formatter ? col.formatter(raw, row) : String(raw ?? '')
      return escapeCSV(value)
    }),
  )

  const csv = [headers, ...rows].map((r) => r.join(',')).join('\r\n')
  // UTF-8 BOM para que Excel interprete acentos correctamente
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
