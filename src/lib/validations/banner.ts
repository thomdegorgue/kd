import { z } from 'zod'

export const createBannerSchema = z.object({
  image_url: z.string().url('URL de imagen inválida'),
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  link_url: z.string().url().optional().or(z.literal('')),
  is_active: z.boolean().optional().default(true),
})

export type CreateBannerInput = z.infer<typeof createBannerSchema>

export const updateBannerSchema = z.object({
  id: z.string().uuid(),
  image_url: z.string().url().optional(),
  title: z.string().max(100).nullable().optional(),
  subtitle: z.string().max(200).nullable().optional(),
  link_url: z.string().url().nullable().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
})

export type UpdateBannerInput = z.infer<typeof updateBannerSchema>

export const reorderBannersSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export type ReorderBannersInput = z.infer<typeof reorderBannersSchema>
