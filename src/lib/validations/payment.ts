import { z } from 'zod'

export const createPaymentSchema = z.object({
  order_id: z.string().uuid('order_id inválido'),
  amount: z.number().int().min(1, 'El monto debe ser mayor a 0'),
  method: z.enum(['cash', 'transfer', 'card', 'mp', 'other']),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>

export const updatePaymentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected', 'refunded']),
})

export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mp: 'Mercado Pago',
  other: 'Otro',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  refunded: 'Devuelto',
}
