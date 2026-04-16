import { z } from 'zod'

export const createFinanceEntrySchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().int().min(1, 'El monto debe ser mayor a 0'),
  description: z.string().min(1, 'La descripción es obligatoria').max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  category: z.string().max(100).optional(),
})

export type CreateFinanceEntryInput = z.infer<typeof createFinanceEntrySchema>

export const updateFinanceEntrySchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['income', 'expense']).optional(),
  amount: z.number().int().min(1).optional(),
  description: z.string().min(1).max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().max(100).nullable().optional(),
})

export type UpdateFinanceEntryInput = z.infer<typeof updateFinanceEntrySchema>

export const FINANCE_TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
}
