import { headers } from 'next/headers'
import type { StoreContext } from '@/lib/types'

/**
 * Lee el StoreContext inyectado por el middleware en los headers del request.
 * Solo usar en Server Components y Server Actions dentro de rutas /admin/*.
 * Lanza si no hay contexto (ruta no protegida o sin tienda).
 */
export async function getStoreContext(): Promise<StoreContext> {
  const headerStore = await headers()

  const raw = headerStore.get('x-store-context')
  if (!raw) {
    throw new Error('StoreContext no disponible. ¿Estás en una ruta /admin/* autenticada?')
  }

  return JSON.parse(raw) as StoreContext
}

/**
 * Versión que retorna null si no hay contexto, en lugar de lanzar.
 */
export async function getStoreContextOrNull(): Promise<StoreContext | null> {
  try {
    return await getStoreContext()
  } catch {
    return null
  }
}
