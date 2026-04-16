import { z } from 'zod'
import type { ModuleName } from '@/lib/types'

const MODULE_NAMES: ModuleName[] = [
  'catalog', 'cart', 'products', 'categories', 'orders',
  'stock', 'payments', 'variants', 'wholesale', 'shipping',
  'finance', 'banners', 'social', 'product_page',
  'multiuser', 'custom_domain', 'tasks', 'savings_account',
  'expenses', 'assistant',
]

const CORE_MODULES: ModuleName[] = ['catalog', 'cart', 'products', 'categories', 'orders']

export { CORE_MODULES }

export const enableModuleSchema = z.object({
  module: z.string().refine(
    (val): val is ModuleName => MODULE_NAMES.includes(val as ModuleName),
    { message: 'Módulo no válido' }
  ),
})

export const disableModuleSchema = z.object({
  module: z.string().refine(
    (val): val is ModuleName =>
      MODULE_NAMES.includes(val as ModuleName) && !CORE_MODULES.includes(val as ModuleName),
    { message: 'No se puede desactivar un módulo core' }
  ),
})

export type EnableModuleInput = z.infer<typeof enableModuleSchema>
export type DisableModuleInput = z.infer<typeof disableModuleSchema>
