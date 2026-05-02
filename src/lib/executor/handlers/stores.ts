/**
 * create_store — operación especial fuera del executor.
 *
 * Crear una tienda NO pasa por el executor porque no existe un store_id previo.
 * Similar a las billing actions: usa supabaseServiceRole directo + evento manual.
 */

import { supabaseServiceRole } from '@/lib/supabase/service-role'
import type { ActionResult } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

export interface CreateStoreInput {
  store_name: string
  store_slug: string
  user_id: string
}

export async function createStore(input: CreateStoreInput): Promise<ActionResult<{ store_id: string; slug: string }>> {
  const { store_name, store_slug, user_id } = input

  // Obtener el plan base
  const { data: plan, error: planError } = await db
    .from('plans')
    .select('id, base_modules, max_stores_total, trial_max_products')
    .eq('name', 'base')
    .single()

  if (planError || !plan) {
    return { success: false, error: { code: 'SYSTEM_ERROR', message: 'Plan base no encontrado' } }
  }

  // Validar cap global de tiendas (si está configurado)
  if (plan.max_stores_total !== null && plan.max_stores_total !== undefined) {
    const { count, error: countError } = await db
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'archived')

    if (countError) {
      return { success: false, error: { code: 'SYSTEM_ERROR', message: 'Error al verificar cap de tiendas' } }
    }

    if ((count ?? 0) >= plan.max_stores_total) {
      return {
        success: false,
        error: {
          code: 'STORE_CAP_REACHED',
          message: 'No hay cupos disponibles. Volvé más tarde o sumate a la lista de espera.',
        },
      }
    }
  }

  // Construir el mapa de módulos activos desde base_modules del plan
  const baseModules: string[] = Array.isArray(plan.base_modules) ? plan.base_modules : []
  const modules: Record<string, boolean> = {}
  for (const mod of baseModules) {
    modules[mod] = true
  }

  // Crear la tienda
  const { data: store, error: storeError } = await db
    .from('stores')
    .insert({
      name: store_name,
      slug: store_slug,
      status: 'demo',
      billing_status: 'demo',
      plan_id: plan.id,
      modules,
      limits: { max_products: (plan.trial_max_products as number | null) ?? 100, max_orders: 100, ai_tokens: 0 },
      config: { onboarding: { completed: false } },
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, slug')
    .single()

  if (storeError || !store) {
    return { success: false, error: { code: 'SYSTEM_ERROR', message: storeError?.message ?? 'Error al crear tienda' } }
  }

  // Crear store_user (owner)
  const { error: suError } = await db.from('store_users').insert({
    store_id: store.id,
    user_id,
    role: 'owner',
    accepted_at: new Date().toISOString(),
  })

  if (suError) {
    // Intentar limpiar la tienda creada
    await db.from('stores').delete().eq('id', store.id)
    return { success: false, error: { code: 'SYSTEM_ERROR', message: 'Error al asignar propietario' } }
  }

  // Emitir evento
  await db.from('events').insert({
    store_id: store.id,
    type: 'store_created',
    actor_type: 'user',
    actor_id: user_id,
    data: { store_name, store_slug },
  })

  return { success: true, data: { store_id: store.id, slug: store.slug } }
}
