'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  CreditCard,
  Plus,
  ChevronRight,
  Banknote,
  ArrowLeftRight,
  Smartphone,
  HelpCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { EmptyState } from '@/components/shared/empty-state'
import { PackInactiveWarning } from '@/components/shared/pack-inactive-warning'
import { usePayments, useCreatePayment } from '@/lib/hooks/use-payments'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { useCurrency } from '@/lib/hooks/use-currency'
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/validations/payment'
import type { PaymentMethod, PaymentStatus, ModuleName } from '@/lib/types'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
  refunded: 'outline',
}

const METHOD_ICON: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3.5 w-3.5" />,
  transfer: <ArrowLeftRight className="h-3.5 w-3.5" />,
  card: <CreditCard className="h-3.5 w-3.5" />,
  mp: <Smartphone className="h-3.5 w-3.5" />,
  other: <HelpCircle className="h-3.5 w-3.5" />,
}

type PaymentShape = {
  id: string
  order_id: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  date: string
  paid_at: string | null
  notes: string | null
}

type MethodFilter = PaymentMethod | 'all'

type ManualPaymentInput = {
  order_id: string
  amount_pesos: number
  method: PaymentMethod
  notes?: string
}

export default function PaymentsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all')
  const [selectedPayment, setSelectedPayment] = useState<PaymentShape | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { modules } = useAdminContext()
  const { data, isLoading } = usePayments({ page, pageSize: 50 })
  const createMutation = useCreatePayment()
  const { formatPrice } = useCurrency()

  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  const filtered = useMemo(() => {
    const payments = (data?.items ?? []) as unknown as PaymentShape[]
    return payments.filter((p) => {
      const matchesMethod = methodFilter === 'all' || p.method === methodFilter
      const matchesSearch = search.trim() === '' ||
        p.order_id.toLowerCase().includes(search.toLowerCase()) ||
        (p.notes ?? '').toLowerCase().includes(search.toLowerCase())
      return matchesMethod && matchesSearch
    })
  }, [data?.items, methodFilter, search])

  const form = useForm<ManualPaymentInput>({
    defaultValues: { method: 'cash' },
  })

  async function onCreateSubmit(data: ManualPaymentInput) {
    await createMutation.mutateAsync({
      order_id: data.order_id,
      amount: Math.round(data.amount_pesos * 100),
      method: data.method,
      notes: data.notes,
    })
    form.reset()
    setShowCreate(false)
  }

  const methods: { id: MethodFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'cash', label: 'Efectivo' },
    { id: 'transfer', label: 'Transferencia' },
    { id: 'card', label: 'Tarjeta' },
    { id: 'mp', label: 'Mercado Pago' },
    { id: 'other', label: 'Otro' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <h2 className="text-lg font-semibold leading-none">Pagos</h2>
              <p className="text-xs text-muted-foreground mt-1">{total} registros</p>
            </div>
          </div>
          <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Registrar pago</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>

        <PackInactiveWarning
          requiredModule={'payments' as ModuleName}
          activeModules={modules as Record<ModuleName, boolean>}
        />
      </div>

      <div className="px-4 sm:px-6 space-y-3">
        <EntityToolbar
          placeholder="Buscar por pedido..."
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1) }}
          filterPreset="ventas"
        />
        {/* Method filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setMethodFilter(m.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                methodFilter === m.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border bg-background hover:bg-muted'
              }`}
            >
              {m.id !== 'all' && METHOD_ICON[m.id]}
              {m.label}
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
            icon={<CreditCard className="h-12 w-12" />}
            title="Sin pagos"
            description={methodFilter !== 'all' ? 'No hay pagos con ese método.' : 'No hay pagos registrados todavía.'}
            action={
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar pago
              </Button>
            }
          />
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-border/60 rounded-xl border overflow-hidden bg-card">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  className="p-4 flex items-center gap-3 w-full text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setSelectedPayment(p)}
                >
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    {METHOD_ICON[p.method]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                      </p>
                      <Badge variant={STATUS_VARIANT[p.status] ?? 'outline'} className="text-[10px]">
                        {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pedido {p.order_id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatPrice(p.amount)}</p>
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
                    <TableHead>Pedido</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="hidden md:table-cell">Fecha</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow
                      key={p.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedPayment(p)}
                    >
                      <TableCell className="font-mono text-xs">
                        {p.order_id.slice(0, 8)}…
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm">
                          {METHOD_ICON[p.method]}
                          {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status] ?? 'outline'}>
                          {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatPrice(p.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                        {p.paid_at
                          ? new Date(p.paid_at).toLocaleDateString('es-AR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })
                          : '—'
                        }
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sheet detalle pago */}
      <Sheet open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Detalle del pago
            </SheetTitle>
          </SheetHeader>
          {selectedPayment && (
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Método</p>
                    <span className="flex items-center gap-1.5 text-sm font-medium mt-1">
                      {METHOD_ICON[selectedPayment.method]}
                      {PAYMENT_METHOD_LABELS[selectedPayment.method] ?? selectedPayment.method}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Estado</p>
                    <div className="mt-1">
                      <Badge variant={STATUS_VARIANT[selectedPayment.status] ?? 'outline'}>
                        {PAYMENT_STATUS_LABELS[selectedPayment.status] ?? selectedPayment.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="text-2xl font-bold tabular-nums mt-0.5">{formatPrice(selectedPayment.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pedido</p>
                  <p className="text-sm font-mono mt-0.5">{selectedPayment.order_id}</p>
                </div>
                {selectedPayment.paid_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de pago</p>
                    <p className="text-sm mt-0.5">
                      {new Date(selectedPayment.paid_at).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
                {selectedPayment.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Notas</p>
                    <p className="text-sm mt-0.5">{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet registrar pago manual */}
      <Sheet open={showCreate} onOpenChange={setShowCreate}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-muted-foreground" />
              Registrar pago
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onCreateSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="order_id">ID de pedido</Label>
                <Input
                  id="order_id"
                  className="h-8"
                  placeholder="UUID del pedido"
                  {...form.register('order_id')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount_pesos">Monto ($)</Label>
                <Input
                  id="amount_pesos"
                  type="number"
                  step="0.01"
                  min={0.01}
                  className="h-8"
                  {...form.register('amount_pesos', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Select
                  value={form.watch('method')}
                  onValueChange={(v) => form.setValue('method', v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['cash', 'transfer', 'card', 'mp', 'other'] as PaymentMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        <span className="flex items-center gap-2">
                          {METHOD_ICON[m]}
                          {PAYMENT_METHOD_LABELS[m]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas <span className="text-muted-foreground">(opcional)</span></Label>
                <Input id="notes" className="h-8" {...form.register('notes')} />
              </div>
            </div>
            <div className="px-6 py-4 border-t shrink-0 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Registrando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
