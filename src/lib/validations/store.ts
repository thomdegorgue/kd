import { z } from 'zod'

export const updateStoreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  whatsapp: z
    .string()
    .regex(/^\d{10,15}$/, 'WhatsApp debe ser solo números (10-15 dígitos, sin +)')
    .optional(),
  logo_url: z.string().url().optional(),
  cover_url: z.string().url().optional(),
})

export type UpdateStoreInput = z.infer<typeof updateStoreSchema>

export const updateStoreConfigSchema = z.object({
  primary_color: z.string().optional(),
  secondary_color: z.string().optional(),
  font: z.string().optional(),
  show_prices: z.boolean().optional(),
  currency: z.string().optional(),
  city: z.string().nullable().optional(),
  hours: z.string().nullable().optional(),
  social: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      tiktok: z.string().optional(),
      twitter: z.string().optional(),
    })
    .optional(),
})
