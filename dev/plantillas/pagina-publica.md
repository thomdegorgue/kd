# Template — Página de Vitrina Pública

> Leer antes: `/system/architecture/multi-tenant.md`, `/system/modules/catalog.md`, `/system/frontend/frontend-rules.md`
> Las páginas públicas son Server Components con ISR (revalidate).

---

## Página principal de la vitrina

```typescript
// src/app/(public)/[slug]/page.tsx
import { notFound }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicLayout } from '@/components/public/PublicLayout'
import { ProductGrid }  from '@/components/public/ProductGrid'
import { BannerCarousel } from '@/components/public/BannerCarousel'
import { CategoryNav }  from '@/components/public/CategoryNav'

// ISR: la vitrina se regenera cada 60 segundos
// Cambios en productos/config tardan hasta 60s en verse
export const revalidate = 60

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ categoria?: string }>
}

export default async function StorefrontPage({ params, searchParams }: Props) {
  const { slug }      = await params
  const { categoria } = await searchParams

  const db = await createClient()

  // ─── 1. Resolver la tienda por slug ──────────────────────────────────────
  const { data: store } = await db
    .from('stores')
    .select(`
      id, name, slug, description, whatsapp,
      billing_status, modules, config,
      logo_url, cover_url
    `)
    .eq('slug', slug)
    .single()

  // Tienda no existe → 404
  if (!store) notFound()

  // Tienda inactiva → página de estado (no 404)
  if (store.billing_status === 'suspended' || store.billing_status === 'archived') {
    return <StoreInactivePage storeName={store.name} status={store.billing_status} />
  }

  const modules = (store.modules as Record<string, boolean>) ?? {}
  const storeId = store.id

  // ─── 2. Cargar datos en paralelo ─────────────────────────────────────────
  const [categoriesResult, productsResult, bannersResult] = await Promise.all([
    // Categorías activas ordenadas
    db
      .from('categories')
      .select('id, name, slug, sort_order')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    // Productos activos (filtrar por categoría si aplica)
    db
      .from('products')
      .select(`
        id, name, price, description, image_url,
        is_active, is_featured, sort_order,
        product_categories(category_id)
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(200),

    // Banners (solo si módulo activo)
    modules.banners
      ? db
          .from('banners')
          .select('id, title, subtitle, image_url, link_url, sort_order')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [] }),
  ])

  const categories = categoriesResult.data ?? []
  const allProducts = productsResult.data ?? []
  const banners = bannersResult.data ?? []

  // Filtrar por categoría seleccionada
  const products = categoria
    ? allProducts.filter(p =>
        p.product_categories?.some((pc: any) => pc.category_id === categoria)
      )
    : allProducts

  return (
    <PublicLayout store={store} modules={modules} categories={categories}>
      {/* Banners promocionales */}
      {modules.banners && banners.length > 0 && (
        <BannerCarousel banners={banners} />
      )}

      {/* Navegación de categorías */}
      {categories.length > 0 && (
        <CategoryNav
          categories={categories}
          activeCategory={categoria}
          storeSlug={slug}
        />
      )}

      {/* Grid de productos */}
      <ProductGrid
        products={products}
        store={{ name: store.name, whatsapp: store.whatsapp }}
      />
    </PublicLayout>
  )
}

// Página de tienda inactiva
function StoreInactivePage({
  storeName,
  status,
}: {
  storeName: string
  status: 'suspended' | 'archived'
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{storeName}</h1>
        <p className="text-gray-500">
          {status === 'suspended'
            ? 'Esta tienda está temporalmente suspendida.'
            : 'Esta tienda ya no está disponible.'
          }
        </p>
      </div>
    </div>
  )
}
```

---

## Layout de la vitrina

```typescript
// src/app/(public)/[slug]/layout.tsx
import { notFound }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60

type Props = {
  children: React.ReactNode
  params:   Promise<{ slug: string }>
}

export default async function StoreLayout({ children, params }: Props) {
  const { slug } = await params

  const db = await createClient()
  const { data: store } = await db
    .from('stores')
    .select('id, name, slug, config, modules')
    .eq('slug', slug)
    .single()

  if (!store) notFound()

  // Aplicar colores de marca de la tienda vía CSS custom properties
  const config = (store.config as any) ?? {}
  const primaryColor   = config.primary_color   ?? '#6366F1'
  const secondaryColor = config.secondary_color ?? '#4F46E5'

  return (
    <div
      style={{
        '--store-primary':   primaryColor,
        '--store-secondary': secondaryColor,
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
```

---

## PublicLayout component

```typescript
// src/components/public/PublicLayout.tsx
import { WhatsAppCartButton } from './WhatsAppCartButton'
import { StoreFooter }        from './StoreFooter'

type Props = {
  store: {
    id: string; name: string; slug: string; description: string | null
    whatsapp: string; logo_url: string | null; config: unknown
  }
  modules:    Record<string, boolean>
  categories: Array<{ id: string; name: string; slug: string }>
  children:   React.ReactNode
}

export function PublicLayout({ store, modules, categories, children }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.logo_url && (
              <img src={store.logo_url} alt={store.name} className="h-8 w-8 rounded-full object-cover" />
            )}
            <span className="font-semibold text-gray-900">{store.name}</span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <StoreFooter store={store} modules={modules} />

      {/* Botón flotante de carrito */}
      <WhatsAppCartButton store={{ name: store.name, whatsapp: store.whatsapp }} />
    </div>
  )
}
```

---

## Metadata dinámica (SEO)

```typescript
// src/app/(public)/[slug]/page.tsx — agregar al mismo archivo

import type { Metadata } from 'next'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const db = await createClient()
  const { data: store } = await db
    .from('stores')
    .select('name, description, logo_url')
    .eq('slug', slug)
    .single()

  if (!store) return { title: 'Tienda no encontrada' }

  return {
    title:       store.name,
    description: store.description ?? `Tienda online de ${store.name}`,
    openGraph: {
      title:  store.name,
      images: store.logo_url ? [store.logo_url] : [],
    },
  }
}
```

---

## Checklist de la página pública

- [ ] `export const revalidate = 60` en page.tsx y layout.tsx
- [ ] Tienda no existe → `notFound()` (retorna 404)
- [ ] Tienda `suspended`/`archived` → `StoreInactivePage` (no 404)
- [ ] Queries siempre con `.eq('store_id', storeId)`
- [ ] Datos cargados en paralelo con `Promise.all`
- [ ] Módulos verificados antes de renderizar sus componentes
- [ ] Mobile-first: grid de productos funcional en 375px
- [ ] `generateMetadata` exportado para SEO
- [ ] Botón carrito WhatsApp flotante y visible en mobile
