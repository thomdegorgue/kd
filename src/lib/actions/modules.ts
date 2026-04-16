'use server'

import { executeAction } from './helpers'
import type { ModuleName } from '@/lib/types'

export async function enableModule(module: ModuleName) {
  return executeAction<{ modules: Record<string, boolean> }>('enable_module', { module })
}

export async function disableModule(module: ModuleName) {
  return executeAction<{ modules: Record<string, boolean> }>('disable_module', { module })
}
