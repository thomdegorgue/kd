'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Receipt } from 'lucide-react'
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
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import {
  useExpenses,
  useExpensesSummary,
  useCreateExpense,
  useDeleteExpense,
} from '@/lib/hooks/use-expenses'
import { z } from 'zod'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from '@/lib/validations/expense'
import { useCurrency } from '@/lib/hooks/use-currency'

const expenseFormSchema = z.object({
  amount_pesos: z.number().min(0.01, 'Monto requerido'),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, 'Requerido').max(200),
  date: z.string().min(1),
  receipt_url: z.string().url().optional(),
})
type ExpenseFormInput = z.infer<typeof expenseFormSchema>

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

export default function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(lastOfMonth)

  const { data, isLoading } = useExpenses({
    category: categoryFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  })
  const { data: summary } = useExpensesSummary(dateFrom, dateTo)
  const createMutation = useCreateExpense()
  const deleteMutation = useDeleteExpense()
  const { formatPrice } = useCurrency()

  const expenses = data?.items ?? []
  const total = data?.total ?? 0

  const filtered = useMemo(() => {
    if (!search.trim()) return expenses
    const q = search.toLowerCase()
    return (expenses as Record<string, unknown>[]).filter((e) => {
      const desc = String(e.description ?? '').toLowerCase()
      const cat = String(e.category ?? '').toLowerCase()
      return desc.includes(q) || cat.includes(q)
    })
  }, [expenses, search])

  const form = useForm<ExpenseFormInput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: 'other',
      description: '',
      date: today.toISOString().slice(0, 10),
    },
  })

  async function onSubmit(data: ExpenseFormInput) {
    await createMutation.mutateAsync({
      amount: Math.round(data.amount_pesos * 100),
      category: data.category,
      description: data.description,
      date: data.date,
      receipt_url: data.receipt_url,
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
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Gastos</h2>
              <p className="text-xs text-muted-foreground mt-1">{total} registros</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo gasto
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <EntityToolbar
          placeholder="Buscar gastos..."
          searchValue={search}
          onSearchChange={setSearch}
          filterPreset="finanzas"
        />
      </div>

      <div className="px-4 sm:px-6 space-y-6">
        {/* Date range filter */}
        <div className="flex gap-2 flex-wrap items-end">
          <div className="space-y-1">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total del mes</p>
              <p className="text-xl font-bold text-destructive tabular-nums">{formatPrice(summary.total)}</p>
            </CardContent>
          </Card>
        )}

        {/* Category breakdown */}
        {summary && Object.keys(summary.by_category).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(summary.by_category)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([cat, amount]) => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {EXPENSE_CATEGORY_LABELS[cat] ?? cat}: {formatPrice(amount as number)}
                </Badge>
              ))}
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-1 flex-wrap">
          <Button variant={categoryFilter === '' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter('')}>
            Todos
          </Button>
          {EXPENSE_CATEGORIES.map((c) => (
            <Button
              key={c}
              variant={categoryFilter === c ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(c)}
            >
              {EXPENSE_CATEGORY_LABELS[c]}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No hay gastos para el período.
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
              {(filtered as Record<string, unknown>[]).map((e) => (
                <div key={e.id as string} className="p-4 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{e.description as string}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {EXPENSE_CATEGORY_LABELS[e.category as string] ?? (e.category as string)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(e.date as string).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-sm tabular-nums font-semibold text-destructive">
                      -{formatPrice(e.amount as number)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(e.id as string)}
                      aria-label={`Eliminar gasto ${e.description}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet: table */}
            <div className="hidden sm:block border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Descripción</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(filtered as Record<string, unknown>[]).map((e) => (
                    <TableRow key={e.id as string} className="hover:bg-muted/50">
                      <TableCell className="text-sm">{e.description as string}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {EXPENSE_CATEGORY_LABELS[e.category as string] ?? e.category as string}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(e.date as string).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-destructive">
                        -{formatPrice(e.amount as number)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(e.id as string)}
                          aria-label={`Eliminar gasto ${e.description}`}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Sheet para crear gasto */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Nuevo gasto
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="py-4 space-y-6">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) => form.setValue('category', v as typeof EXPENSE_CATEGORIES[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</SelectItem>
                  ))}
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
              <Input id="amount_pesos" type="number" step="0.01" min={0.01} {...form.register('amount_pesos', { valueAsNumber: true })} />
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
    </div>
  )
}
