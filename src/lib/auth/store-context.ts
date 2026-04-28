import { headers } from 'next/headers'
import type { StoreContext } from '@/lib/types'

/**
 * Lee el StoreContext inyectado por el middleware en los headers del request.
 * Solo usar en Server Components y Server Actions dentro de rutas /admin/*.
 * Lanza si no hay contexto (ruta no protegida o sin tienda).
 */
export async function getStoreContext(): Promise<StoreContext> {
  let headerStore: Awaited<ReturnType<typeof headers>>
  try {
    headerStore = await headers()
  } catch (err) {
    const m = err instanceof Error ? err.message : 'Error leyendo headers'
    throw new Error(`StoreContext no disponible (${m})`)
  }

  const raw = headerStore.get('x-store-context')
  if (!raw) {
    throw new Error('StoreContext no disponible. ¿Estás en una ruta /admin/* autenticada?')
  }

  try {
    return JSON.parse(raw) as StoreContext
  } catch {
    throw new Error('StoreContext inválido: el header x-store-context no es JSON válido')
  }
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
