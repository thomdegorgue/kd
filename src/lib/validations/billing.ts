import { z } from 'zod'
import { PRO_MODULES } from '@/lib/billing/calculator'
import { PACKS } from '@/lib/billing/packs'
import type { PackId } from '@/lib/billing/packs'

export const createSubscriptionSchema = z.object({
  tier: z
    .number()
    .int()
    .min(100, 'El tier mínimo es 100 productos')
    .max(10000, 'El tier máximo es 10000 productos')
    .refine((n) => n % 100 === 0, 'El tier debe ser múltiplo de 100'),
  pro_modules: z
    .array(z.enum(PRO_MODULES as unknown as [string, ...string[]]))
    .default([]),
})

export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const changeTierSchema = z.object({
  new_tier: z
    .number()
    .int()
    .min(100, 'El tier mínimo es 100 productos')
    .max(10000, 'El tier máximo es 10000 productos')
    .refine((n) => n % 100 === 0, 'El tier debe ser múltiplo de 100'),
})

export const togglePackSchema = z.object({
  pack_id: z.enum(PACKS.map(p => p.id) as [PackId, ...PackId[]]),
  enabled: z.boolean(),
})

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>
export type ChangeTierInput = z.infer<typeof changeTierSchema>
export type TogglePackInput = z.infer<typeof togglePackSchema>
