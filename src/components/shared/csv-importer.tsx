'use client'

import { useCallback, useRef, useState } from 'react'
import Papa from 'papaparse'
import { Upload, AlertCircle, CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ZodType } from 'zod'

type Step = 'upload' | 'preview' | 'results'

interface ParsedRow {
  raw: Record<string, string>
  valid: boolean
  errors: string[]
  parsed: Record<string, unknown> | null
}

interface CSVImporterProps {
  entity: string
  schema: ZodType
  onConfirm: (validRows: Record<string, unknown>[]) => Promise<void>
  onCancel?: () => void
}

const PREVIEW_ROWS = 5

export function CSVImporter({
  entity,
  schema,
  onConfirm,
  onCancel,
}: CSVImporterProps) {
  const [step, setStep] = useState<Step>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validCount = rows.filter((r) => r.valid).length
  const errorCount = rows.filter((r) => !r.valid).length

  const handleFile = useCallback(
    (file: File) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (result) => {
          if (!result.data.length) return

          const hdrs = result.meta.fields ?? Object.keys(result.data[0])
          setHeaders(hdrs)

          const parsed = result.data.map((raw): ParsedRow => {
            const parseResult = schema.safeParse(raw)
            if (parseResult.success) {
              return { raw, valid: true, errors: [], parsed: parseResult.data as Record<string, unknown> }
            }
            const errors = parseResult.error.issues.map(
              (i) => `${String(i.path.join('.'))}: ${i.message}`,
            )
            return { raw, valid: false, errors, parsed: null }
          })

          setRows(parsed)
          setStep('preview')
        },
      })
    },
    [schema],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleConfirm = useCallback(async () => {
    const validRows = rows.filter((r) => r.valid).map((r) => r.parsed!)
    setSubmitting(true)
    try {
      await onConfirm(validRows)
      setImportResult({ imported: validRows.length, errors: errorCount })
      setStep('results')
    } catch {
      setImportResult({ imported: 0, errors: rows.length })
      setStep('results')
    } finally {
      setSubmitting(false)
    }
  }, [rows, errorCount, onConfirm])

  const reset = useCallback(() => {
    setStep('upload')
    setHeaders([])
    setRows([])
    setImportResult(null)
  }, [])

  // ── Step: Upload ──────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-10 transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          )}
        >
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Arrastrá un archivo CSV o hacé click para seleccionar</p>
            <p className="text-xs text-muted-foreground">Importar {entity}</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
            className="hidden"
          />
        </div>
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    )
  }

  // ── Step: Preview ─────────────────────────────────────────
  if (step === 'preview') {
    const previewRows = rows.slice(0, PREVIEW_ROWS)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            {rows.length} fila(s)
          </Badge>
          <Badge variant="outline" className="text-green-700">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {validCount} válida(s)
          </Badge>
          {errorCount > 0 && (
            <Badge variant="outline" className="text-destructive">
              <XCircle className="mr-1 h-3 w-3" />
              {errorCount} con error
            </Badge>
          )}
        </div>

        <div className="max-h-80 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                {headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, i) => (
                <TableRow key={i} className={cn(!row.valid && 'bg-destructive/5')}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  {headers.map((h) => (
                    <TableCell key={h} className="text-sm">
                      {row.raw[h] ?? ''}
                    </TableCell>
                  ))}
                  <TableCell>
                    {row.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <span className="flex items-start gap-1 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                        {row.errors[0]}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {rows.length > PREVIEW_ROWS && (
          <p className="text-xs text-muted-foreground">
            Mostrando {PREVIEW_ROWS} de {rows.length} filas
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={handleConfirm} disabled={validCount === 0 || submitting} size="sm">
            {submitting ? (
              <><Upload className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Confirmar importación ({validCount})
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  // ── Step: Results ─────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-md border p-8 text-center">
        {importResult && importResult.imported > 0 ? (
          <>
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <p className="text-sm font-medium">
              {importResult.imported} {entity} importado(s) correctamente
            </p>
          </>
        ) : (
          <>
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium">No se pudo importar</p>
          </>
        )}
        {importResult && importResult.errors > 0 && (
          <p className="text-xs text-muted-foreground">
            {importResult.errors} fila(s) con error fueron omitidas
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={reset}>
        Importar otro archivo
      </Button>
    </div>
  )
}
