# Estándares de Código — Guía de Estilo

> Naming, estructura de archivos, imports, patrones de código.
> Complementa `/system/core/domain-language.md` con reglas de implementación.

---

## Naming en código

### Archivos y carpetas
```
kebab-case     → archivos de página, routes, utilities, helpers
                 create-product.ts, product-form.tsx, use-products.ts
PascalCase     → componentes React
                 ProductList.tsx, AdminLayout.tsx, StatusBadge.tsx
camelCase      → todo lo demás en TypeScript
                 getStoreId(), handleSubmit, isLoading
```

### Variables y funciones
```typescript
// ✅ Correcto
const storeId     = '...'
const isLoading   = false
const productList = []
function createProduct() { ... }
function handleSubmit() { ... }

// ❌ Incorrecto (nombres del sistema en español o camelCase de entidad)
const tienda_id   = '...'   // usar storeId
const ProductoList = []     // usar productList
function CrearProducto() {} // usar createProduct (inglés, camelCase)
```

### Componentes React
```typescript
// ✅ PascalCase, descriptivo
export function ProductList() { ... }
export function AdminLayout() { ... }
export function StatusBadge() { ... }
export function EmptyState() { ... }

// ❌
export function productlist() { ... }
export function List() { ... }   // demasiado genérico
```

---

## Estructura de imports

Orden obligatorio de imports (con línea en blanco entre grupos):

```typescript
// 1. React y Next.js
import { useState, useEffect } from 'react'
import { redirect, notFound }  from 'next/navigation'
import Link                    from 'next/link'
import Image                   from 'next/image'

// 2. Librerías externas
import { useForm }   from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z }         from 'zod'
import { toast }     from 'sonner'

// 3. UI components (shadcn/ui)
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Form, ... } from '@/components/ui/form'

// 4. Componentes propios del proyecto
import { PageHeader }   from '@/components/admin/shared/PageHeader'
import { EmptyState }   from '@/components/admin/shared/EmptyState'
import { ProductForm }  from '@/components/admin/products/ProductForm'

// 5. Lib, utils, tipos
import { createClient }     from '@/lib/supabase/server'
import { executor }         from '@/lib/executor'
import type { ActionResult, StoreContext } from '@/lib/types'

// 6. Server Actions o actions del módulo
import { createProductAction } from './actions'
```

---

## Patrones de código

### Server Component (patrón estándar)

```typescript
// src/app/(admin)/admin/productos/page.tsx
// Sin 'use client' — es Server Component por defecto

export default async function ProductsPage() {
  const db   = await createClient()
  const user = await getAuthUser(db)  // helper que redirige si no hay sesión
  const data = await loadData(db, user.storeId)

  return <ProductList items={data} />
}

// Helpers privados del archivo
async function getAuthUser(db: SupabaseClient) {
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/login')
  const { data: membership } = await db
    .from('store_users').select('store_id').eq('user_id', user.id).single()
  if (!membership) redirect('/login')
  return { id: user.id, storeId: membership.store_id }
}

async function loadData(db: SupabaseClient, storeId: string) {
  const { data } = await db
    .from('products').select('*').eq('store_id', storeId).order('created_at', { ascending: false })
  return data ?? []
}
```

### Composición sobre herencia

```typescript
// ✅ Composición: props + children
function AdminSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-medium mb-4">{title}</h2>
      {children}
    </section>
  )
}

// ❌ No usar herencia de clase para componentes React
```

### Constantes de configuración

```typescript
// ✅ Constantes al tope del archivo o en un archivo dedicado
const PRODUCTS_PER_PAGE = 20
const MAX_IMAGE_SIZE_MB  = 5
const WHATSAPP_BASE_URL  = 'https://wa.me'

// ❌ Números mágicos embebidos
.limit(20)           // ¿por qué 20?
if (size > 5242880)  // ¿qué es 5242880?
```

---

## Estructura de carpetas del proyecto

```
src/
  app/
    (public)/
      [slug]/
        page.tsx
        layout.tsx
    (admin)/
      admin/
        layout.tsx
        page.tsx              ← Dashboard
        products/
          page.tsx
          actions.ts
          [id]/page.tsx
        categories/
          page.tsx
          actions.ts
        pedidos/
          page.tsx
          actions.ts
        stock/
          page.tsx
          actions.ts
        configuracion/
          page.tsx
          actions.ts
        billing/
          page.tsx
          actions.ts
          confirmacion/page.tsx
        asistente/
          page.tsx
    (superadmin)/
      superadmin/
        layout.tsx
        page.tsx
        stores/
          page.tsx
          [id]/page.tsx
    api/
      webhooks/
        mercadopago/
          billing/route.ts
      assistant/
        route.ts
    auth/
      callback/route.ts
    layout.tsx
    globals.css
    providers.tsx

  components/
    ui/                       ← shadcn/ui (no modificar)
    admin/
      layout/
        AdminLayout.tsx
        Sidebar.tsx
        BottomNav.tsx
      shared/
        PageHeader.tsx
        EmptyState.tsx
        ModuleLockedState.tsx
        StatCard.tsx
        StatusBadge.tsx
        ConfirmDialog.tsx
        ErrorBoundary.tsx
      products/
        ProductList.tsx
        ProductForm.tsx
        ProductCard.tsx
      categories/
        CategoryList.tsx
        CategoryForm.tsx
      pedidos/
        OrderList.tsx
        OrderCard.tsx
        OrderStatusStepper.tsx
      assistant/
        AssistantChat.tsx
        ActionProposal.tsx
    public/
      PublicLayout.tsx
      ProductGrid.tsx
      ProductCard.tsx
      CartDrawer.tsx
      WhatsAppCartButton.tsx
      BannerCarousel.tsx
      CategoryNav.tsx
      StoreFooter.tsx

  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts
    executor/
      index.ts
      registry.ts
      types.ts
    handlers/
      index.ts               ← importa todos los handlers (side-effects)
      catalog/
        create-store.ts
        update-store-config.ts
      products/
        create-product.ts
        update-product.ts
        delete-product.ts
        list-products.ts
      categories/
        create-category.ts
        ...
      orders/
        create-order.ts
        update-order-status.ts
      ...
    stores/
      cart.ts                ← Zustand store del carrito
    hooks/
      use-products.ts
      use-categories.ts
      use-orders.ts
    cache/
      redis.ts
      ratelimit.ts
    ai/
      client.ts
    cloudinary/
      upload.ts
    mercadopago/
      client.ts
    utils/
      error-messages.ts
      format.ts             ← formatPrice, formatDate, etc.
    types/
      index.ts              ← TODOS los tipos de dominio
    validations/
      store.ts
      product.ts

  middleware.ts
```

---

## Funciones de utilidad comunes

```typescript
// src/lib/utils/format.ts

// Formatear precio: centavos → pesos con formato AR
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style:    'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}
// formatPrice(150000) → "$1.500"
// formatPrice(99900)  → "$999"

// Formatear fecha
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

// Generar slug desde texto
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')    // remover acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
// slugify("Mi Tienda Número 1") → "mi-tienda-numero-1"
```

---

## Checklist de código

- [ ] Imports ordenados por grupos con línea en blanco entre ellos
- [ ] Archivos de componentes en PascalCase, archivos de utils en kebab-case
- [ ] Sin números mágicos: usar constantes con nombre descriptivo
- [ ] Las funciones helper privadas de una página van al final del mismo archivo
- [ ] La estructura de carpetas respeta la definida en este doc
- [ ] `formatPrice()` usado para mostrar precios (nunca `price / 100` inline en UI)
