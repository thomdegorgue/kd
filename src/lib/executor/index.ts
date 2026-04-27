import { supabaseServiceRole } from '@/lib/supabase/service-role'
import type { ActionResult, ActorType, StoreContext, StoreStatus, StoreUserRole } from '@/lib/types'
import { getHandler } from './registry'

// ============================================================
// HELPERS INTERNOS
// ============================================================

function makeError(
  code: string,
  message: string,
  field?: string
): ActionResult<never> {
  return { success: false, error: { code, message, field } } as ActionResult<never>
}

// Statuses que permiten operaciones de escritura
const WRITE_ALLOWED: StoreStatus[] = ['demo', 'active']
// Statuses que permiten solo lectura (GET, LIST)
const READ_ONLY: StoreStatus[] = ['past_due']
// Nombres de acciones de solo lectura
const READ_ACTION_PREFIXES = ['get_', 'list_', '__test_']

function isReadAction(name: string): boolean {
  return READ_ACTION_PREFIXES.some((prefix) => name.startsWith(prefix))
}

// ============================================================
// EXECUTOR
// ============================================================

export type ExecutorParams = {
  name: string
  store_id: string | null
  actor: { type: ActorType; id: string | null }
  input: object
  /** Contexto ya resuelto (lo inyecta el middleware/server action) */
  context?: StoreContext
}

export async function executor<T = unknown>(
  params: ExecutorParams
): Promise<ActionResult<T>> {
  const { name, store_id, actor, input, context } = params

  // ──────────────────────────────────────────────
  // PASO 1 — Resolver handler
  // ──────────────────────────────────────────────
  const handler = getHandler(name)
  if (!handler) {
    return makeError('SYSTEM_ERROR', `Action '${name}' no encontrada en el registry`)
  }

  // ──────────────────────────────────────────────
  // PASO 2 — Validar store_id y estado de tienda
  // ──────────────────────────────────────────────

  // Operaciones globales de superadmin no requieren store_id
  const isGlobalSuperadmin = actor.type === 'superadmin' && store_id === null

  if (!isGlobalSuperadmin && !store_id) {
    return makeError('INVALID_INPUT', 'store_id requerido')
  }

  // Si tenemos contexto pre-resuelto (lo más común desde middleware), lo usamos.
  // Si no, necesitaríamos cargarlo desde DB — para F0 asumimos que siempre hay contexto.
  let storeContext: StoreContext | null = context ?? null

  if (store_id && !storeContext) {
    // En fases futuras: cargar store desde DB con service role
    // Por ahora retornamos error explícito para detectar usos incorrectos
    return makeError(
      'SYSTEM_ERROR',
      'StoreContext no provisto al executor. Usar getStoreContext() en server actions.'
    )
  }

  if (storeContext) {
    const status = storeContext.status

    if (status === 'suspended' || status === 'archived') {
      return makeError('STORE_INACTIVE', 'La tienda no está disponible')
    }

    // past_due: solo lecturas permitidas (superadmin bypasea)
    if (READ_ONLY.includes(status) && !isReadAction(name) && actor.type !== 'superadmin') {
      return makeError('STORE_INACTIVE', 'La tienda está en mora. Solo se permiten lecturas.')
    }
  }

  // ──────────────────────────────────────────────
  // PASO 3 — Validar actor y permisos
  // ──────────────────────────────────────────────

  if (!actor.id && actor.type !== 'system' && actor.type !== 'ai') {
    return makeError('UNAUTHORIZED', 'Actor no autenticado')
  }

  // Superadmin y ai bypasean verificación de rol por tienda
  if (actor.type !== 'superadmin' && actor.type !== 'ai' && storeContext) {
    const roleAllowed = handler.permissions.includes(actor.type as Exclude<ActorType, 'user'>)
    const userRoleAllowed = actor.type === 'user'
      ? handler.permissions.includes(storeContext.user_role as StoreUserRole)
      : false

    if (!roleAllowed && !userRoleAllowed) {
      return makeError('UNAUTHORIZED', 'No tenés permiso para esta acción')
    }
  }

  // ──────────────────────────────────────────────
  // PASO 4 — Validar módulos requeridos
  // ──────────────────────────────────────────────

  if (handler.requires.length > 0 && storeContext) {
    for (const mod of handler.requires) {
      if (!storeContext.modules[mod]) {
        return makeError('MODULE_INACTIVE', `El módulo '${mod}' no está activo`)
      }
    }
  }

  // ──────────────────────────────────────────────
  // PASO 5 — Validar límites del plan
  // ──────────────────────────────────────────────

  if (handler.limits && storeContext && store_id) {
    try {
      const limitField = handler.limits.field
      const maxAllowed = storeContext.limits[limitField]
      const current = await handler.limits.countQuery(store_id)

      if (current >= maxAllowed) {
        return makeError(
          'LIMIT_EXCEEDED',
          `Límite de ${limitField} alcanzado (${current}/${maxAllowed})`
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error verificando límites del plan'
      return makeError('SYSTEM_ERROR', message)
    }
  }

  // ──────────────────────────────────────────────
  // PASO 6 — Validar input de negocio
  // ──────────────────────────────────────────────

  if (storeContext) {
    const validation = handler.validate(input, storeContext)
    if (!validation.valid) {
      return makeError(validation.code, validation.message, validation.field)
    }
  }

  // ──────────────────────────────────────────────
  // PASO 7 — Ejecutar lógica del módulo
  // ──────────────────────────────────────────────

  let result: unknown
  try {
    result = await handler.execute(input, storeContext!)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return makeError('SYSTEM_ERROR', message)
  }

  // ──────────────────────────────────────────────
  // PASO 8 — Emitir evento (service role, siempre)
  // ──────────────────────────────────────────────

  if (handler.event_type) {
    try {
      // Cast necesario: database.ts manual no incluye Relationships (campo requerido por supabase-js).
      // Se reemplaza por tipos generados por CLI en paso 0.5 cuando corresponda.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabaseServiceRole as any).from('events').insert({
        store_id: store_id ?? null,
        type: handler.event_type,
        actor_type: actor.type,
        actor_id: actor.id ?? null,
        data: (result ?? {}) as Record<string, unknown>,
      })
    } catch (err) {
      // Si falla el evento, rollback lógico: retornamos error
      const message = err instanceof Error ? err.message : 'Error al emitir evento'
      return makeError('SYSTEM_ERROR', `Fallo al registrar evento: ${message}`)
    }
  }

  // ──────────────────────────────────────────────
  // PASO 9 — Invalidar caché (async, fire & forget)
  // ──────────────────────────────────────────────

  if (handler.invalidates.length > 0 && store_id) {
    const keys = handler.invalidates.map((k) => k.replace('{store_id}', store_id))
    void (async () => {
      try {
        const { redis } = await import('@/lib/redis')
        await redis.del(...keys)
      } catch (err) {
        // Invalidación de caché no debe fallar la acción
        console.error('Cache invalidation error:', err)
      }
    })()
  }

  // Revalidar ISR del catálogo público cuando cambian datos visibles al visitante
  const CATALOG_KEYS = ['products:', 'store:slug:']
  const affectsCatalog = handler.invalidates.some((k) =>
    CATALOG_KEYS.some((prefix) => k.startsWith(prefix)),
  )
  if (affectsCatalog && storeContext?.slug) {
    void (async () => {
      try {
        const { revalidatePath } = await import('next/cache')
        revalidatePath(`/${storeContext.slug}`)
      } catch {
        // No crítico — ISR se regenera por TTL si falla
      }
    })()
  }

  // ──────────────────────────────────────────────
  // PASO 10 — Retornar resultado
  // ──────────────────────────────────────────────

  return { success: true, data: result as T }
}
