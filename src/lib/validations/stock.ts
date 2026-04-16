import { z } from 'zod'

export const updateStockSchema = z.object({
  product_id: z.string().uuid('product_id inválido'),
  quantity: z.number().int().min(0, 'El stock no puede ser negativo'),
  reason: z.string().max(200).optional(),
})

export type UpdateStockInput = z.infer<typeof updateStockSchema>

export const listStockSchema = z.object({
  low_stock_only: z.boolean().optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
})

export type ListStockInput = z.infer<typeof listStockSchema>
