import type { MetadataRoute } from 'next'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

export async function generateSitemaps() {
  // Sitemap 0: core pages
  // Sitemap 1+: public catalogs by store (chunked per 10k URLs)
  return [{ id: '0' }]
}

export default async function sitemap({
  id,
}: {
  id: string
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitdigital.ar'

  if (id === '0') {
    // Core pages
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 1,
      },
      {
        url: `${baseUrl}/auth/login`,
        lastModified: new Date(),
        changeFrequency: 'never',
        priority: 0.5,
      },
      {
        url: `${baseUrl}/auth/signup`,
        lastModified: new Date(),
        changeFrequency: 'never',
        priority: 0.8,
      },
      {
        url: `${baseUrl}/terminos`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      },
      {
        url: `${baseUrl}/privacidad`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.3,
      },
    ]
  }

  // Por ahora, solo incluir core pages
  // En el futuro, agregar dinámicamente: catalogs públicos de tiendas activas
  return []
}
