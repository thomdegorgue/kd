import { notFound } from 'next/navigation'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { CheckCircle2, Circle, XCircle, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const revalidate = 10

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'delivered'] as const
const STATUS_LABELS: Record<string, string> = {
  pending: 'Recibido',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(cents / 100)
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { orderId } = await params
  return { title: `Seguimiento de pedido #${orderId.slice(0, 8).toUpperCase()}` }
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ slug: string; orderId: string }>
}) {
  const { slug, orderId } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseServiceRole as any

  const { data: store } = await db
    .from('stores')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!store) notFound()

  const { data: order } = await db
    .from('orders')
    .select('id, status, total, created_at, notes, customer:customers(name), items:order_items(product_name, quantity, unit_price)')
    .eq('id', orderId)
    .eq('store_id', store.id)
    .single()

  if (!order) notFound()

  const status: string = order.status
  const isCancelled = status === 'cancelled'
  const currentIdx = STATUS_FLOW.indexOf(status as typeof STATUS_FLOW[number])
  const customerName = (order.customer as { name: string } | null)?.name
  const items = (order.items ?? []) as { product_name: string; quantity: number; unit_price: number }[]
  const orderId8 = String(order.id).slice(0, 8).toUpperCase()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center mb-3">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">{store.name}</p>
          <h1 className="text-lg font-semibold">Pedido #{orderId8}</h1>
          {customerName && (
            <p className="text-sm text-muted-foreground">Hola, {customerName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Status */}
        <div className="rounded-xl border bg-card p-4">
          {isCancelled ? (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Pedido cancelado</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {STATUS_FLOW.map((s, idx) => {
                const isPast = idx <= currentIdx
                const isCurrent = idx === currentIdx
                return (
                  <div key={s} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1 min-w-0">
                      {isPast ? (
                        <CheckCircle2 className={`h-4 w-4 shrink-0 ${isCurrent ? 'text-primary' : 'text-primary/50'}`} />
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                      )}
                      <span className={`text-[10px] text-center leading-tight truncate w-full ${isCurrent ? 'text-primary font-medium' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                        {STATUS_LABELS[s]}
                      </span>
                    </div>
                    {idx < STATUS_FLOW.length - 1 && (
                      <div className={`h-px flex-1 mx-1 mb-4 shrink-0 ${idx < currentIdx ? 'bg-primary/50' : 'bg-muted'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-3 flex justify-center">
            <Badge variant={isCancelled ? 'destructive' : 'default'}>
              {STATUS_LABELS[status] ?? status}
            </Badge>
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="rounded-xl border bg-card divide-y">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                </div>
                <span className="tabular-nums font-medium ml-3">{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between px-4 py-3 font-semibold text-sm">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </div>
        )}

        {order.notes && (
          <p className="text-xs text-muted-foreground text-center">Nota: {order.notes}</p>
        )}
      </div>
    </div>
  )
}
