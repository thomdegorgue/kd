'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportCSV, type CSVColumn } from '@/lib/utils/csv-export'

interface CSVExportButtonProps<T extends Record<string, unknown>> {
  data: T[]
  columns: CSVColumn<T>[]
  filename: string
  label?: string
}

export function CSVExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  label = 'Exportar CSV',
}: CSVExportButtonProps<T>) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportCSV({ data, columns, filename })}
      disabled={data.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}
