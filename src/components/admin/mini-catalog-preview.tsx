'use client'

import { StoreThemeProvider } from '@/components/shared/store-theme-provider'
import { StoreHeader } from '@/components/public/store-header'
import { Card } from '@/components/ui/card'
import type { StoreConfig } from '@/lib/types'

type MiniCatalogPreviewProps = {
  name: string
  description: string | null
  coverUrl: string | null
  city?: string | null
  hours?: string | null
  config?: StoreConfig | null
}

export function MiniCatalogPreview({
  name,
  description,
  coverUrl,
  city,
  hours,
  config,
}: MiniCatalogPreviewProps) {
  const primary = config?.primary_color ?? '#1b1b1b'
  const secondary = config?.secondary_color ?? '#f6f6f6'

  return (
    <StoreThemeProvider primaryColor={primary} secondaryColor={secondary}>
      <Card className="overflow-hidden">
        <div className="bg-background p-4">
          <div className="mb-2">
            <p className="text-xs font-medium text-muted-foreground">Preview del catálogo</p>
          </div>
          <StoreHeader
            name={name || 'Tu tienda'}
            description={description || null}
            coverUrl={coverUrl || null}
            city={city ?? null}
            hours={hours ?? null}
          />
        </div>
      </Card>
    </StoreThemeProvider>
  )
}

