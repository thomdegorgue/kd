'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Plus, ShoppingCart } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
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
import dynamic from 'next/dynamic'

const OrderSheet = dynamic(
  () => import('@/components/admin/order-sheet').then((m) => ({ default: m.OrderSheet })),
  { ssr: false },
)
import { useOrders } from '@/lib/hooks/use-orders'
import { useCurrency } from '@/lib/hooks/use-currency'
import { useDebounce } from '@/lib/hooks/use-debounce'
import type { OrderStatus } from '@/lib/types'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useOrders(
    { page, pageSize: 50, status: statusFilter || undefined, search: debouncedSearch || undefined },
    { pollingMs: 30_000 },
  )
  const { formatPrice } = useCurrency()

  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  // Notify on new orders since last poll
  const prevTotalRef = useRef<number | null>(null)
  useEffect(() => {
    if (total === 0 || isLoading) return
    if (prevTotalRef.current !== null && total > prevTotalRef.current && page === 1 && !statusFilter && !debouncedSearch) {
      const diff = total - prevTotalRef.current
      toast.info(`${diff} nuevo${diff > 1 ? 's' : ''} pedido${diff > 1 ? 's' : ''}`, {
        description: 'Revisar la lista de pedidos.',
      })
    }
    prevTotalRef.current = total
  }, [total, isLoading, page, statusFilter, debouncedSearch])

  function openOrder(id: string) {
    setSelectedOrderId(id)
    setSheetOpen(true)
  }

  const urlEdit = searchParams.get('edit')
  const urlNew = searchParams.get('new')

  // Abrir el sheet desde la URL sin setState dentro de useEffect.
  // Si hay parámetros `?edit=` o `?new=1`, el estado se deriva en el render.
  const requestedSheetOpen = Boolean(urlEdit) || urlNew === '1'
  const requestedOrderId = urlEdit ?? null

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pedidos</h2>
          <p className="text-sm text-muted-foreground">{total} pedidos</p>
        </div>
        <Link href="/admin/orders?new=1" className={buttonVariants({ size: 'sm' })}>
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
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              {statusFilter ? 'No hay pedidos con ese estado' : 'Todavía no recibiste pedidos'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {statusFilter ? 'Probá con otro filtro.' : 'Los pedidos de tu catálogo aparecerán acá.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="grid gap-3 sm:hidden">
            {orders.map((order) => {
              const o = order as unknown as {
                id: string
                status: OrderStatus
                total: number
                created_at: string
                customer: { id: string; name: string; phone: string | null } | null
              }
              return (
                <Card key={o.id} className="cursor-pointer" onClick={() => openOrder(o.id)}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-muted-foreground">
                          #{o.id.slice(0, 8)}
                        </p>
                        <p className="text-sm font-medium truncate">
                          {o.customer?.name ?? 'Sin cliente'}
                        </p>
                      </div>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className="font-semibold tabular-nums">{formatPrice(o.total)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop/tablet: table */}
          <div className="hidden sm:block border rounded-lg overflow-x-auto">
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
        id={requestedSheetOpen ? requestedOrderId : selectedOrderId}
        open={requestedSheetOpen ? true : sheetOpen}
        onOpenChange={(open) => {
          if (!requestedSheetOpen) setSheetOpen(open)
          if (!open) {
            const sp = new URLSearchParams(searchParams.toString())
            sp.delete('edit')
            sp.delete('new')
            const qs = sp.toString()
            router.replace(qs ? `/admin/orders?${qs}` : '/admin/orders')
          }
        }}
      />
    </div>
  )
}
