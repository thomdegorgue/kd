import type { MetadataRoute } from 'next'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

const CHUNK_SIZE = 10_000

async function countActiveStores(): Promise<number> {
  const { count } = await db
    .from('stores')
    .select('*', { count: 'exact', head: true })
    .eq('billing_status', 'active')
    .eq('status', 'active')
  return count ?? 0
}

export async function generateSitemaps() {
  const total = await countActiveStores()
  const catalogChunks = Math.max(0, Math.ceil(total / CHUNK_SIZE))
  const ids = [{ id: '0' }]
  for (let i = 0; i < catalogChunks; i++) {
    ids.push({ id: String(i + 1) })
  }
  return ids
}

export default async function sitemap({
  id,
}: {
  id: string
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitdigital.ar'
  const apexHost = (() => {
    try {
      return new URL(baseUrl).host.replace(/^www\./, '')
    } catch {
      return 'kitdigital.ar'
    }
  })()

  if (id === '0') {
    return [
      {
        url: baseUrl,
        changeFrequency: 'weekly',
        priority: 1,
      },
      {
        url: `${baseUrl}/auth/login`,
        changeFrequency: 'never',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/auth/signup`,
        changeFrequency: 'never',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/terminos`,
        changeFrequency: 'monthly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/privacidad`,
        changeFrequency: 'monthly',
        priority: 0.3,
      },
    ]
  }

  // id >= '1' → chunk de catálogos públicos
  const chunkIndex = Math.max(0, Number(id) - 1)
  const from = chunkIndex * CHUNK_SIZE
  const to = from + CHUNK_SIZE - 1

  const { data } = await db
    .from('stores')
    .select('slug, updated_at, custom_domain, custom_domain_verified')
    .eq('billing_status', 'active')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .range(from, to)

  const rows = (data ?? []) as Array<{
    slug: string
    updated_at: string | null
    custom_domain: string | null
    custom_domain_verified: boolean | null
  }>

  return rows.map((row) => {
    const host =
      row.custom_domain_verified && row.custom_domain
        ? row.custom_domain
        : `${row.slug}.${apexHost}`
    return {
      url: `https://${host}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }
  })
}
