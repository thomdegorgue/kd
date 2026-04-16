'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrderStatusBadge } from '@/components/admin/order-status-badge'
import { useCustomer } from '@/lib/hooks/use-customers'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { OrderStatus } from '@/lib/types'

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const { data: customer, isLoading } = useCustomer(params.id)
  const { formatPrice } = useCurrency()

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Cliente no encontrado.</p>
      </div>
    )
  }

  const c = customer as unknown as {
    id: string
    name: string
    phone: string | null
    email: string | null
    created_at: string
    orders: { id: string; status: OrderStatus; total: number; created_at: string }[]
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className={buttonVariants({ variant: 'ghost', size: 'icon' }) + ' h-8 w-8'}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold">{c.name}</h2>
          <p className="text-sm text-muted-foreground">
            Cliente desde {new Date(c.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teléfono</span>
              <span>{c.phone ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{c.email ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pedidos</span>
              <span>{c.orders.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {c.orders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Historial de pedidos</h3>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {c.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs hover:underline">
                        {order.id.slice(0, 8)}...
                      </Link>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPrice(order.total)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
