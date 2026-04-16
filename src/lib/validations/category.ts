import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  description: z.string().max(500).optional(),
  image_url: z.string().url().optional(),
  is_active: z.boolean().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>

export const updateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
})

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>
