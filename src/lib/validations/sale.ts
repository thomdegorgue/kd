import { z } from 'zod'

export const saleItemSchema = z.object({
  product_id: z.string().uuid('product_id inválido'),
  variant_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1, 'La cantidad debe ser mayor a 0'),
  price_at_sale: z.number().int().min(0, 'El precio no puede ser negativo'),
  name_snapshot: z.string().min(1, 'Falta el nombre del producto'),
})

export type SaleItemInput = z.infer<typeof saleItemSchema>

export const salePaymentMethodSchema = z.enum([
  'cash',
  'transfer',
  'mp_link',
  'savings',
  'card',
  'other',
])

export type SalePaymentMethod = z.infer<typeof salePaymentMethodSchema>

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Agregá al menos un producto'),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().min(1).max(120).optional(),
  customer_phone: z.string().max(40).optional(),
  payment_method: salePaymentMethodSchema,
  payment_amount: z.number().int().min(0),
  savings_account_id: z.string().uuid().optional(),
  discount_amount: z.number().int().min(0).optional().default(0),
  shipping_method_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
})

export type CreateSaleInput = z.infer<typeof createSaleSchema>
