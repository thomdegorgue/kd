'use client'

import { useState } from 'react'
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
import { EntityToolbar } from '@/components/shared/entity-toolbar'
import { usePayments } from '@/lib/hooks/use-payments'
import { useCurrency } from '@/lib/hooks/use-currency'
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/validations/payment'
import type { PaymentMethod, PaymentStatus } from '@/lib/types'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
  refunded: 'outline',
}

export default function PaymentsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePayments({ page, pageSize: 50 })
  const { formatPrice } = useCurrency()

  const payments = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pagos</h2>
        <p className="text-sm text-muted-foreground">{total} registros</p>
      </div>

      <EntityToolbar
        placeholder="Buscar pagos..."
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        filterPreset="ventas"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No hay pagos registrados.
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const payment = p as unknown as {
                    id: string
                    order_id: string
                    method: PaymentMethod
                    status: PaymentStatus
                    amount: number
                    date: string
                    notes: string | null
                  }
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.order_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[payment.status] ?? 'outline'}>
                          {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatPrice(payment.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
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
    </div>
  )
}
