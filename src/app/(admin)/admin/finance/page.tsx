'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Scale,
  ChevronRight,
  FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { EmptyState } from '@/components/shared/empty-state'
import { PackInactiveWarning } from '@/components/shared/pack-inactive-warning'
import {
  useFinanceEntries,
  useFinanceSummary,
  useCreateFinanceEntry,
  useDeleteFinanceEntry,
} from '@/lib/hooks/use-finance'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { z } from 'zod'
import { FINANCE_TYPE_LABELS } from '@/lib/validations/finance'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { ModuleName } from '@/lib/types'

const financeFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount_pesos: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  description: z.string().min(1, 'Requerido').max(200),
  date: z.string().min(1),
  category: z.string().optional(),
})
type FinanceFormInput = z.infer<typeof financeFormSchema>

type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'year'

function getDateRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = fmt(now)

  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate() - 7)
      return { from: fmt(d), to: today }
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 30)
      return { from: fmt(d), to: today }
    }
    case 'month':
      return {
        from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
        to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
      }
    case 'year':
      return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
  }
}

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: 'Hoy',
  '7d': '7 días',
  '30d': '30 días',
  month: 'Este mes',
  year: 'Este año',
}

export default function FinancePage() {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const firstOfMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString().slice(0, 10)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | ''>('')
  const [showCreate, setShowCreate] = useState(false)
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(lastOfMonth)
  const [activePeriod, setActivePeriod] = useState<PeriodPreset | null>('month')
  const [selectedEntry, setSelectedEntry] = useState<Record<string, unknown> | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { modules } = useAdminContext()
  const { data, isLoading } = useFinanceEntries({
    type: typeFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  })
  const { data: summary } = useFinanceSummary(dateFrom, dateTo)
  const createMutation = useCreateFinanceEntry()
  const deleteMutation = useDeleteFinanceEntry()
  const { formatPrice } = useCurrency()

  const filtered = useMemo(() => {
    const entries = data?.items ?? []
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return (entries as Record<string, unknown>[]).filter((e) => {
      const desc = String(e.description ?? '').toLowerCase()
      const cat = String(e.category ?? '').toLowerCase()
      return desc.includes(q) || cat.includes(q)
    })
  }, [data?.items, search])

  const form = useForm<FinanceFormInput>({
    resolver: zodResolver(financeFormSchema),
    defaultValues: {
      type: 'income',
      description: '',
      date: today.toISOString().slice(0, 10),
    },
  })

  function applyPreset(preset: PeriodPreset) {
    const { from, to } = getDateRange(preset)
    setDateFrom(from)
    setDateTo(to)
    setActivePeriod(preset)
  }

  async function onSubmit(data: FinanceFormInput) {
    await createMutation.mutateAsync({
      type: data.type,
      amount: Math.round(data.amount_pesos * 100),
      description: data.description,
      date: data.date,
      category: data.category,
    })
    form.reset()
    setShowCreate(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Finanzas</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {filtered.length} {filtered.length === 1 ? 'entrada' : 'entradas'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2 hidden sm:flex">
              <FileDown className="h-3.5 w-3.5" />
              Exportar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva entrada</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </div>
        </div>

        <PackInactiveWarning
          requiredModule={'finance' as ModuleName}
          activeModules={modules as Record<ModuleName, boolean>}
        />
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar entradas..."
          searchValue={search}
          onSearchChange={setSearch}
          filterPreset="finanzas"
        />
      </div>

      <div className="px-4 sm:px-6 space-y-4">
        {/* Period presets */}
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                activePeriod === preset
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border bg-background hover:bg-muted'
              }`}
            >
              {PERIOD_LABELS[preset]}
            </button>
          ))}
          {/* Custom range */}
          <div className="flex items-center gap-1.5 ml-1">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setActivePeriod(null) }}
              className="w-32 h-7 text-xs"
            />
            <span className="text-xs text-muted-foreground">—</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setActivePeriod(null) }}
              className="w-32 h-7 text-xs"
            />
          </div>
        </div>

        {/* KPI cards */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-xs text-muted-foreground">Ingresos</p>
                </div>
                <p className="text-base sm:text-lg font-bold text-emerald-600 tabular-nums truncate">
                  {formatPrice(summary.total_income)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                  <p className="text-xs text-muted-foreground">Egresos</p>
                </div>
                <p className="text-base sm:text-lg font-bold text-destructive tabular-nums truncate">
                  {formatPrice(summary.total_expense)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Neto</p>
                </div>
                <p className={`text-base sm:text-lg font-bold tabular-nums truncate ${
                  summary.net >= 0 ? 'text-emerald-600' : 'text-destructive'
                }`}>
                  {formatPrice(summary.net)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Type filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {(['', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                typeFilter === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border bg-background hover:bg-muted'
              }`}
            >
              {t === '' ? 'Todas' : FINANCE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-12 w-12" />}
            title="Sin entradas"
            description="No hay movimientos para el período seleccionado."
            action={
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva entrada
              </Button>
            }
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
              {(filtered as Record<string, unknown>[]).map((e) => (
                <button
                  key={e.id as string}
                  className="p-4 flex items-start gap-3 w-full text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setSelectedEntry(e)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{e.description as string}</p>
                      <Badge
                        variant={e.type === 'income' ? 'default' : 'secondary'}
                        className="text-[10px] shrink-0"
                      >
                        {FINANCE_TYPE_LABELS[e.type as string] ?? (e.type as string)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(e.date as string).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className={`text-sm tabular-nums font-semibold ${
                      e.type === 'income' ? 'text-emerald-600' : 'text-destructive'
                    }`}>
                      {e.type === 'income' ? '+' : '-'}{formatPrice(e.amount as number)}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Descripción</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filtered as Record<string, unknown>[]).map((e) => (
                    <TableRow
                      key={e.id as string}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedEntry(e)}
                    >
                      <TableCell className="text-sm">{e.description as string}</TableCell>
                      <TableCell>
                        <Badge variant={e.type === 'income' ? 'default' : 'secondary'}>
                          {FINANCE_TYPE_LABELS[e.type as string] ?? e.type as string}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(e.date as string).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${
                        e.type === 'income' ? 'text-emerald-600' : 'text-destructive'
                      }`}>
                        {e.type === 'income' ? '+' : '-'}{formatPrice(e.amount as number)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteId(e.id as string)}
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Sheet detalle entrada */}
      <Sheet open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Detalle
            </SheetTitle>
          </SheetHeader>
          {selectedEntry && (
            <div className="py-4 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="text-sm font-medium mt-0.5">{selectedEntry.description as string}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <Badge variant={selectedEntry.type === 'income' ? 'default' : 'secondary'} className="mt-1">
                      {FINANCE_TYPE_LABELS[selectedEntry.type as string] ?? selectedEntry.type as string}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="text-sm font-medium mt-0.5">
                      {new Date(selectedEntry.date as string).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className={`text-2xl font-bold tabular-nums mt-0.5 ${
                    selectedEntry.type === 'income' ? 'text-emerald-600' : 'text-destructive'
                  }`}>
                    {selectedEntry.type === 'income' ? '+' : '-'}{formatPrice(selectedEntry.amount as number)}
                  </p>
                </div>
                {Boolean(selectedEntry.category) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Categoría</p>
                    <p className="text-sm mt-0.5">{selectedEntry.category as string}</p>
                  </div>
                )}
                {Boolean(selectedEntry.order_id) && (
                  <div>
                    <p className="text-xs text-muted-foreground">Origen</p>
                    <Badge variant="outline" className="mt-1 text-xs">Pedido</Badge>
                  </div>
                )}
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  setDeleteId(selectedEntry.id as string)
                  setSelectedEntry(null)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar entrada
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet crear */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Nueva entrada
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="py-4 space-y-5">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(v) => form.setValue('type', v as 'income' | 'expense')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" {...form.register('description')} />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount_pesos">Monto ($)</Label>
              <Input
                id="amount_pesos"
                type="number"
                step="0.01"
                min={0.01}
                {...form.register('amount_pesos', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" {...form.register('date')} />
            </div>
            <SheetFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* AlertDialog eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId)
                setDeleteId(null)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
