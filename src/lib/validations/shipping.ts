import { z } from 'zod'

export const createShippingMethodSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  price: z.number().int().min(0, 'El precio debe ser >= 0'),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
})

export type CreateShippingMethodInput = z.infer<typeof createShippingMethodSchema>

export const updateShippingMethodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  price: z.number().int().min(0).optional(),
  description: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
})

export type UpdateShippingMethodInput = z.infer<typeof updateShippingMethodSchema>

export const createShipmentSchema = z.object({
  order_id: z.string().uuid('order_id inválido'),
  shipping_method_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>

export const updateShipmentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['preparing', 'in_transit', 'delivered', 'cancelled']),
  notes: z.string().max(500).optional(),
})

export type UpdateShipmentStatusInput = z.infer<typeof updateShipmentStatusSchema>

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  preparing: 'Preparando',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}
