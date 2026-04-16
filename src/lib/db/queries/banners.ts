import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { cached } from '@/lib/cache'
import type { Banner } from '@/lib/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/**
 * Lista banners activos de una tienda para el catálogo público.
 * Cacheada 300s en Upstash Redis.
 */
export async function getBannersPublic(storeId: string): Promise<Banner[]> {
  return cached(`banners:${storeId}`, 300, async () => {
    const { data, error } = await db
      .from('banners')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error || !data) return []
    return data as Banner[]
  })
}
