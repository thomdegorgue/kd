import { z } from 'zod'

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().int().min(0),
  quantity: z.number().int().min(1),
  imageUrl: z.string().url().nullable(),
  variantLabel: z.string().optional(),
})

export type CartItemInput = z.infer<typeof cartItemSchema>
