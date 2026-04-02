# Template — Página del Panel Admin

> Leer antes: `/system/frontend/frontend-rules.md` (Reglas 1, 2, 3, 4)
> Todas las páginas de `/admin/*` son Server Components por defecto.
> Los componentes interactivos dentro son Client Components.

---

## Estructura de una página admin completa

```typescript
// src/app/(admin)/admin/{modulo}/page.tsx
import { Suspense }            from 'react'
import { redirect }            from 'next/navigation'
import { createClient }        from '@/lib/supabase/server'
import { ModuleLockedState }   from '@/components/admin/shared/ModuleLockedState'
import { {Entidad}List }       from '@/components/admin/{modulo}/{Entidad}List'
import { list{Entidades}Action } from './actions'

// {ADAPTAR}: nombre del módulo canónico (de domain-language.md)
const MODULE_NAME = '{modulo}' as const

export default async function {Modulo}Page() {

  // ─── 1. Verificar sesión ─────────────────────────────────────────────────
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  // ─── 2. Resolver tienda y contexto ───────────────────────────────────────
  const { data: membership } = await db
    .from('store_users')
    .select('store_id, role, stores(modules)')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')

  // ─── 3. Verificar módulo activo ──────────────────────────────────────────
  // {ADAPTAR}: omitir este bloque si el módulo es CORE (catalog, products, etc.)
  const modules = (membership.stores as any)?.modules ?? {}
  if (!modules[MODULE_NAME]) {
    return (
      <ModuleLockedState
        moduleName={MODULE_NAME}
        title="{Módulo} no disponible"
        description="Este módulo no está activo en tu plan actual."
      />
    )
  }

  // ─── 4. Cargar datos ─────────────────────────────────────────────────────
  const items = await list{Entidades}Action()

  // ─── 5. Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Suspense fallback={<{Modulo}Skeleton />}>
        <{Entidad}List items={items} />
      </Suspense>
    </div>
  )
}

// Skeleton de carga (opcional pero recomendado)
function {Modulo}Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-lg" />
      ))}
    </div>
  )
}
```

---

## Variante: página con detalle (slug/id)

```typescript
// src/app/(admin)/admin/{modulo}/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function {Entidad}DetailPage({ params }: Props) {
  const { id } = await params

  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await db
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .single()
  if (!membership) redirect('/login')

  // Cargar entidad verificando que pertenece a la tienda (store_id en la query)
  const { data: item } = await db
    .from('{entidades}')
    .select('*')
    .eq('id', id)
    .eq('store_id', membership.store_id)   // OBLIGATORIO
    .single()

  if (!item) notFound()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* {ADAPTAR}: componente de detalle */}
    </div>
  )
}
```

---

## Variante: página del dashboard (stats)

```typescript
// src/app/(admin)/admin/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import { StatCard }     from '@/components/admin/shared/StatCard'
import { Package, ShoppingCart, Tag } from 'lucide-react'

export default async function AdminDashboardPage() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await db
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .single()
  if (!membership) redirect('/login')

  const storeId = membership.store_id

  // Cargar stats en paralelo
  const [
    { count: productCount },
    { count: categoryCount },
    { count: orderCount },
  ] = await Promise.all([
    db.from('products').select('*', { count: 'exact', head: true }).eq('store_id', storeId).eq('is_active', true),
    db.from('categories').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
    db.from('orders').select('*', { count: 'exact', head: true }).eq('store_id', storeId),
  ])

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="Productos activos"
          value={productCount ?? 0}
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Categorías"
          value={categoryCount ?? 0}
          icon={<Tag className="h-5 w-5" />}
        />
        <StatCard
          label="Pedidos totales"
          value={orderCount ?? 0}
          icon={<ShoppingCart className="h-5 w-5" />}
        />
      </div>
    </div>
  )
}
```

---

## Estructura de archivos por módulo

```
src/app/(admin)/admin/{modulo}/
  page.tsx              ← Server Component principal (este template)
  actions.ts            ← Server Actions del módulo
  [id]/
    page.tsx            ← Detalle de entidad (si aplica)

src/components/admin/{modulo}/
  {Entidad}List.tsx     ← Listado con acciones
  {Entidad}Form.tsx     ← Formulario (modal/drawer)
  {Entidad}Card.tsx     ← Card individual (si aplica)
```

---

## Checklist de la página admin

- [ ] Es un Server Component (sin `'use client'`)
- [ ] Verifica sesión → redirige a `/login` si no hay usuario
- [ ] Resuelve `store_id` desde `store_users` en el servidor
- [ ] Si el módulo no es CORE: verifica `modules[MODULE_NAME]` → muestra `ModuleLockedState`
- [ ] Toda query filtra por `store_id` (nunca datos de otras tiendas)
- [ ] Tiene manejo de `notFound()` para recursos que no existen
- [ ] Tiene skeleton de loading en `<Suspense>`
- [ ] Usa el componente `{Entidad}List` que es `'use client'` para interactividad
- [ ] El layout responsive funciona en mobile (375px) y desktop (1280px)
