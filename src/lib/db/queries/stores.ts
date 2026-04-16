import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { cached } from '@/lib/cache'
import type { StoreConfig } from '@/lib/types'

export type StorePublic = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cover_url: string | null
  whatsapp: string | null
  description: string | null
  status: string
  config: StoreConfig
  modules: Record<string, boolean>
}

// Cast necesario: database.ts manual no incluye Relationships (campo requerido por supabase-js v2).
// Se reemplaza por tipos generados por CLI si corresponde.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/**
 * Busca una tienda por slug. Solo retorna tiendas con status visible al público.
 * Usa service role para bypasear RLS (acceso anon al catálogo).
 * Cacheada 300s en Upstash Redis.
 */
export async function getStoreBySlug(slug: string): Promise<StorePublic | null> {
  return cached(`store:slug:${slug}`, 300, async () => {
    const { data, error } = await db
      .from('stores')
      .select('id, name, slug, logo_url, cover_url, whatsapp, description, status, config, modules')
      .eq('slug', slug)
      .in('status', ['demo', 'active', 'past_due'])
      .single()

    if (error || !data) return null

    return {
      ...data,
      config: (data.config ?? {}) as StoreConfig,
      modules: (data.modules ?? {}) as Record<string, boolean>,
    }
  })
}
