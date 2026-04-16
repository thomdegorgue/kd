'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import { useOrder, useUpdateOrderStatus, useCancelOrder } from '@/lib/hooks/use-orders'
import { z } from 'zod'
import { usePayments, useCreatePayment } from '@/lib/hooks/use-payments'
import { useCurrency } from '@/lib/hooks/use-currency'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { PAYMENT_METHOD_LABELS } from '@/lib/validations/payment'
import type { OrderStatus, PaymentMethod } from '@/lib/types'

const paymentFormSchema = z.object({
  amount_pesos: z.number().min(0.01, 'Monto requerido'),
  method: z.enum(['cash', 'transfer', 'card', 'mp', 'other']),
})
type PaymentFormInput = z.infer<typeof paymentFormSchema>

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const NEXT_STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmar',
  preparing: 'Preparar',
  delivered: 'Marcar entregado',
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const { modules } = useAdminContext()
  const { data: order, isLoading } = useOrder(params.id)
  const updateStatusMutation = useUpdateOrderStatus()
  const cancelMutation = useCancelOrder()
  const { formatPrice } = useCurrency()
  const [showAddPayment, setShowAddPayment] = useState(false)

  const paymentsEnabled = modules.payments === true
  const { data: paymentsData } = usePayments(
    paymentsEnabled ? { order_id: params.id } : undefined
  )
  const createPaymentMutation = useCreatePayment()

  const payments = (paymentsData?.items ?? []) as unknown as {
    id: string
    method: PaymentMethod
    amount: number
    date: string
    status: string
  }[]
  const totalPaid = payments
    .filter((p) => p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0)

  const paymentForm = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      method: 'cash',
    },
  })

  async function onAddPayment(data: PaymentFormInput) {
    await createPaymentMutation.mutateAsync({
      order_id: params.id,
      method: data.method,
      amount: Math.round(data.amount_pesos * 100),
      date: new Date().toISOString(),
    })
    paymentForm.reset()
    setShowAddPayment(false)
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Pedido no encontrado.</p>
      </div>
    )
  }

  const o = order as unknown as {
    id: string
    status: OrderStatus
    total: number
    notes: string | null
    created_at: string
    customer: { id: string; name: string; phone: string | null; email: string | null } | null
    items: { id: string; product_name: string; quantity: number; unit_price: number }[]
  }

  const nextStatuses = (VALID_TRANSITIONS[o.status] ?? []).filter((s) => s !== 'cancelled')
  const canCancel = VALID_TRANSITIONS[o.status]?.includes('cancelled')

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/orders" className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' h-8 w-8'}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Pedido #{o.id.slice(0, 8)}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(o.created_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <OrderStatusBadge status={o.status} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {nextStatuses.map((status) => (
          <Button
            key={status}
            size="sm"
            disabled={updateStatusMutation.isPending}
            onClick={() => updateStatusMutation.mutate({ id: o.id, status })}
          >
            {NEXT_STATUS_LABEL[status] ?? status}
          </Button>
        ))}

        {canCancel && (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="outline" size="sm" />}
            >
              Cancelar pedido
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar pedido</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => cancelMutation.mutate({ id: o.id })}
                >
                  Cancelar pedido
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Productos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-center">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.product_name}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(item.unit_price)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatPrice(item.unit_price * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <div className="flex justify-between px-4 py-3">
              <span className="text-sm font-medium">Total</span>
              <span className="font-bold tabular-nums">{formatPrice(o.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Customer, Notes & Payments */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              {o.customer ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{o.customer.name}</p>
                  {o.customer.phone && <p className="text-muted-foreground">{o.customer.phone}</p>}
                  {o.customer.email && <p className="text-muted-foreground">{o.customer.email}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin cliente asociado</p>
              )}
            </CardContent>
          </Card>

          {o.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{o.notes}</p>
              </CardContent>
            </Card>
          )}

          {paymentsEnabled && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Cobros</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowAddPayment(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar cobro
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 pb-4">Sin cobros registrados.</p>
                ) : (
                  <>
                    <Table>
                      <TableBody>
                        {payments.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(p.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {formatPrice(p.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Separator />
                    <div className="flex justify-between px-4 py-3 text-sm">
                      <span className="text-muted-foreground">Cobrado</span>
                      <span className={`font-bold tabular-nums ${totalPaid >= o.total ? 'text-green-600' : 'text-destructive'}`}>
                        {formatPrice(totalPaid)}
                      </span>
                    </div>
                    {totalPaid < o.total && (
                      <div className="px-4 pb-3">
                        <Badge variant="destructive" className="text-xs">
                          Pendiente: {formatPrice(o.total - totalPaid)}
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add payment dialog */}
      <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
          </DialogHeader>
          <form onSubmit={paymentForm.handleSubmit(onAddPayment)} className="space-y-4">
            <div className="space-y-1">
              <Label>Método de cobro</Label>
              <Select
                value={paymentForm.watch('method')}
                onValueChange={(v) => paymentForm.setValue('method', v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount_pesos">Monto ($)</Label>
              <Input
                id="amount_pesos"
                type="number"
                step="0.01"
                min={0.01}
                defaultValue={(o.total ?? 0) / 100}
                {...paymentForm.register('amount_pesos', { valueAsNumber: true })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddPayment(false)}>Cancelar</Button>
              <Button type="submit" disabled={createPaymentMutation.isPending}>
                {createPaymentMutation.isPending ? 'Registrando...' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
