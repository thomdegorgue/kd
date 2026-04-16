'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  useFinanceEntries,
  useFinanceSummary,
  useCreateFinanceEntry,
  useDeleteFinanceEntry,
} from '@/lib/hooks/use-finance'
import { z } from 'zod'
import { FINANCE_TYPE_LABELS } from '@/lib/validations/finance'
import { useCurrency } from '@/lib/hooks/use-currency'

const financeFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount_pesos: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  description: z.string().min(1, 'Requerido').max(200),
  date: z.string().min(1),
  category: z.string().optional(),
})
type FinanceFormInput = z.infer<typeof financeFormSchema>

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

export default function FinancePage() {
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | ''>('')
  const [showCreate, setShowCreate] = useState(false)
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(lastOfMonth)

  const { data, isLoading } = useFinanceEntries({
    type: typeFilter || undefined,
    date_from: dateFrom,
    date_to: dateTo,
  })
  const { data: summary } = useFinanceSummary(dateFrom, dateTo)
  const createMutation = useCreateFinanceEntry()
  const deleteMutation = useDeleteFinanceEntry()
  const { formatPrice } = useCurrency()

  const entries = data?.items ?? []
  const total = data?.total ?? 0

  const form = useForm<FinanceFormInput>({
    resolver: zodResolver(financeFormSchema),
    defaultValues: {
      type: 'income',
      description: '',
      date: today.toISOString().slice(0, 10),
    },
  })

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
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Finanzas</h2>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nueva entrada
        </Button>
      </div>

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

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="text-lg font-bold text-green-600 tabular-nums">{formatPrice(summary.total_income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Egresos</p>
              <p className="text-lg font-bold text-destructive tabular-nums">{formatPrice(summary.total_expense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Neto</p>
              <p className={`text-lg font-bold tabular-nums ${summary.net >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatPrice(summary.net)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Type filter */}
      <div className="flex gap-1">
        {(['', 'income', 'expense'] as const).map((t) => (
          <Button
            key={t}
            variant={typeFilter === t ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(t)}
          >
            {t === '' ? 'Todas' : FINANCE_TYPE_LABELS[t]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay entradas para el período seleccionado.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <p className="text-xs text-muted-foreground px-4 py-2">{total} entradas</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(entries as Record<string, unknown>[]).map((e) => (
                <TableRow key={e.id as string}>
                  <TableCell className="text-sm">{e.description as string}</TableCell>
                  <TableCell>
                    <Badge variant={e.type === 'income' ? 'default' : 'secondary'}>
                      {FINANCE_TYPE_LABELS[e.type as string] ?? e.type as string}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(e.date as string).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${e.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                    {e.type === 'income' ? '+' : '-'}{formatPrice(e.amount as number)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(e.id as string)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva entrada</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" {...form.register('description')} />
              {form.formState.errors.description && (
                <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount_pesos">Monto ($)</Label>
              <Input
                id="amount_pesos"
                type="number"
                step="0.01"
                min={0.01}
                {...form.register('amount_pesos', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" {...form.register('date')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
