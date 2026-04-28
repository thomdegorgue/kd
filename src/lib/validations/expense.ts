import { z } from 'zod'

export const EXPENSE_CATEGORIES = [
  'supplies',
  'rent',
  'services',
  'marketing',
  'equipment',
  'salary',
  'other',
] as const

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  supplies: 'Insumos',
  rent: 'Alquiler',
  services: 'Servicios',
  marketing: 'Marketing',
  equipment: 'Equipamiento',
  salary: 'Salarios',
  other: 'Otro',
}

export const RECURRENCE_PERIODS = ['monthly', 'weekly', 'annual'] as const
export type RecurrencePeriod = typeof RECURRENCE_PERIODS[number]

export const RECURRENCE_PERIOD_LABELS: Record<RecurrencePeriod, string> = {
  monthly: 'Mensual',
  weekly: 'Semanal',
  annual: 'Anual',
}

export const createExpenseSchema = z.object({
  amount: z.number().int().min(1, 'El monto debe ser mayor a 0'),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, 'La descripción es obligatoria').max(200),
  supplier: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  receipt_url: z.string().url().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_period: z.enum(RECURRENCE_PERIODS).optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

export const updateExpenseSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().int().min(1).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  description: z.string().min(1).max(200).optional(),
  supplier: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  receipt_url: z.string().url().nullable().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_period: z.enum(RECURRENCE_PERIODS).nullable().optional(),
})

export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
