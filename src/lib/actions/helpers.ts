'use server'

import { getStoreContext } from '@/lib/auth/store-context'
import { executor } from '@/lib/executor'
import type { ActionResult } from '@/lib/types'

/**
 * Ejecuta una acción del executor con el contexto de la tienda actual.
 * Uso en server actions: `return executeAction<Product>('create_product', input)`
 */
export async function executeAction<T = unknown>(
  name: string,
  input: object = {}
): Promise<ActionResult<T>> {
  try {
    const ctx = await getStoreContext()
    return executor<T>({
      name,
      store_id: ctx.store_id,
      actor: { type: 'user', id: ctx.user_id },
      input,
      context: ctx,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return { success: false, error: { code: 'SYSTEM_ERROR', message } } as ActionResult<T>
  }
}
