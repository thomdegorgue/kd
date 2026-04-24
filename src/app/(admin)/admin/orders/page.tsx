'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { OrderStatusBadge, ORDER_STATUS_OPTIONS } from '@/components/admin/order-status-badge'
import { OrderSheet } from '@/components/admin/order-sheet'
import { useOrders } from '@/lib/hooks/use-orders'
import { useCurrency } from '@/lib/hooks/use-currency'
import type { OrderStatus } from '@/lib/types'
import Link from 'next/link'

export default function OrdersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data, isLoading } = useOrders({
    page,
    pageSize: 50,
    status: statusFilter || undefined,
  })
  const { formatPrice } = useCurrency()

  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  function openOrder(id: string) {
    setSelectedOrderId(id)
    setSheetOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <p className="text-sm text-muted-foreground">{total} pedidos</p>
        </div>
        <Link href="/admin/orders/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="h-4 w-4 mr-1" />
          Nuevo
        </Link>
      </div>

      <EntityToolbar
        placeholder="Buscar pedidos..."
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        filterPreset="pedidos"
      />

      {/* Status tabs */}
      <div className="flex gap-1 flex-wrap">
        <Button
          variant={statusFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setStatusFilter(''); setPage(1) }}
        >
          Todos
        </Button>
        {ORDER_STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setStatusFilter(opt.value); setPage(1) }}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {statusFilter ? 'No hay pedidos con ese estado.' : 'Aún no tenés pedidos.'}
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const o = order as unknown as {
                    id: string
                    status: OrderStatus
                    total: number
                    created_at: string
                    customer: { id: string; name: string; phone: string | null } | null
                  }
                  return (
                    <TableRow
                      key={o.id}
                      className="cursor-pointer"
                      onClick={() => openOrder(o.id)}
                    >
                      <TableCell>
                        <span className="font-medium font-mono text-xs">{o.id.slice(0, 8)}...</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {o.customer?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={o.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPrice(o.total)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      <OrderSheet
        id={selectedOrderId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
