'use client'

import { useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Receipt, ChevronRight, Repeat2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
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
import { ImageUploader } from '@/components/shared/image-uploader'
import {
  useExpenses,
  useExpensesSummary,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/lib/hooks/use-expenses'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { z } from 'zod'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  RECURRENCE_PERIODS,
  RECURRENCE_PERIOD_LABELS,
  type RecurrencePeriod,
} from '@/lib/validations/expense'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { ModuleName } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  supplies: 'bg-blue-100 text-blue-800 border-blue-200',
  rent: 'bg-orange-100 text-orange-800 border-orange-200',
  services: 'bg-purple-100 text-purple-800 border-purple-200',
  marketing: 'bg-pink-100 text-pink-800 border-pink-200',
  equipment: 'bg-teal-100 text-teal-800 border-teal-200',
  salary: 'bg-amber-100 text-amber-800 border-amber-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
}

const expenseFormSchema = z.object({
  amount_pesos: z.number().min(0.01, 'Monto requerido'),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, 'Requerido').max(200),
  date: z.string().min(1),
  receipt_url: z.string().url().optional().or(z.literal('')),
  is_recurring: z.boolean().optional(),
  recurrence_period: z.enum(RECURRENCE_PERIODS).optional(),
})
type ExpenseFormInput = z.infer<typeof expenseFormSchema>

type EditingExpense = Record<string, unknown> & { id: string }

const today = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const firstOfMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

function ExpenseSheetFields({
  form,
  storeId,
}: {
  form: ReturnType<typeof useForm<ExpenseFormInput>>
  storeId: string
}) {
  const isRecurring = form.watch('is_recurring')
  const receiptUrl = form.watch('receipt_url') as string | undefined

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Categoría</Label>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const selected = form.watch('category') === c
            return (
              <button
                key={c}
                type="button"
                onClick={() => form.setValue('category', c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selected
                    ? CATEGORY_COLORS[c]
                    : 'text-muted-foreground border-border bg-background hover:bg-muted'
                }`}
              >
                {EXPENSE_CATEGORY_LABELS[c]}
              </button>
            )
          })}
        </div>
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
        {form.formState.errors.amount_pesos && (
          <p className="text-xs text-destructive">{form.formState.errors.amount_pesos.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Fecha</Label>
        <Input id="date" type="date" {...form.register('date')} />
      </div>

      {/* Recurrencia */}
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="is_recurring" className="cursor-pointer text-sm font-medium">
              Es recurrente
            </Label>
          </div>
          <Controller
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <Switch
                id="is_recurring"
                checked={!!field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </div>
        {isRecurring && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Frecuencia</Label>
            <Controller
              control={form.control}
              name="recurrence_period"
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v as RecurrencePeriod)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccioná..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_PERIODS.map((p) => (
                      <SelectItem key={p} value={p}>{RECURRENCE_PERIOD_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>

      {/* Comprobante */}
      <div className="space-y-2">
        <Label>Comprobante <span className="text-muted-foreground">(opcional)</span></Label>
        <ImageUploader
          storeId={storeId}
          folder="receipts"
          maxFiles={1}
          existingUrls={receiptUrl ? [receiptUrl] : []}
          onUpload={(urls) => form.setValue('receipt_url', urls[0] ?? '')}
        />
      </div>
    </div>
  )
}

export default function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<EditingExpense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(lastOfMonth)

  const { modules, store_id } = useAdminContext()
  const { data, isLoading } = useExpenses({
    category: categoryFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  })
  const { data: summary } = useExpensesSummary(dateFrom, dateTo)
  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()
  const deleteMutation = useDeleteExpense()
  const { formatPrice } = useCurrency()

  const expenses = data?.items ?? []

  const filtered = useMemo(() => {
    if (!search.trim()) return expenses
    const q = search.toLowerCase()
    return (expenses as Record<string, unknown>[]).filter((e) => {
      const desc = String(e.description ?? '').toLowerCase()
      const cat = String(e.category ?? '').toLowerCase()
      return desc.includes(q) || cat.includes(q)
    })
  }, [expenses, search])

  const createForm = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: 'other',
      description: '',
      date: today.toISOString().slice(0, 10),
      is_recurring: false,
    },
  })

  const editForm = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseFormSchema),
  })

  function openEdit(e: Record<string, unknown>) {
    setEditing(e as EditingExpense)
    editForm.reset({
      amount_pesos: (e.amount as number) / 100,
      category: e.category as typeof EXPENSE_CATEGORIES[number],
      description: e.description as string,
      date: e.date as string,
      receipt_url: (e.receipt_url as string | null) ?? '',
      is_recurring: Boolean(e.is_recurring),
      recurrence_period: (e.recurrence_period as RecurrencePeriod | undefined),
    })
  }

  async function onCreateSubmit(data: ExpenseFormInput) {
    await createMutation.mutateAsync({
      amount: Math.round(data.amount_pesos * 100),
      category: data.category,
      description: data.description,
      date: data.date,
      receipt_url: data.receipt_url || undefined,
      is_recurring: data.is_recurring,
      recurrence_period: data.is_recurring ? data.recurrence_period : undefined,
    })
    createForm.reset()
    setShowCreate(false)
  }

  async function onEditSubmit(data: ExpenseFormInput) {
    if (!editing) return
    await updateMutation.mutateAsync({
      id: editing.id,
      amount: Math.round(data.amount_pesos * 100),
      category: data.category,
      description: data.description,
      date: data.date,
      receipt_url: data.receipt_url || null,
      is_recurring: data.is_recurring,
      recurrence_period: data.is_recurring ? data.recurrence_period : null,
    })
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Gastos</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'}
              </p>
            </div>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo gasto</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>

        <PackInactiveWarning
          requiredModule={'expenses' as ModuleName}
          activeModules={modules as Record<ModuleName, boolean>}
        />
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar gastos..."
          searchValue={search}
          onSearchChange={setSearch}
          filterPreset="finanzas"
        />
      </div>

      <div className="px-4 sm:px-6 space-y-4">
        {/* Date range */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-32 h-7 text-xs"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-32 h-7 text-xs"
          />
        </div>

        {/* Summary */}
        {summary && (
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total del período</p>
              <p className="text-xl font-bold text-destructive tabular-nums">
                {formatPrice(summary.total)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Category breakdown */}
        {summary && Object.keys(summary.by_category).length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries(summary.by_category)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([cat, amount]) => (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.other
                  }`}
                >
                  {EXPENSE_CATEGORY_LABELS[cat] ?? cat}
                  <span className="font-bold">{formatPrice(amount as number)}</span>
                </span>
              ))}
          </div>
        )}

        {/* Category filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              categoryFilter === ''
                ? 'bg-primary text-primary-foreground border-primary'
                : 'text-muted-foreground border-border bg-background hover:bg-muted'
            }`}
          >
            Todos
          </button>
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c === categoryFilter ? '' : c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                categoryFilter === c
                  ? CATEGORY_COLORS[c]
                  : 'text-muted-foreground border-border bg-background hover:bg-muted'
              }`}
            >
              {EXPENSE_CATEGORY_LABELS[c]}
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
            icon={<Receipt className="h-12 w-12" />}
            title="Sin gastos"
            description="No hay gastos registrados para el período seleccionado."
            action={
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo gasto
              </Button>
            }
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
              {(filtered as Record<string, unknown>[]).map((e) => (
                <div key={e.id as string} className="p-4 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{e.description as string}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        CATEGORY_COLORS[e.category as string] ?? CATEGORY_COLORS.other
                      }`}>
                        {EXPENSE_CATEGORY_LABELS[e.category as string] ?? (e.category as string)}
                      </span>
                      {Boolean(e.is_recurring) && (
                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(e.date as string).toLocaleDateString('es-AR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm tabular-nums font-semibold text-destructive">
                      -{formatPrice(e.amount as number)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(e)}
                      aria-label="Editar"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filtered as Record<string, unknown>[]).map((e) => (
                    <TableRow
                      key={e.id as string}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => openEdit(e)}
                    >
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-2">
                          {e.description as string}
                          {Boolean(e.is_recurring) && <RefreshCw className="h-3 w-3 text-muted-foreground" />}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          CATEGORY_COLORS[e.category as string] ?? CATEGORY_COLORS.other
                        }`}>
                          {EXPENSE_CATEGORY_LABELS[e.category as string] ?? e.category as string}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(e.date as string).toLocaleDateString('es-AR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-destructive">
                        -{formatPrice(e.amount as number)}
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

      {/* Sheet crear gasto */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Nuevo gasto
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="py-4 space-y-0">
            <ExpenseSheetFields form={createForm} storeId={store_id} />
            <SheetFooter className="gap-2 sm:gap-0 mt-6">
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

      {/* Sheet editar gasto */}
      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Editar gasto
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="py-4 space-y-0">
            <ExpenseSheetFields form={editForm} storeId={store_id} />
            <div className="mt-6 space-y-2">
              <SheetFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </SheetFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => { setDeleteId(editing!.id); setEditing(null) }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar gasto
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* AlertDialog eliminar */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null) }}
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
