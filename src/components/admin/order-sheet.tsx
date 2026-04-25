'use client'

import { MessageCircle, CheckCircle2, Circle, XCircle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import { useOrder, useUpdateOrderStatus, useCancelOrder } from '@/lib/hooks/use-orders'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { OrderStatus } from '@/lib/types'

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'delivered']
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Recibido',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

function nextStatus(current: OrderStatus): OrderStatus | null {
  const idx = STATUS_FLOW.indexOf(current)
  if (idx === -1 || idx === STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[idx + 1]
}

type OrderSheetProps = {
  id: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderSheet({ id, open, onOpenChange }: OrderSheetProps) {
  const { data: order, isLoading } = useOrder(id ?? '')
  const updateStatus = useUpdateOrderStatus()
  const cancelMutation = useCancelOrder()
  const { formatPrice } = useCurrency()

  const status = order?.status as OrderStatus | undefined
  const items = (order?.items ?? []) as Array<{
    product_name: string
    quantity: number
    unit_price: number
  }>
  const customer = order?.customer as { id: string; name: string; phone: string | null; address?: string } | null | undefined
  const total = order?.total as number | undefined
  const createdAt = order?.created_at as string | undefined
  const notes = order?.notes as string | null | undefined

  const waLink = customer?.phone
    ? `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(customer.name)}%2C%20te%20escribimos%20sobre%20tu%20pedido.`
    : null

  const next = status ? nextStatus(status) : null
  const isCancelled = status === 'cancelled'
  const isDelivered = status === 'delivered'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <SheetTitle>Pedido</SheetTitle>
            {order && <span className="text-xs font-mono text-muted-foreground">{(order.id as string).slice(0, 8)}...</span>}
          </div>
          {createdAt && (
            <p className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </SheetHeader>

        {isLoading || !id ? (
          <div className="flex-1 p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Timeline */}
            {!isCancelled && (
              <div className="px-6 py-4 border-b">
                <div className="flex items-center gap-1">
                  {STATUS_FLOW.map((s, idx) => {
                    const currentIdx = status ? STATUS_FLOW.indexOf(status) : -1
                    const isPast = idx <= currentIdx
                    const isCurrent = idx === currentIdx
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1">
                          {isPast ? (
                            <CheckCircle2 className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-primary/50'}`} />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground/30" />
                          )}
                          <span className={`text-[10px] text-center leading-tight ${isCurrent ? 'text-primary font-medium' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                            {STATUS_LABELS[s]}
                          </span>
                        </div>
                        {idx < STATUS_FLOW.length - 1 && (
                          <div className={`h-px flex-1 mx-1 mb-4 ${idx < currentIdx ? 'bg-primary/50' : 'bg-muted'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="px-6 py-3 border-b flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Pedido cancelado</span>
              </div>
            )}

            {/* Estado actual + botón avanzar */}
            {status && (
              <div className="px-6 py-3 border-b flex items-center justify-between gap-3">
                <OrderStatusBadge status={status} />
                <div className="flex gap-2">
                  {next && (
                    <Button
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: id!, status: next })}
                    >
                      Marcar: {STATUS_LABELS[next]}
                    </Button>
                  )}
                  {!isCancelled && !isDelivered && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate({ id: id!, reason: 'Cancelado desde panel' })}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Productos</p>
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-md bg-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums font-medium shrink-0">
                    {formatPrice(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-sm">Total</span>
                <span className="tabular-nums">{total !== undefined ? formatPrice(total) : '—'}</span>
              </div>
              {notes && (
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground">Nota: {notes}</p>
                </div>
              )}
            </div>

            {/* Cliente */}
            {customer && (
              <>
                <Separator />
                <div className="px-6 py-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-medium">{customer.name}</p>
                  {customer.phone && (
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  )}
                  {customer.address && (
                    <p className="text-sm text-muted-foreground">{customer.address}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer actions */}
        {!isLoading && id && (
          <div className="px-6 py-4 border-t shrink-0 flex gap-2">
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                WhatsApp
              </a>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
