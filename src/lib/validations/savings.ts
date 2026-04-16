import { z } from 'zod'

export const createSavingsAccountSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  description: z.string().max(300).optional(),
  target_amount: z.number().int().min(1).optional(),
})

export type CreateSavingsAccountInput = z.infer<typeof createSavingsAccountSchema>

export const updateSavingsAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).nullable().optional(),
  target_amount: z.number().int().min(1).nullable().optional(),
})

export type UpdateSavingsAccountInput = z.infer<typeof updateSavingsAccountSchema>

export const createSavingsMovementSchema = z.object({
  account_id: z.string().uuid('account_id inválido'),
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.number().int().min(1, 'El monto debe ser mayor a 0'),
  description: z.string().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)').optional(),
})

export type CreateSavingsMovementInput = z.infer<typeof createSavingsMovementSchema>
