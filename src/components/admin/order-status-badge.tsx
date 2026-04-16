'use client'

import { Badge } from '@/components/ui/badge'
import type { OrderStatus } from '@/lib/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  preparing: { label: 'Preparando', variant: 'secondary' },
  delivered: { label: 'Entregado', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export const ORDER_STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
]
