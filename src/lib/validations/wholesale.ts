import { z } from 'zod'

export const setWholesalePriceSchema = z.object({
  product_id: z.string().uuid('product_id inválido'),
  price: z.number().int().min(1, 'El precio mayorista debe ser mayor a 0'),
  min_quantity: z.number().int().min(1).optional(),
})

export type SetWholesalePriceInput = z.infer<typeof setWholesalePriceSchema>
