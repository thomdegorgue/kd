import { z } from 'zod'

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1),
  unit_price: z.number().int().min(0),
  product_name: z.string().min(1),
})

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'El pedido debe tener al menos un producto'),
  customer: z
    .object({
      name: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
  notes: z.string().max(1000).optional(),
  total: z.number().int().min(0),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const updateOrderStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'preparing', 'delivered', 'cancelled']),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

export const cancelOrderSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
