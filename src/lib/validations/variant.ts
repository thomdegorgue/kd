import { z } from 'zod'

export const createVariantAttributeSchema = z.object({
  product_id: z.string().uuid('product_id inválido'),
  name: z.string().min(1, 'El nombre del atributo es obligatorio').max(50),
  values: z.array(z.string().min(1).max(50)).min(1, 'Debe tener al menos un valor'),
})

export type CreateVariantAttributeInput = z.infer<typeof createVariantAttributeSchema>

export const createVariantSchema = z.object({
  product_id: z.string().uuid('product_id inválido'),
  sku: z.string().max(100).optional(),
  price_override: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
  attribute_value_ids: z.array(z.string().uuid()).min(1, 'Debe tener al menos un valor de atributo'),
})

export type CreateVariantInput = z.infer<typeof createVariantSchema>

export const updateVariantSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().max(100).nullable().optional(),
  price_override: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().optional(),
})

export type UpdateVariantInput = z.infer<typeof updateVariantSchema>
