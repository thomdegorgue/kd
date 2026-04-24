import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(200),
  price: z.number().int().min(0, 'El precio debe ser mayor o igual a 0'),
  compare_price: z.number().int().min(0).optional().nullable(),
  description: z.string().max(2000).optional(),
  image_url: z.string().url().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  category_ids: z.array(z.string().uuid()).optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  price: z.number().int().min(0).optional(),
  compare_price: z.number().int().min(0).nullable().optional(),
  description: z.string().max(2000).optional(),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  category_ids: z.array(z.string().uuid()).optional(),
})

export type UpdateProductInput = z.infer<typeof updateProductSchema>

export const reorderProductsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export type ReorderProductsInput = z.infer<typeof reorderProductsSchema>
