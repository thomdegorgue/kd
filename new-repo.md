# NEW-REPO.md — Plan Maestro para Reconstrucción de KitDigital.ar

Este documento es la especificación completa para que un agente IA reconstruya desde cero el repositorio de documentación y planificación de KitDigital.ar. Contiene toda la información necesaria sin ambigüedades, sin contradicciones y sin ruido.

El agente que ejecute este plan debe generar todos los archivos listados en la sección "Estructura del Nuevo Repo" con el contenido especificado en cada sección de este documento.

---

## Qué es KitDigital.ar

SaaS multitenant modular para catálogos digitales con carrito WhatsApp. Pensado para emprendedores y PyMEs de Argentina y Latinoamérica. Una sola instancia del sistema sirve a miles de tiendas, cada una con su subdominio (`{slug}.kitdigital.ar`) o dominio custom.

El dueño de una tienda crea su catálogo, configura su vitrina, recibe pedidos por WhatsApp, y gestiona su negocio desde un panel móvil. El sistema es modular: los módulos se activan/desactivan por plan y configuración.

No es un e-commerce con pasarela de pago al comprador final. El cierre de venta es por WhatsApp. El dueño registra manualmente los pedidos y pagos.

---

## Estructura del Nuevo Repo

```
/
├── README.md                   → Visión ejecutiva + stack + navegación
├── START.md                    → Centro de operaciones para agentes IA
├── ESTADO.md                   → Tracking vivo del proyecto (checkboxes)
├── PLAN.md                     → Plan maestro de ejecución F0–F8
├── PASOS-MANUALES.md           → Tareas que solo el humano puede hacer
├── schema.sql                  → SQL centralizado completo para Supabase
└── system/
    ├── domain.md               → Lenguaje canónico, entidades, reglas globales
    ├── modules.md              → 20 módulos con acciones, límites, dependencias
    ├── tools.md                → Herramientas y componentes reutilizables
    ├── realtime.md             → Reactividad, SPA/SSR, invalidaciones, tabs
    ├── executor.md             → Motor central del sistema
    ├── frontend.md             → Reglas UI, estructura carpetas, design system
    ├── billing.md              → Planes, estados, Mercado Pago, webhooks
    ├── auth.md                 → Roles, permisos, middleware, RLS
    └── superadmin.md           → Panel interno de operaciones
```

**Total: 14 archivos + 1 directorio.**

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 1: README.md
# ═══════════════════════════════════════════════════════════════

El archivo `README.md` debe contener exactamente lo siguiente:

---

```markdown
# KitDigital.ar

SaaS multitenant modular para catálogos digitales + carrito WhatsApp, mobile-first, para emprendedores y PyMEs de Argentina y Latinoamérica.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Runtime | Node 22 + pnpm (lockfile: `pnpm-lock.yaml`, siempre commitear) |
| Framework | Next.js 15 (App Router), TypeScript estricto |
| UI | Tailwind CSS v3, shadcn/ui, next-themes |
| Data fetching | TanStack Query v5 |
| Estado UI | Zustand |
| Formularios | React Hook Form + Zod |
| Íconos | Lucide React |
| Base de datos | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| Caché | Upstash Redis |
| Imágenes | Cloudinary (upload unsigned) |
| Billing SaaS | Mercado Pago Suscripciones |
| Deploy | Vercel (wildcard subdomains) |

## Navegación del Repo

| Si necesitás... | Leé... |
|----------------|--------|
| Empezar a trabajar como agente IA | `START.md` |
| Saber en qué fase/paso estamos | `ESTADO.md` |
| Entender qué construir y en qué orden | `PLAN.md` |
| Configurar servicios externos manualmente | `PASOS-MANUALES.md` |
| Ejecutar el SQL en Supabase | `schema.sql` |
| Entender el dominio, reglas y naming | `system/domain.md` |
| Ver los 20 módulos del sistema | `system/modules.md` |
| Ver herramientas reutilizables | `system/tools.md` |
| Entender la reactividad y caché | `system/realtime.md` |
| Entender el executor (motor central) | `system/executor.md` |
| Reglas de frontend y estructura | `system/frontend.md` |
| Billing, planes y Mercado Pago | `system/billing.md` |
| Roles, permisos y autenticación | `system/auth.md` |
| Panel de superadmin | `system/superadmin.md` |

## Variables de Entorno

| Variable | Servicio |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `MP_ACCESS_TOKEN` | Mercado Pago |
| `MP_PUBLIC_KEY` | Mercado Pago |
| `MP_WEBHOOK_SECRET` | Mercado Pago |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary |
| `UPSTASH_REDIS_REST_URL` | Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash |
| `OPENAI_API_KEY` | OpenAI |
| `NEXT_PUBLIC_APP_URL` | App |
| `NEXT_PUBLIC_APP_DOMAIN` | App (ej: kitdigital.ar) |

## Nombres Oficiales del Producto

- **Producto**: KitDigital.ar
- **Catálogo público**: Vitrina
- **Banner principal**: Portada
- **Módulos activables**: Módulos
- **Panel de gestión**: Panel

## Estado Actual

Ver `ESTADO.md` para el estado actualizado del proyecto.

## Licencia

Privado — Todos los derechos reservados.
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 2: START.md
# ═══════════════════════════════════════════════════════════════

```markdown
# START — Centro de Operaciones

Este archivo es el punto de entrada obligatorio para cualquier agente IA que trabaje en este proyecto. Leé este archivo completo antes de tocar una sola línea de código.

## Jerarquía de Verdad

Ante conflicto entre documentos, la prioridad es:

1. `system/` (especificación canónica)
2. `PLAN.md` (orden de ejecución)
3. `ESTADO.md` (estado actual)
4. Todo lo demás

## Protocolo de Inicio de Sesión

1. Leer `ESTADO.md` → identificar fase actual, paso actual, blockers
2. Leer el paso correspondiente en `PLAN.md`
3. Leer los archivos de `system/` que el paso referencia
4. Implementar exactamente lo que el paso indica
5. No avanzar al siguiente paso sin cumplir criterios de aceptación

## Protocolo de Fin de Sesión

1. Verificar `pnpm build` y `pnpm exec tsc --noEmit` sin errores
2. Actualizar `ESTADO.md`:
   - Marcar pasos completados con [x]
   - Registrar decisiones tomadas
   - Registrar blockers encontrados
   - Indicar qué sigue exactamente

## Reglas Innegociables

- **Runtime**: Node 22 + pnpm. Nunca npm ni yarn.
- **Tailwind**: v3 obligatorio. Fijar `"tailwindcss": "^3"` en package.json; no aceptar v4.
- **Subdominios**: en prod las rutas públicas se resuelven por subdominio `{slug}.kitdigital.ar` (Host header). En dev (`NODE_ENV=development`) se usa fallback path-based `localhost:3000/{slug}/*`. El middleware detecta el entorno y elige la estrategia.
- `/system` es la fuente de verdad. Si algo no está ahí, no existe.
- Toda escritura de dominio pasa por el executor.
- `store_id` se resuelve en servidor, nunca del cliente.
- Sin `any` en TypeScript.
- Toda entidad de dominio tiene `store_id`.
- Toda query filtra por `store_id`.
- La IA no ejecuta acciones directamente; pasa por el executor.
- Un módulo solo escribe en sus propias tablas.
- Los eventos son inmutables.
- Mobile-first siempre.

## Cómo Agregar una Feature Nueva

1. Definir en `system/modules.md` si es un módulo nuevo (acciones, límites, dependencias)
2. Agregar tablas necesarias en `schema.sql`
3. Registrar handler en el executor
4. Crear server actions que invocan el executor
5. Crear hooks de TanStack Query
6. Crear componentes UI
7. Agregar invalidaciones en `system/realtime.md`
8. Actualizar `ESTADO.md`

## Plantillas de Código

### Server Action

```typescript
'use server'

import { executor } from '@/lib/executor'
import { getStoreContext } from '@/lib/auth/store-context'
import { createActionSchema } from '@/lib/validations/schemas'

export async function createEntity(input: unknown) {
  const context = await getStoreContext()
  const validated = createActionSchema.parse(input)

  return executor({
    name: 'create_entity',
    store_id: context.store_id,
    actor: { type: 'user', id: context.user_id },
    input: validated,
  })
}
```

### Query Hook (TanStack)

```typescript
import { useQuery } from '@tanstack/react-query'
import { getEntities } from '@/lib/db/queries'
import { useStoreContext } from '@/lib/hooks/use-store-context'

export function useEntities(filters?: Filters) {
  const { store_id } = useStoreContext()

  return useQuery({
    queryKey: ['entities', store_id, filters],
    queryFn: () => getEntities(store_id, filters),
  })
}
```

### Mutation Hook con Invalidación

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntity } from '@/app/actions/entity'
import { useStoreContext } from '@/lib/hooks/use-store-context'
import { toast } from 'sonner'

export function useCreateEntity() {
  const queryClient = useQueryClient()
  const { store_id } = useStoreContext()

  return useMutation({
    mutationFn: createEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', store_id] })
      toast.success('Creado correctamente')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
```

### Componente Admin

```typescript
'use client'

import { useEntities } from '@/lib/hooks/use-entities'
import { DataTable } from '@/components/ui/data-table'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'

export function EntityList() {
  const { data, isLoading, error } = useEntities()

  if (isLoading) return <Skeleton className="h-96" />
  if (error) return <ErrorState error={error} />
  if (!data?.length) return <EmptyState entity="entities" />

  return <DataTable columns={columns} data={data} />
}
```

### Webhook Handler

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/billing/verify-signature'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  // Process webhook...

  return NextResponse.json({ received: true }, { status: 200 })
}
```
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 3: ESTADO.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Estado del Proyecto

**Fase actual:** F0 — Setup Inicial
**Paso actual:** 0.0 — Sin comenzar

---

## Progreso por Fase

### F0 — Setup Inicial
- [ ] 0.1 Crear proyecto Next.js + estructura de carpetas
- [ ] 0.2 Instalar dependencias (shadcn, tanstack, zustand, zod, supabase, etc.)
- [ ] 0.3 Configurar Supabase client (browser + server + service role)
- [ ] 0.4 Ejecutar schema.sql en Supabase
- [ ] 0.5 Generar tipos TypeScript desde schema
- [ ] 0.6 Implementar executor base
- [ ] 0.7 Implementar middleware multitenant
- [ ] 0.8 Configurar TanStack Query + Zustand + providers

### F1 — Design System Base
- [ ] 1.1 Configurar shadcn/ui (style: default, baseColor: slate)
- [ ] 1.2 Definir tokens de diseño en tailwind.config.ts
- [ ] 1.3 Instalar componentes shadcn base
- [ ] 1.4 Crear componentes compartidos (DataTable, EmptyState, ErrorState, etc.)
- [ ] 1.5 Crear layouts (AdminLayout, PublicLayout, SuperadminLayout)

### ⏸️ PAUSA DE DISEÑO
- [ ] Humano confirma: colores brand configurados
- [ ] Humano confirma: tipografía configurada
- [ ] Humano confirma: logo SVG + favicon definidos
- [ ] Humano confirma: componentes shadcn ajustados visualmente

### F2 — Herramientas Transversales
- [ ] 2.1 DataTable con sort, filter, paginación server-side, export CSV
- [ ] 2.2 ImageUploader (Cloudinary wrapper)
- [ ] 2.3 CSVImporter (upload → parse → validación → preview → confirmar)
- [ ] 2.4 CSVExporter
- [ ] 2.5 PDFGenerator (server-side, templates por entidad)
- [ ] 2.6 WhatsAppMessageBuilder
- [ ] 2.7 CurrencyFormatter + DateFormatter
- [ ] 2.8 ModalManager (Zustand)
- [ ] 2.9 ToastSystem (sonner)
- [ ] 2.10 ModuleGate + PlanUpgradePrompt

### F3 — Vitrina Pública + Core
- [ ] 3.1 Rutas públicas: /[slug], /[slug]/[category], /[slug]/p/[id]
- [ ] 3.2 Resolución de tienda por subdominio (middleware)
- [ ] 3.3 Módulo catalog: get_store_public, StoreHeader, StoreCover
- [ ] 3.4 Módulo products: list_products_public, ProductCard, ProductGrid
- [ ] 3.5 Módulo categories: list_categories_public, CategoryFilter
- [ ] 3.6 Módulo cart: CartDrawer, CartButton, WhatsAppCheckoutButton (Zustand)
- [ ] 3.7 Página de producto (si módulo product_page activo)
- [ ] 3.8 Banners: BannerCarousel (si módulo banners activo)
- [ ] 3.9 Social links en footer (si módulo social activo)

### F4 — Panel Admin
- [ ] 4.1 AdminLayout con sidebar, navegación, StoreContext
- [ ] 4.2 Dashboard con estadísticas básicas
- [ ] 4.3 CRUD productos completo
- [ ] 4.4 CRUD categorías con drag-and-drop reorder
- [ ] 4.5 Gestión de pedidos (crear, cambiar estado, ver detalle)
- [ ] 4.6 Gestión de clientes (listado, detalle)
- [ ] 4.7 Configuración de tienda (nombre, logo, WhatsApp, colores)
- [ ] 4.8 Configuración de módulos (enable/disable)
- [ ] 4.9 Módulos secundarios: stock, variantes, wholesale, shipping
- [ ] 4.10 Módulos de finanzas: finance, expenses, savings
- [ ] 4.11 Módulo tareas
- [ ] 4.12 Módulo multiuser (invitar, roles, remover)
- [ ] 4.13 Módulo custom_domain
- [ ] 4.14 Módulo pagos (registro manual de cobros)

### F5 — Billing
- [ ] 5.1 Tabla de planes y pricing page
- [ ] 5.2 Integración Mercado Pago: crear suscripción
- [ ] 5.3 Webhook handler: /api/webhooks/mercadopago/billing
- [ ] 5.4 Lógica de billing_status transitions
- [ ] 5.5 Cron check_billing_due (Supabase Edge Function)
- [ ] 5.6 UI de billing en panel admin
- [ ] 5.7 Bloqueo de operaciones según billing_status

### F6 — Superadmin
- [ ] 6.1 SuperadminLayout
- [ ] 6.2 Listar tiendas, ver detalle, cambiar estado/plan
- [ ] 6.3 Override de módulos y límites
- [ ] 6.4 Ver eventos y log de webhooks
- [ ] 6.5 CRUD planes
- [ ] 6.6 Métricas básicas (MRR, tiendas activas, churn)

### F7 — Performance + Seguridad
- [ ] 7.1 Upstash Redis: caché de queries costosas
- [ ] 7.2 Rate limiting en API routes
- [ ] 7.3 ISR para vitrina pública
- [ ] 7.4 Bundle analysis y optimización
- [ ] 7.5 Virtualización de listas largas (TanStack Virtual)

### F8 — Asistente IA
- [ ] 8.1 Módulo assistant: sesiones, mensajes, límites
- [ ] 8.2 Integración OpenAI (GPT-4o-mini)
- [ ] 8.3 UI AssistantChat
- [ ] 8.4 Actions permitidas para IA
- [ ] 8.5 Cron de limpieza de sesiones expiradas

---

## Variables de Entorno Configuradas
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] MP_ACCESS_TOKEN
- [ ] MP_PUBLIC_KEY
- [ ] MP_WEBHOOK_SECRET
- [ ] NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
- [ ] NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
- [ ] UPSTASH_REDIS_REST_URL
- [ ] UPSTASH_REDIS_REST_TOKEN
- [ ] OPENAI_API_KEY
- [ ] NEXT_PUBLIC_APP_URL
- [ ] NEXT_PUBLIC_APP_DOMAIN

## Decisiones Tomadas

(vacío — se llena sesión a sesión)

## Blockers Actuales

(vacío)
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 4: PLAN.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Plan Maestro de Ejecución

Este documento define el orden exacto de implementación. Cada fase tiene pasos numerados con criterios de aceptación.

---

## F0 — Setup Inicial

**Objetivo:** Proyecto Next.js funcional con DB, tipos, executor y middleware.

### 0.1 Crear proyecto Next.js + estructura

```bash
npx create-next-app@latest kitdigital --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Estructura de carpetas a crear:

```
src/
├── app/
│   ├── (public)/
│   │   └── [slug]/
│   ├── (admin)/
│   │   └── admin/
│   ├── (superadmin)/
│   │   └── superadmin/
│   └── api/
│       └── webhooks/
│           └── mercadopago/
├── components/
│   ├── ui/
│   ├── admin/
│   ├── public/
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── service-role.ts
│   ├── executor/
│   │   ├── index.ts
│   │   └── registry.ts
│   ├── hooks/
│   ├── stores/
│   ├── utils/
│   ├── validations/
│   ├── db/
│   │   └── queries/
│   └── types/
└── middleware.ts
```

**Criterio:** `npm run dev` funciona. Estructura de carpetas existe.

### 0.2 Instalar dependencias

```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query @tanstack/react-query-devtools zustand react-hook-form @hookform/resolvers zod lucide-react sonner next-themes
npm install @upstash/redis @upstash/ratelimit mercadopago openai
npm install -D supabase
```

**Criterio:** `npm run build` sin errores.

### 0.3 Configurar Supabase clients

Crear tres clientes:
- `client.ts` — para componentes client-side (usa `createBrowserClient`)
- `server.ts` — para Server Components y Server Actions (usa `createServerClient` con cookies)
- `service-role.ts` — para operaciones de sistema (webhooks, crons) que bypasean RLS

**Criterio:** los tres clientes exportan correctamente y compilan.

### 0.4 Ejecutar schema.sql en Supabase

Ejecutar el archivo `schema.sql` completo en el SQL Editor de Supabase. Este archivo contiene las 28 tablas, índices, políticas RLS, trigger de updated_at y datos iniciales de plans.

**Criterio:** las 28 tablas existen en Supabase. Las políticas RLS están habilitadas.

### 0.5 Generar tipos TypeScript

```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.ts
```

Crear tipos derivados en `src/lib/types/index.ts`:

```typescript
import type { Database } from './database'

export type Store = Database['public']['Tables']['stores']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type StoreUser = Database['public']['Tables']['store_users']['Row']
export type FinanceEntry = Database['public']['Tables']['finance_entries']['Row']
export type Event = Database['public']['Tables']['events']['Row']

export type StoreStatus = 'demo' | 'active' | 'past_due' | 'suspended' | 'archived'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'mp' | 'other'
export type StoreUserRole = 'owner' | 'admin' | 'collaborator'
export type UserRole = 'user' | 'superadmin'
export type ActorType = 'user' | 'superadmin' | 'system' | 'ai'

export type ModuleName =
  | 'catalog' | 'cart' | 'products' | 'categories' | 'orders'
  | 'stock' | 'payments' | 'variants' | 'wholesale' | 'shipping'
  | 'finance' | 'banners' | 'social' | 'product_page'
  | 'multiuser' | 'custom_domain' | 'tasks'
  | 'savings_account' | 'expenses' | 'assistant'

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; field?: string } }

export type ErrorCode =
  | 'MODULE_INACTIVE' | 'LIMIT_EXCEEDED' | 'NOT_FOUND'
  | 'UNAUTHORIZED' | 'INVALID_INPUT' | 'STORE_INACTIVE'
  | 'CONFLICT' | 'EXTERNAL_ERROR' | 'SYSTEM_ERROR'
```

**Criterio:** `npx tsc --noEmit` sin errores.

### 0.6 Implementar executor base

El executor es la función central del sistema. Ver `system/executor.md` para la especificación completa.

Implementar en `src/lib/executor/index.ts`:
- Firma: `executor({ name, store_id, actor, input })`
- Pipeline de 10 pasos: resolver handler → validar store → validar actor → validar módulos → validar límites → validar input → ejecutar → emitir evento → invalidar caché → retornar resultado
- Registry de handlers en `src/lib/executor/registry.ts`

**Criterio:** executor compila. Se puede registrar un handler dummy y ejecutarlo.

### 0.7 Implementar middleware multitenant

En `src/middleware.ts`:
- Resolver subdominio del Host header → buscar store por slug
- Inyectar store_id en el contexto del request
- Proteger rutas `/admin/*` (requiere sesión + store_id)
- Proteger rutas `/superadmin/*` (requiere sesión + role=superadmin)
- Rutas públicas `/{slug}/*` sin autenticación

**Criterio:** middleware compila. Rutas protegidas redirigen a login. Rutas públicas resuelven la tienda.

### 0.8 Configurar providers

Crear `src/app/providers.tsx` con:
- `QueryClientProvider` (TanStack Query)
- `ThemeProvider` (next-themes)
- `Toaster` (sonner)

**Criterio:** providers montados en el layout raíz. `npm run build` sin errores.

---

## F1 — Design System Base

**Objetivo:** Componentes UI base listos para usar en todo el sistema.

### 1.1 Configurar shadcn/ui

```bash
npx shadcn@latest init
```

Configuración: style `default`, baseColor `slate`, CSS variables activadas.

### 1.2 Definir tokens de diseño

En `tailwind.config.ts` agregar colores semánticos:

```
brand: { DEFAULT, light, dark }
success: { DEFAULT, light }
warning: { DEFAULT, light }
error: { DEFAULT, light }
```

Los valores exactos los define el humano en la pausa de diseño.

### 1.3 Instalar componentes shadcn base

```bash
npx shadcn@latest add button input label card badge skeleton dialog sheet select separator tabs textarea toast dropdown-menu avatar command popover table
```

### 1.4 Crear componentes compartidos

Ver `system/tools.md` para la especificación de cada componente. Los componentes de esta fase son:
- `DataTable` (con sort, filter, paginación, export)
- `EmptyState`
- `ErrorState`
- `LoadingSpinner`
- `ModuleGate`
- `PlanUpgradePrompt`

### 1.5 Crear layouts

- `AdminLayout`: sidebar (colapsable en mobile), header con store name, navigation
- `PublicLayout`: header minimalista de la tienda, footer con social links
- `SuperadminLayout`: sidebar con navegación de superadmin

**Criterio:** todos los componentes renderizan. Layouts visibles en dev.

---

## ⏸️ PAUSA DE DISEÑO

**El agente IA se detiene aquí. El humano debe:**

1. Configurar colores brand en `tailwind.config.ts`
2. Elegir y configurar tipografía (next/font)
3. Definir logo SVG y favicon
4. Ajustar visualmente los componentes shadcn para que reflejen la identidad de marca
5. Verificar que todos los componentes de `system/tools.md` se ven correctos
6. Marcar en `ESTADO.md` que la pausa está completada

**El agente NO continúa hasta que el humano confirme explícitamente en `ESTADO.md`.**

---

## F2 — Herramientas Transversales

**Objetivo:** Todas las herramientas reutilizables listas antes de construir features.

Ver `system/tools.md` para la especificación completa de cada herramienta. En esta fase se implementan:

### 2.1 DataTable completo
### 2.2 ImageUploader (Cloudinary)
### 2.3 CSVImporter
### 2.4 CSVExporter
### 2.5 PDFGenerator
### 2.6 WhatsAppMessageBuilder
### 2.7 CurrencyFormatter + DateFormatter
### 2.8 ModalManager
### 2.9 ToastSystem
### 2.10 ModuleGate + PlanUpgradePrompt

**Criterio:** cada herramienta tiene su componente exportable, funciona aislada, y pasa validación de tipos.

---

## F3 — Vitrina Pública + Core

**Objetivo:** La vitrina pública funcional con catálogo, productos, categorías, carrito y WhatsApp.

### 3.1–3.9 (ver ESTADO.md para desglose)

La vitrina usa Server Components con ISR (revalidación cada 60s) para SEO y velocidad. El carrito es 100% client-side con Zustand en localStorage.

Flujo de compra:
1. Cliente navega vitrina → ve productos
2. Agrega al carrito (Zustand, localStorage)
3. Click "Enviar pedido por WhatsApp"
4. Se genera URL wa.me con mensaje formateado
5. El dueño recibe el pedido por WhatsApp
6. El dueño registra el pedido en el panel (F4)

**Criterio:** vitrina pública carga con SSR. Carrito funciona. Mensaje de WhatsApp se genera correctamente.

---

## F4 — Panel Admin

**Objetivo:** Panel de gestión completo con todos los módulos.

El panel admin es una SPA (Client Components con TanStack Query). La navegación entre secciones es instantánea. Los datos se cachean por entidad con staleTime configurado según `system/realtime.md`.

### 4.1–4.14 (ver ESTADO.md para desglose)

Cada módulo sigue el patrón:
1. Registrar handlers en el executor
2. Crear server actions que invocan executor
3. Crear schemas Zod para validación
4. Crear hooks de TanStack Query (queries + mutations)
5. Crear componentes UI (list, form, detail)
6. Configurar invalidaciones según `system/realtime.md`

**Criterio:** cada módulo funciona end-to-end. CRUD completo. Invalidaciones correctas.

---

## F5 — Billing

**Objetivo:** Mercado Pago suscripciones funcionando. Lifecycle de tienda automático.

Ver `system/billing.md` para la especificación completa.

**Criterio:** se puede crear suscripción. Webhooks procesan pagos. billing_status cambia automáticamente. Cron de vencimiento funciona.

---

## F6 — Superadmin

**Objetivo:** Panel interno de operaciones.

Ver `system/superadmin.md` para la especificación completa.

**Criterio:** superadmin puede listar tiendas, cambiar estados, override de módulos y límites, ver eventos.

---

## F7 — Performance + Seguridad

**Objetivo:** Caché Redis, rate limiting, optimización de bundle.

**Criterio:** queries costosas cacheadas en Redis. Rate limiting en API routes. Bundle < 200KB first load.

---

## F8 — Asistente IA

**Objetivo:** Asistente integrado en el panel del dueño.

**Criterio:** chat funciona. Propone acciones. Acciones pasan por executor. Límite de tokens se respeta.
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 5: PASOS-MANUALES.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Pasos Manuales

Estas son las tareas que solo un humano puede realizar. El agente IA no puede ejecutarlas.

---

## 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Región: **São Paulo** (sa-east-1) para menor latencia en Argentina
3. Copiar `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. Copiar `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copiar `service_role secret key` → `SUPABASE_SERVICE_ROLE_KEY`
6. Ir a SQL Editor → ejecutar `schema.sql` completo
7. Verificar que las 28 tablas existen en Table Editor
8. Verificar que RLS está habilitado en todas las tablas de dominio

## 2. Mercado Pago

1. Crear aplicación en [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Copiar `Access Token` → `MP_ACCESS_TOKEN`
3. Copiar `Public Key` → `MP_PUBLIC_KEY`
4. Configurar webhook:
   - URL: `https://{tu-dominio}/api/webhooks/mercadopago/billing`
   - Eventos: `payment`, `subscription_preapproval`
5. Copiar el secret del webhook → `MP_WEBHOOK_SECRET`

## 3. Cloudinary

1. Crear cuenta en [cloudinary.com](https://cloudinary.com)
2. Copiar `Cloud Name` → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
3. Ir a Settings → Upload → Upload presets
4. Crear preset **unsigned** con nombre `kitdigital`
5. Configurar carpeta base: `kitdigital`
6. `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` = `kitdigital`

## 4. Upstash Redis

1. Crear base de datos en [upstash.com](https://upstash.com)
2. Región: **São Paulo** (sa-east-1)
3. Copiar `UPSTASH_REDIS_REST_URL`
4. Copiar `UPSTASH_REDIS_REST_TOKEN`

## 5. OpenAI

1. Crear API key en [platform.openai.com](https://platform.openai.com)
2. Copiar → `OPENAI_API_KEY`
3. Configurar límites de uso en el dashboard de OpenAI

## 6. Vercel

1. Conectar repositorio de GitHub
2. Configurar variables de entorno (las 13 de arriba)
3. Configurar dominio: `kitdigital.ar`
4. Configurar wildcard DNS: `*.kitdigital.ar` → CNAME de Vercel
5. Habilitar wildcard subdomains en Vercel (Settings → Domains)

## 7. Variables de Entorno Locales

Crear `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=localhost:3000
```

## 8. Para desarrollo local con webhooks

Usar ngrok o cloudflared para exponer el puerto local:

```bash
ngrok http 3000
# o
cloudflared tunnel --url http://localhost:3000
```

Actualizar la URL del webhook de Mercado Pago con la URL temporal.

## 9. Desarrollo Local — Resolución de Tiendas (sin subdominios)

En producción las tiendas se resuelven por subdominio (`{slug}.kitdigital.ar`) o dominio custom. En desarrollo local no se usan subdominios.

**Estrategia en dev**: el middleware detecta `NODE_ENV=development` y usa resolución por path:
- `http://localhost:3000/{slug}/*` → tienda con ese slug
- `http://localhost:3000/admin/*` → panel admin (sesión requerida)
- `http://localhost:3000/superadmin/*` → superadmin (role requerido)

**No se necesita** configurar `/etc/hosts`, `lvh.me` ni nada externo. El middleware maneja todo.

**En producción** (`NODE_ENV=production`): resolución por `Host` header → subdominio o `custom_domain`. El path-based no aplica.
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 6: schema.sql
# ═══════════════════════════════════════════════════════════════

El archivo `schema.sql` es el SQL centralizado completo para Supabase. Se ejecuta una sola vez en el SQL Editor. Contiene todo: tablas, índices, RLS, triggers y datos iniciales.

```sql
-- ============================================================
-- KitDigital.ar — Schema SQL Centralizado
-- Ejecutar en Supabase SQL Editor en una sola transacción
-- gen_random_uuid() es nativo en Supabase (PostgreSQL 14+), no requiere extensión
-- ============================================================

BEGIN;

-- ============================================================
-- TRIGGER DE UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLAS GLOBALES (sin store_id)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
  banned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_superadmin ON users(role) WHERE role = 'superadmin';

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  max_products INTEGER NOT NULL,
  max_orders INTEGER NOT NULL,
  ai_tokens INTEGER NOT NULL,
  available_modules JSONB NOT NULL DEFAULT '[]',
  module_prices JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TIENDA
-- ============================================================

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'demo' CHECK (status IN ('demo', 'active', 'past_due', 'suspended', 'archived')),
  plan_id UUID REFERENCES plans(id),
  modules JSONB NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  custom_domain TEXT UNIQUE,
  custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
  custom_domain_verified_at TIMESTAMPTZ,
  logo_url TEXT,
  cover_url TEXT,
  whatsapp TEXT,
  description TEXT,
  billing_status TEXT NOT NULL DEFAULT 'demo' CHECK (billing_status IN ('demo', 'active', 'past_due', 'suspended', 'archived')),
  trial_ends_at TIMESTAMPTZ,
  billing_cycle_anchor INTEGER,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  mp_subscription_id TEXT UNIQUE,
  mp_customer_id TEXT,
  ai_tokens_used INTEGER NOT NULL DEFAULT 0,
  cancelled_at TIMESTAMPTZ,
  last_billing_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_custom_domain ON stores(custom_domain);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_billing_status ON stores(billing_status);
CREATE INDEX idx_stores_mp_subscription ON stores(mp_subscription_id);

CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mantiene status y billing_status siempre sincronizados.
-- El campo canónico para billing es billing_status; el canónico para executor/RLS es status.
-- Este trigger garantiza que siempre tengan el mismo valor sin depender de la aplicación.
CREATE OR REPLACE FUNCTION sync_store_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.billing_status IS DISTINCT FROM OLD.billing_status THEN
    NEW.status = NEW.billing_status;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.billing_status = NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_sync_status
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION sync_store_status();

-- ---

CREATE TABLE store_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'collaborator')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_users_store ON store_users(store_id);
CREATE INDEX idx_store_users_user ON store_users(user_id);

CREATE TRIGGER trg_store_users_updated_at BEFORE UPDATE ON store_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  mp_payment_id TEXT NOT NULL UNIQUE,
  mp_subscription_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending', 'refunded')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_payments_store ON billing_payments(store_id);
CREATE INDEX idx_billing_payments_store_status ON billing_payments(store_id, status);
CREATE INDEX idx_billing_payments_mp_payment ON billing_payments(mp_payment_id);
CREATE INDEX idx_billing_payments_mp_sub ON billing_payments(mp_subscription_id);

-- ---

CREATE TABLE billing_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_event_id TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  store_id UUID REFERENCES stores(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  raw_payload JSONB NOT NULL,
  error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_webhook_event ON billing_webhook_log(mp_event_id);
CREATE INDEX idx_billing_webhook_status ON billing_webhook_log(status);
CREATE INDEX idx_billing_webhook_store ON billing_webhook_log(store_id);
CREATE INDEX idx_billing_webhook_created ON billing_webhook_log(created_at);

-- ============================================================
-- CATÁLOGO
-- ============================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_store_active ON products(store_id, is_active);
CREATE INDEX idx_products_store_featured ON products(store_id, is_featured);
CREATE INDEX idx_products_store_deleted ON products(store_id, deleted_at);

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_store_active ON categories(store_id, is_active);

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_product_categories_store_cat ON product_categories(store_id, category_id);
CREATE INDEX idx_product_categories_store_prod ON product_categories(store_id, product_id);

-- ---

CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banners_store ON banners(store_id);
CREATE INDEX idx_banners_store_active ON banners(store_id, is_active);

CREATE TRIGGER trg_banners_updated_at BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MÓDULOS DE PRODUCTO
-- ============================================================

CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price INTEGER,
  sku TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variants_store_product ON variants(store_id, product_id);

CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE variant_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variant_attrs_store_product ON variant_attributes(store_id, product_id);

-- ---

CREATE TABLE variant_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES variant_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variant_values_store_variant ON variant_values(store_id, variant_id);

-- ---

CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  track_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, variant_id)
);

CREATE INDEX idx_stock_items_store ON stock_items(store_id);
CREATE INDEX idx_stock_items_store_product ON stock_items(store_id, product_id);

CREATE TRIGGER trg_stock_items_updated_at BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE wholesale_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, variant_id)
);

CREATE INDEX idx_wholesale_prices_store ON wholesale_prices(store_id);

CREATE TRIGGER trg_wholesale_prices_updated_at BEFORE UPDATE ON wholesale_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipping_methods_store ON shipping_methods(store_id);
CREATE INDEX idx_shipping_methods_store_active ON shipping_methods(store_id, is_active);

CREATE TRIGGER trg_shipping_methods_updated_at BEFORE UPDATE ON shipping_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CLIENTES Y PEDIDOS
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_store_phone ON customers(store_id, phone);

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  total INTEGER NOT NULL CHECK (total >= 0),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_store_status ON orders(store_id, status);
CREATE INDEX idx_orders_store_created ON orders(store_id, created_at);
CREATE INDEX idx_orders_store_customer ON orders(store_id, customer_id);

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_store_order ON order_items(store_id, order_id);
CREATE INDEX idx_order_items_store_product ON order_items(store_id, product_id);

-- ============================================================
-- PAGOS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  method TEXT NOT NULL CHECK (method IN ('cash', 'transfer', 'card', 'mp', 'other')),
  mp_payment_id TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_store ON payments(store_id);
CREATE INDEX idx_payments_store_order ON payments(store_id, order_id);
CREATE INDEX idx_payments_store_status ON payments(store_id, status);
CREATE INDEX idx_payments_store_created ON payments(store_id, created_at);

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FINANZAS
-- ============================================================

CREATE TABLE finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT,
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finance_entries_store ON finance_entries(store_id);
CREATE INDEX idx_finance_entries_store_type ON finance_entries(store_id, type);
CREATE INDEX idx_finance_entries_store_date ON finance_entries(store_id, date);

CREATE TRIGGER trg_finance_entries_updated_at BEFORE UPDATE ON finance_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  supplier TEXT,
  date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_period TEXT CHECK (recurrence_period IN ('monthly', 'weekly', 'annual')),
  receipt_url TEXT,
  finance_entry_id UUID REFERENCES finance_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_store ON expenses(store_id);
CREATE INDEX idx_expenses_store_category ON expenses(store_id, category);
CREATE INDEX idx_expenses_store_date ON expenses(store_id, date);

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  goal_amount INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_savings_accounts_store ON savings_accounts(store_id);

CREATE TRIGGER trg_savings_accounts_updated_at BEFORE UPDATE ON savings_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE savings_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  savings_account_id UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT,
  finance_entry_id UUID REFERENCES finance_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_savings_movements_store_account ON savings_movements(store_id, savings_account_id);

-- ============================================================
-- TAREAS
-- ============================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  due_date DATE,
  assigned_to UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_store ON tasks(store_id);
CREATE INDEX idx_tasks_store_status ON tasks(store_id, status);
CREATE INDEX idx_tasks_store_assigned ON tasks(store_id, assigned_to);

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- IA
-- ============================================================

CREATE TABLE assistant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_assistant_sessions_store_user ON assistant_sessions(store_id, user_id);
CREATE INDEX idx_assistant_sessions_expires ON assistant_sessions(expires_at);

-- ---

CREATE TABLE assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assistant_messages_session ON assistant_messages(session_id, created_at);
CREATE INDEX idx_assistant_messages_store ON assistant_messages(store_id, session_id);

-- ============================================================
-- SISTEMA DE EVENTOS
-- ============================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'superadmin', 'system', 'ai')),
  actor_id UUID,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_store ON events(store_id);
CREATE INDEX idx_events_store_type ON events(store_id, type);
CREATE INDEX idx_events_store_created ON events(store_id, created_at);
CREATE INDEX idx_events_type_created ON events(type, created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_log ENABLE ROW LEVEL SECURITY;

-- Helper: permite escrituras solo en tiendas con status demo o active.
-- Bloquea automáticamente writes cuando la tienda está past_due, suspended o archived.
CREATE OR REPLACE FUNCTION store_allows_writes(sid UUID) RETURNS BOOLEAN AS $$
  SELECT status IN ('demo', 'active') FROM stores WHERE id = sid
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Plans: SELECT público (para pricing page, sin autenticar); mutaciones solo via service_role
CREATE POLICY plans_public_select ON plans FOR SELECT USING (is_active = true);

-- Users: pueden ver y editar su propio perfil
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- Store users: pueden ver los store_users de tiendas a las que pertenecen
CREATE POLICY store_users_select ON store_users FOR SELECT
  USING (user_id = auth.uid() OR store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY store_users_insert ON store_users FOR INSERT
  WITH CHECK (store_id IN (SELECT su.store_id FROM store_users su WHERE su.user_id = auth.uid() AND su.role IN ('owner', 'admin')));

-- Tablas de dominio: acceso por store_id del usuario
-- Patrón genérico: SELECT/INSERT/UPDATE/DELETE donde store_id coincide con alguna tienda del usuario

CREATE POLICY stores_select ON stores FOR SELECT
  USING (id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY stores_update ON stores FOR UPDATE
  USING (id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY products_select ON products FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY products_insert ON products FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY products_update ON products FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY products_delete ON products FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Vitrina pública: los productos activos de tiendas activas se pueden ver sin autenticación
CREATE POLICY products_public_select ON products FOR SELECT
  USING (is_active = true AND deleted_at IS NULL AND store_id IN (SELECT id FROM stores WHERE status IN ('demo', 'active', 'past_due')));

CREATE POLICY categories_select ON categories FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY categories_public_select ON categories FOR SELECT
  USING (is_active = true AND store_id IN (SELECT id FROM stores WHERE status IN ('demo', 'active', 'past_due')));
CREATE POLICY categories_insert ON categories FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY categories_update ON categories FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY categories_delete ON categories FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Banners: lectura pública + escritura para owner/admin de la tienda
CREATE POLICY banners_public_select ON banners FOR SELECT
  USING (is_active = true AND store_id IN (SELECT id FROM stores WHERE status IN ('demo', 'active', 'past_due')));
CREATE POLICY banners_select ON banners FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY banners_insert ON banners FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY banners_update ON banners FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY banners_delete ON banners FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Variants
CREATE POLICY variants_select ON variants FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY variants_insert ON variants FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY variants_update ON variants FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY variants_delete ON variants FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Variant attributes
CREATE POLICY variant_attributes_select ON variant_attributes FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY variant_attributes_insert ON variant_attributes FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY variant_attributes_delete ON variant_attributes FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Variant values
CREATE POLICY variant_values_select ON variant_values FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY variant_values_insert ON variant_values FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY variant_values_delete ON variant_values FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Stock items
CREATE POLICY stock_items_select ON stock_items FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY stock_items_insert ON stock_items FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY stock_items_update ON stock_items FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY stock_items_delete ON stock_items FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Wholesale prices
CREATE POLICY wholesale_prices_select ON wholesale_prices FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY wholesale_prices_insert ON wholesale_prices FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY wholesale_prices_update ON wholesale_prices FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY wholesale_prices_delete ON wholesale_prices FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Shipping methods
CREATE POLICY shipping_methods_select ON shipping_methods FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY shipping_methods_insert ON shipping_methods FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY shipping_methods_update ON shipping_methods FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY shipping_methods_delete ON shipping_methods FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Customers
CREATE POLICY customers_select ON customers FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY customers_update ON customers FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY customers_delete ON customers FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Orders
CREATE POLICY orders_select ON orders FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY orders_insert ON orders FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY orders_update ON orders FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY orders_delete ON orders FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Order items (sin DELETE directo; se eliminan en cascada desde orders)
CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY order_items_insert ON order_items FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));

-- Payments
CREATE POLICY payments_select ON payments FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY payments_insert ON payments FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY payments_update ON payments FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Finance entries
CREATE POLICY finance_entries_select ON finance_entries FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY finance_entries_insert ON finance_entries FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY finance_entries_update ON finance_entries FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY finance_entries_delete ON finance_entries FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Expenses
CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY expenses_update ON expenses FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY expenses_delete ON expenses FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Savings accounts
CREATE POLICY savings_accounts_select ON savings_accounts FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY savings_accounts_insert ON savings_accounts FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY savings_accounts_update ON savings_accounts FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY savings_accounts_delete ON savings_accounts FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Savings movements
CREATE POLICY savings_movements_select ON savings_movements FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY savings_movements_insert ON savings_movements FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY savings_movements_delete ON savings_movements FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Tasks
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Assistant sessions
CREATE POLICY assistant_sessions_select ON assistant_sessions FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY assistant_sessions_insert ON assistant_sessions FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())
    AND store_allows_writes(store_id));
CREATE POLICY assistant_sessions_delete ON assistant_sessions FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Assistant messages
CREATE POLICY assistant_messages_select ON assistant_messages FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY assistant_messages_insert ON assistant_messages FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())
    AND store_allows_writes(store_id));

-- Product categories
CREATE POLICY product_categories_select ON product_categories FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY product_categories_insert ON product_categories FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY product_categories_delete ON product_categories FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Eventos: usuarios solo pueden insertar (via executor); superadmin lee todo via service role
CREATE POLICY events_insert ON events FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));

-- billing_payments y billing_webhook_log: solo service_role accede directamente.
-- Sin policies para usuarios normales: cualquier acceso autenticado es bloqueado por RLS.
-- El backend usa supabaseServiceRole para leer y escribir estas tablas.

-- ============================================================
-- DATOS INICIALES
-- ============================================================

INSERT INTO plans (name, price, max_products, max_orders, ai_tokens, available_modules, module_prices) VALUES
('starter', 0, 30, 100, 0, '["catalog","products","categories","cart","orders"]', '{}'),
('growth', 0, 200, 500, 1000, '["catalog","products","categories","cart","orders","stock","payments","banners","social","product_page","shipping"]', '{"variants": 0, "wholesale": 0, "finance": 0}'),
('pro', 0, 1000, 99999, 5000, '["catalog","products","categories","cart","orders","stock","payments","variants","wholesale","shipping","finance","banners","social","product_page","multiuser","custom_domain","tasks","savings_account","expenses","assistant"]', '{}');

-- NOTA: los precios (price) están en 0 como placeholder. El superadmin debe
-- configurar los precios reales desde el panel. Los precios están en centavos ARS/mes.

COMMIT;
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 7: system/domain.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Dominio — Lenguaje Canónico y Reglas Globales

Este archivo es el diccionario y la constitución del sistema. Todo nombre, toda regla, todo estado definido aquí es ley.

---

## Entidades del Sistema

| Entidad | Tabla | Descripción |
|---------|-------|-------------|
| `store` | `stores` | Un negocio registrado. Unidad raíz de todo. |
| `user` | `users` | Persona con cuenta en el sistema. |
| `store_user` | `store_users` | Relación usuario↔tienda con rol. |
| `plan` | `plans` | Conjunto de límites y módulos. Definido por KitDigital. |
| `product` | `products` | Artículo que la tienda ofrece. |
| `category` | `categories` | Agrupación de productos. |
| `customer` | `customers` | Persona que generó un pedido. Sin cuenta propia. |
| `order` | `orders` | Solicitud de compra. |
| `order_item` | `order_items` | Línea de un pedido (snapshot de producto). |
| `payment` | `payments` | Registro de un cobro del dueño a su cliente. |
| `banner` | `banners` | Imagen promocional en la vitrina. |
| `variant` | `variants` | Combinación de atributos de producto (talle, color). |
| `variant_attribute` | `variant_attributes` | Tipo de atributo ("Talle", "Color"). |
| `variant_value` | `variant_values` | Valor concreto ("M", "Rojo"). |
| `stock_item` | `stock_items` | Control de inventario por producto/variante. |
| `wholesale_price` | `wholesale_prices` | Precio mayorista. |
| `shipping_method` | `shipping_methods` | Opción de envío configurada. |
| `finance_entry` | `finance_entries` | Movimiento de caja (ingreso o egreso). |
| `expense` | `expenses` | Egreso detallado con categoría. |
| `savings_account` | `savings_accounts` | Cuenta de ahorro virtual. |
| `savings_movement` | `savings_movements` | Depósito o retiro de ahorro. |
| `task` | `tasks` | Tarea interna de seguimiento. |
| `assistant_session` | `assistant_sessions` | Sesión de chat con el asistente IA. |
| `assistant_message` | `assistant_messages` | Mensaje individual en una sesión. |
| `event` | `events` | Registro inmutable de algo que ocurrió. |
| `billing_payment` | `billing_payments` | Cobro de MP a una tienda (billing KitDigital). |

---

## Nombres Prohibidos

| Prohibido | Usar en su lugar |
|-----------|----------------|
| `shop`, `tenant` | `store` |
| `item` | `product` |
| `buyer` | `customer` |
| `pedido`, `tienda`, `producto`, `precio` | Nombres en inglés |
| `storeID`, `StoreId` | `store_id` |
| `actionCreate` | `create_{entidad}` |

---

## Convenciones de Naming

- **Tablas y campos:** `snake_case` siempre.
- **Entidades:** singular en código, plural en tablas.
- **Referencias:** `{entidad}_id` (ej: `store_id`, `product_id`).
- **Timestamps:** sufijo `_at` (ej: `created_at`).
- **Fechas sin hora:** sufijo `_date` o tipo DATE.
- **Booleanos:** prefijo `is_` o `has_`.
- **Actions:** `{verbo}_{entidad}` en snake_case. Verbos: `create`, `update`, `delete`, `get`, `list`, `enable`, `disable`, `archive`, `process`, `send`, `generate`.
- **Eventos:** `{entidad}_{verbo_pasado}` (ej: `product_created`, `order_status_updated`).

---

## Estados de Tienda (store.status / store.billing_status)

Ambos campos siempre tienen el mismo valor. `billing_status` es el canónico para billing. `status` para el executor y RLS.

| Estado | Descripción | Operaciones permitidas |
|--------|-------------|----------------------|
| `demo` | Trial de 14 días. Límites reducidos. | CORE + módulos base. Sin billing. |
| `active` | Suscripción al día. | Todo. |
| `past_due` | Pago vencido. | Solo lecturas. No creates ni writes. |
| `suspended` | Bloqueada por superadmin. | Ninguna. |
| `archived` | Fuera del sistema activo. Datos conservados 90 días. | Ninguna. |

Transiciones válidas:
- `demo` → `active` (primer pago confirmado)
- `active` → `past_due` (pago fallido)
- `active` → `suspended` (superadmin)
- `past_due` → `active` (pago regularizado)
- `past_due` → `archived` (30 días sin pagar)
- `past_due` → `suspended` (superadmin)
- `suspended` → `active` (superadmin)
- `archived` → `active` (reactivación con pago)

---

## Estados de Pedido (order.status)

| Estado | Descripción |
|--------|-------------|
| `pending` | Recibido, sin confirmar. |
| `confirmed` | Confirmado por el dueño. |
| `preparing` | En preparación. |
| `delivered` | Entregado al cliente. |
| `cancelled` | Cancelado. Estado terminal. |

Transiciones válidas: `pending → confirmed → preparing → delivered`. Cualquier estado no terminal → `cancelled`.

---

## Estados de Pago (payment.status)

| Estado | Descripción |
|--------|-------------|
| `pending` | Registrado, sin confirmar. |
| `approved` | Confirmado. |
| `rejected` | Rechazado. |
| `refunded` | Reembolsado. |

---

## Errores Canónicos del Executor

| Código | Cuándo se usa |
|--------|--------------|
| `MODULE_INACTIVE` | El módulo requerido no está activo. |
| `LIMIT_EXCEEDED` | Se alcanzó el límite del plan. |
| `NOT_FOUND` | La entidad no existe o no pertenece a esta tienda. |
| `UNAUTHORIZED` | El actor no tiene permiso. |
| `INVALID_INPUT` | El input no cumple validaciones. |
| `STORE_INACTIVE` | La tienda no permite esta operación en su estado actual. |
| `CONFLICT` | Estado inconsistente con la operación. |
| `EXTERNAL_ERROR` | Error de servicio externo (MP, Cloudinary, OpenAI). |
| `SYSTEM_ERROR` | Error interno no clasificado. |

---

## Reglas Globales

1. **Todo tiene store_id.** Toda entidad de dominio tiene `store_id: UUID` obligatorio e inmutable. Excepciones: `users`, `plans`.
2. **Toda query filtra por store_id.** Sin excepción salvo operaciones explícitas de superadmin.
3. **Toda action valida módulos.** El executor verifica `store.modules[modulo] === true` antes de ejecutar.
4. **Toda action valida límites del plan.** Si aplica, el executor verifica antes de ejecutar.
5. **Naming es ley.** Todo nombre respeta las convenciones de este archivo.
6. **La IA no ejecuta directamente.** Genera JSON; el executor valida y ejecuta.
7. **No hay lógica duplicada.** Una regla existe en un solo lugar.
8. **Los módulos no cruzan ownership.** Un módulo solo escribe en sus propias tablas.
9. **El lifecycle de tienda es sagrado.** Solo las transiciones definidas son válidas.
10. **El superadmin tiene control total.** Puede auditar, modificar o bloquear cualquier cosa.
11. **Los eventos son inmutables.** No se modifican ni eliminan.
12. **Mobile-first siempre.** Todo se diseña primero para móvil.
13. **JSONB es para extensiones, no para lógica.** Campos como `config`, `modules`, `metadata` son extensiones. La lógica crítica tiene columnas propias.
14. **Una sola base de datos.** Aislamiento por `store_id`, no por infraestructura.
15. **Escalar a 10.000 tiendas.** Toda decisión de diseño debe funcionar a esa escala.
16. **Simplicidad sobre complejidad.** Si lo simple resuelve el problema, se usa lo simple.

---

## Anti-Patrones (prohibidos)

- Lógica de negocio fuera de módulos o en el frontend.
- Actions sin validar módulo activo o límites del plan.
- IA ejecutando acciones directamente sin executor.
- Queries sin filtrar por `store_id`.
- Tablas o campos no declarados en el schema.
- Un módulo escribiendo en tablas de otro módulo.
- Componentes UI duplicados.
- Romper el lifecycle de tienda.
- IDs hardcodeados en código.
- Modificar eventos ya registrados.
- Implementar código sin especificación previa en `/system`.
- Usar JSONB para lógica crítica.

---

## Campos Universales Obligatorios

Toda entidad de dominio (con store_id):
```
id          UUID DEFAULT gen_random_uuid()
store_id    UUID NOT NULL
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Entidades inmutables (events, order_items, assistant_messages, billing_payments): no tienen `updated_at`.

**Excepción documentada — `events.store_id` nullable:**
La tabla `events` declara `store_id` como nullable. Esto es intencional y cubre dos casos:
1. Eventos globales de sistema (`actor_type = 'system'`) que no están asociados a ninguna tienda.
2. Eventos de superadmin que afectan al sistema sin contexto de tienda (ej: `plan_created`).
Todo evento generado por un `user` o `ai` **debe** tener `store_id NOT NULL`. Esta invariante se valida en el executor (paso 8), no en el schema.

---

## Eventos del Sistema

Cada action exitosa emite un evento. Formato del evento:

```
{ id, store_id, type, actor_type, actor_id, data, created_at }
```

Catálogo de eventos:

| Evento | Trigger | Módulo |
|--------|---------|--------|
| `store_created` | `create_store` | core |
| `store_updated` | `update_store` | catalog |
| `store_status_changed` | transición de lifecycle | billing/superadmin |
| `module_enabled` | `enable_module` | catalog |
| `module_disabled` | `disable_module` | catalog |
| `product_created` | `create_product` | products |
| `product_updated` | `update_product` | products |
| `product_deleted` | `delete_product` | products |
| `order_created` | `create_order` | orders |
| `order_status_updated` | `update_order_status` | orders |
| `order_cancelled` | `cancel_order` | orders |
| `payment_created` | `create_payment` | payments |
| `payment_approved` | status → approved | payments |
| `payment_rejected` | status → rejected | payments |
| `payment_refunded` | status → refunded | payments |
| `stock_updated` | `update_stock` | stock |
| `stock_depleted` | quantity llega a 0 | stock |
| `subscription_created` | primer pago | billing |
| `subscription_renewed` | cobro recurrente exitoso | billing |
| `subscription_payment_failed` | cobro fallido | billing |
| `store_user_invited` | `invite_store_user` | multiuser |
| `store_user_role_updated` | `update_store_user_role` | multiuser |
| `store_user_removed` | `remove_store_user` | multiuser |
| `assistant_action_executed` | IA ejecuta action via executor | assistant |

Reglas de eventos:
- Inmutables. No se editan ni eliminan.
- Se persisten en la misma transacción que la operación.
- Si el evento no se puede persistir, la transacción entera falla.
- `actor_type` siempre se registra (`user`, `superadmin`, `system`, `ai`).
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 8: system/modules.md
# ═══════════════════════════════════════════════════════════════

Este archivo debe contener la especificación completa de los 20 módulos. Por cada módulo incluir:

- **ID canónico**
- **Descripción** (1-2 líneas)
- **Dependencias** (de qué módulos depende)
- **Tablas que posee** (ownership)
- **Actions** (nombre, actor, requires, permissions, input resumido, output resumido, errores)
- **Componentes UI** (listado)
- **Restricciones**
- **Edge cases relevantes**

Los 20 módulos con su especificación completa son:

---

### Módulos CORE (siempre activos, no desactivables)

---

## 1. `catalog`

**Descripción:** Configuración pública de la tienda (nombre, logo, colores, WhatsApp, módulos activos). Es la raíz de todo — todos los demás módulos dependen de él.
**Depende de:** ninguno (raíz)
**Tablas que posee:** `stores` (campos de config pública: name, slug, logo_url, cover_url, whatsapp, description, config, modules)
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `get_store` | user | owner, admin, collaborator | — | — | `{ store_id }` | Store completo | NOT_FOUND |
| `get_store_public` | system | — | — | — | `{ slug }` | Store público (sin billing info) | NOT_FOUND |
| `update_store` | user | owner, admin | — | — | `{ name?, description?, whatsapp?, logo_url?, cover_url? }` | Store actualizado | INVALID_INPUT |
| `update_store_config` | user | owner, admin | — | — | `{ config: Partial<StoreConfig> }` | Store actualizado | INVALID_INPUT |
| `enable_module` | user | owner | — | — | `{ module: ModuleName }` | `{ modules }` actualizado | MODULE_INACTIVE, UNAUTHORIZED |
| `disable_module` | user | owner | — | — | `{ module: ModuleName }` | `{ modules }` actualizado | UNAUTHORIZED, CONFLICT (si módulo tiene datos activos) |

### Componentes UI
- `StoreSettingsForm` — formulario de configuración general de la tienda
- `ModuleToggleList` — lista de módulos con toggle enable/disable
- `StoreHeader` — header público de la vitrina (logo, nombre, WhatsApp)
- `StoreCover` — imagen de portada de la vitrina

### Restricciones
- No se puede desactivar un módulo CORE.
- `slug` es inmutable después de la creación.
- `whatsapp` debe estar en formato internacional sin `+` (ej: `5491123456789`).

### Edge cases
- `disable_module` sobre un módulo con datos activos (ej: productos con stock) debe advertir pero no bloquear — los datos permanecen, solo el módulo queda inaccesible.
- `get_store_public` bypasea RLS (usa service role) para rendir la vitrina sin autenticación.

---

## 2. `products`

**Descripción:** CRUD completo de productos. Es el catálogo central de la tienda.
**Depende de:** `catalog`
**Tablas que posee:** `products`
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_product` | user | owner, admin | — | max_products | `{ name, price, description?, image_url?, is_active?, is_featured?, sort_order? }` | Product creado | LIMIT_EXCEEDED, INVALID_INPUT |
| `update_product` | user | owner, admin | — | — | `{ id, name?, price?, description?, image_url?, is_active?, is_featured?, sort_order? }` | Product actualizado | NOT_FOUND, INVALID_INPUT |
| `delete_product` | user | owner, admin | — | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `get_product` | user | owner, admin, collaborator | — | — | `{ id }` | Product | NOT_FOUND |
| `list_products` | user | owner, admin, collaborator | — | — | `{ filters?, page?, pageSize? }` | `{ items, total }` | — |
| `list_products_public` | system | — | — | — | `{ store_id, category_id?, search? }` | Productos activos públicos | — |
| `reorder_products` | user | owner, admin | — | — | `{ ids: UUID[] }` | `{ updated: true }` | NOT_FOUND |

### Componentes UI
- `ProductList` — lista admin con DataTable, filtros, export CSV
- `ProductForm` — formulario crear/editar (con ImageUploader, ModuleGate para variants)
- `ProductCard` — card pública para vitrina
- `ProductGrid` — grid de cards para vitrina
- `ProductDetail` — página de detalle de producto (si módulo product_page activo)

### Restricciones
- `price` en centavos (entero). Nunca decimales en DB.
- Soft delete: `deleted_at` timestamp, nunca DELETE físico.
- `list_products_public` filtra `is_active = true AND deleted_at IS NULL`.

### Edge cases
- Al alcanzar `max_products`, bloquear `create_product` con `LIMIT_EXCEEDED`. Mostrar `PlanUpgradePrompt`.
- Productos con variantes activas no se pueden eliminar directamente — el módulo `variants` gestiona la restricción.

---

## 3. `categories`

**Descripción:** Agrupación de productos en categorías. Soporta drag-and-drop para reordenar.
**Depende de:** `catalog`
**Tablas que posee:** `categories`, `product_categories`
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_category` | user | owner, admin | — | — | `{ name, description?, image_url?, is_active? }` | Category creada | INVALID_INPUT |
| `update_category` | user | owner, admin | — | — | `{ id, name?, description?, image_url?, is_active? }` | Category actualizada | NOT_FOUND |
| `delete_category` | user | owner, admin | — | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_categories` | user | owner, admin, collaborator | — | — | `{}` | Category[] | — |
| `list_categories_public` | system | — | — | — | `{ store_id }` | Categorías activas | — |
| `reorder_categories` | user | owner, admin | — | — | `{ ids: UUID[] }` | `{ updated: true }` | NOT_FOUND |
| `assign_product_category` | user | owner, admin | — | — | `{ product_id, category_id }` | `{ assigned: true }` | NOT_FOUND |
| `remove_product_category` | user | owner, admin | — | — | `{ product_id, category_id }` | `{ removed: true }` | NOT_FOUND |

### Componentes UI
- `CategoryList` — lista admin con drag-and-drop reorder
- `CategoryForm` — formulario crear/editar
- `CategoryFilter` — filtro horizontal en vitrina pública

### Restricciones
- Un producto puede pertenecer a múltiples categorías.
- Eliminar una categoría no elimina los productos, solo las asignaciones en `product_categories`.

### Edge cases
- Si se elimina la categoría activa en el filtro de la vitrina, resetear el filtro a "Todos".

---

## 4. `cart`

**Descripción:** Carrito de compras 100% client-side. No tiene persistencia en DB. El cierre de venta es por WhatsApp.
**Depende de:** `catalog`, `products`
**Tablas que posee:** ninguna (estado en Zustand + localStorage)
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `generate_whatsapp_message` | system | — | — | — | `{ items, store_config, shipping_method?, customer_name?, customer_notes? }` | `{ message_text, whatsapp_url }` | INVALID_INPUT |
| `validate_cart_items` | system | — | — | — | `{ items: CartItem[], store_id }` | `{ valid_items, invalid_items }` | — |

### Componentes UI
- `CartDrawer` — drawer lateral con ítems del carrito
- `CartButton` — botón flotante con badge de cantidad
- `CartItem` — fila de ítem (nombre, cantidad, precio, variante)
- `WhatsAppCheckoutButton` — botón "Enviar pedido por WhatsApp"

### Restricciones
- Estado en Zustand, persistido en localStorage. Se reinicia al confirmar pedido.
- `validate_cart_items` verifica que los productos siguen activos y existen (puede haber cambios desde que se agregaron).
- No hay lógica de descuento ni cupones en el carrito.

### Edge cases
- Producto dado de baja entre que se agrega al carrito y se intenta comprar → `validate_cart_items` lo marca como inválido y lo saca del carrito con toast de advertencia.
- Si `shipping` está activo, el carrito muestra el selector de método de envío y lo incluye en el mensaje de WhatsApp.

---

## 5. `orders`

**Descripción:** Gestión de pedidos recibidos vía WhatsApp. El dueño los registra manualmente en el panel.
**Depende de:** `catalog`, `products`, `categories`
**Tablas que posee:** `orders`, `order_items`, `customers`
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_order` | user | owner, admin, collaborator | — | max_orders/mes | `{ items: [{product_id, variant_id?, quantity, unit_price, product_name}], customer?: {name, phone, email}, notes?, total }` | Order creado | LIMIT_EXCEEDED, INVALID_INPUT, NOT_FOUND |
| `update_order_status` | user | owner, admin, collaborator | — | — | `{ id, status }` | Order actualizado | NOT_FOUND, CONFLICT (transición inválida) |
| `update_order` | user | owner, admin | — | — | `{ id, notes? }` | Order actualizado | NOT_FOUND |
| `get_order` | user | owner, admin, collaborator | — | — | `{ id }` | Order + items + customer | NOT_FOUND |
| `list_orders` | user | owner, admin, collaborator | — | — | `{ status?, page?, pageSize?, date_from?, date_to? }` | `{ items, total }` | — |
| `cancel_order` | user | owner, admin | — | — | `{ id, reason? }` | Order actualizado | NOT_FOUND, CONFLICT |

### Componentes UI
- `OrderList` — lista admin con DataTable, filtros por estado y fecha
- `OrderForm` — formulario crear pedido (búsqueda de productos precargados, búsqueda de clientes)
- `OrderDetail` — detalle de pedido con timeline de estados
- `OrderStatusBadge` — badge de color por estado
- `PDFDownloadButton` — genera comprobante PDF

### Restricciones
- `order_items` son snapshots: `product_name` y `unit_price` se copian al momento de crear el pedido. Cambios posteriores en el producto no afectan pedidos existentes.
- `max_orders` se cuenta por mes calendario (no rolling 30 días).
- Transiciones válidas de estado: `pending → confirmed → preparing → delivered`. Cualquier estado no terminal → `cancelled`.
- No hay optimistic update en crear pedido. La validación server es necesaria.

### Edge cases
- Si `stock` está activo: `create_order` invoca `process_stock_deduction` dentro de la misma transacción. Si no hay stock suficiente, el pedido no se crea.
- Si `payments` está activo: el pedido muestra estado de pago y permite registrar cobros.

---

### Módulos Activables

---

## 6. `stock`

**Descripción:** Control de inventario por producto y variante.
**Depende de:** `products`
**Tablas que posee:** `stock_items`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `update_stock` | user | owner, admin, collaborator | stock | — | `{ product_id, variant_id?, quantity, track_stock?, low_stock_threshold? }` | stock_item actualizado | NOT_FOUND, INVALID_INPUT |
| `get_stock` | user | owner, admin, collaborator | stock | — | `{ product_id, variant_id? }` | stock_item | NOT_FOUND |
| `list_stock` | user | owner, admin, collaborator | stock | — | `{ low_stock_only? }` | stock_item[] | — |
| `process_stock_deduction` | system | — | stock | — | `{ items: [{product_id, variant_id?, quantity}], store_id }` | `{ deducted: true }` | CONFLICT (sin stock suficiente) |

### Componentes UI
- `StockList` — lista de items con nivel de stock, alertas de bajo stock
- `StockEditForm` — formulario inline de actualización
- `StockBadge` — indicador visual de stock en ProductList

### Restricciones
- Si `track_stock = false` para un item, `process_stock_deduction` lo ignora (producto sin control de stock).
- `quantity >= 0` enforceado en DB.

### Edge cases
- Al llegar a 0: emite evento `stock_depleted`. Mostrar alerta en dashboard.
- Si el módulo se desactiva, los `stock_items` permanecen en DB pero no se consultan ni deducen.

---

## 7. `payments`

**Descripción:** Registro manual de cobros del dueño a sus clientes. No involucra pasarela de pago.
**Depende de:** `orders`
**Tablas que posee:** `payments`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_payment` | user | owner, admin, collaborator | payments | — | `{ order_id, amount, method, notes?, mp_payment_id? }` | Payment creado | NOT_FOUND, INVALID_INPUT |
| `update_payment_status` | user | owner, admin | payments | — | `{ id, status }` | Payment actualizado | NOT_FOUND, CONFLICT |
| `list_payments` | user | owner, admin, collaborator | payments | — | `{ order_id?, status?, page?, pageSize? }` | `{ items, total }` | — |
| `get_payment` | user | owner, admin, collaborator | payments | — | `{ id }` | Payment | NOT_FOUND |

### Componentes UI
- `PaymentList` — lista de pagos con filtros
- `PaymentForm` — formulario registrar cobro
- `PaymentStatusBadge` — badge de estado de pago
- `PaymentMethodIcon` — ícono de método (efectivo, transferencia, etc.)

### Restricciones
- `method` enum: `cash`, `transfer`, `card`, `mp`, `other`.
- Un pedido puede tener múltiples pagos parciales (cuotas, señas).
- Distinto de `billing_payments` (que es el cobro de KitDigital al dueño).

### Edge cases
- Pago en exceso (suma de pagos > total del pedido): permitido, mostrar saldo a favor en UI.

---

## 8. `variants`

**Descripción:** Variantes de producto (talle, color, etc.). Un producto puede tener múltiples variantes, cada una con precio y SKU propios.
**Depende de:** `products`
**Tablas que posee:** `variants`, `variant_attributes`, `variant_values`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_variant_attribute` | user | owner, admin | variants | — | `{ product_id, name }` | variant_attribute creado | NOT_FOUND, INVALID_INPUT |
| `list_variant_attributes` | user | owner, admin, collaborator | variants | — | `{ product_id }` | variant_attribute[] | NOT_FOUND |
| `create_variant` | user | owner, admin | variants | — | `{ product_id, values: [{attribute_id, value}], price?, sku?, is_active? }` | variant creado | NOT_FOUND, INVALID_INPUT |
| `update_variant` | user | owner, admin | variants | — | `{ id, price?, sku?, is_active? }` | variant actualizado | NOT_FOUND |
| `delete_variant` | user | owner, admin | variants | — | `{ id }` | `{ deleted: true }` | NOT_FOUND, CONFLICT |
| `list_variants` | user | owner, admin, collaborator | variants | — | `{ product_id }` | variant[] con values | NOT_FOUND |

### Componentes UI
- `VariantManager` — UI de gestión de atributos y variantes por producto
- `VariantSelector` — selector en vitrina pública (dropdown o botones por atributo)

### Restricciones
- Si un producto tiene variantes activas, el carrito requiere seleccionar variante antes de agregar.
- `delete_variant` falla si la variante tiene pedidos asociados.

### Edge cases
- Variante sin precio explícito → hereda el precio del producto padre.

---

## 9. `wholesale`

**Descripción:** Precios mayoristas por producto. Permite definir precios alternativos para clientes especiales.
**Depende de:** `products`
**Tablas que posee:** `wholesale_prices`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `set_wholesale_price` | user | owner, admin | wholesale | — | `{ product_id, price, min_quantity? }` | wholesale_price upserted | NOT_FOUND, INVALID_INPUT |
| `get_wholesale_price` | user | owner, admin, collaborator | wholesale | — | `{ product_id }` | wholesale_price | NOT_FOUND |
| `list_wholesale_prices` | user | owner, admin, collaborator | wholesale | — | `{}` | wholesale_price[] | — |

### Componentes UI
- `WholesalePriceForm` — formulario inline en ProductForm
- `WholesalePriceList` — lista de precios mayoristas exportable a CSV

### Restricciones
- Un precio mayorista por producto. Sin diferenciación por cliente (MVP).
- El precio mayorista no se muestra en la vitrina pública.

### Edge cases
- Si el módulo se desactiva, los precios en DB persisten. Al reactivarlo, los datos están disponibles.

---

## 10. `shipping`

**Descripción:** Métodos de envío que el dueño ofrece. Se muestran en el carrito para que el cliente elija.
**Depende de:** `catalog`
**Tablas que posee:** `shipping_methods`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_shipping_method` | user | owner, admin | shipping | — | `{ name, price, description?, is_active? }` | shipping_method creado | INVALID_INPUT |
| `update_shipping_method` | user | owner, admin | shipping | — | `{ id, name?, price?, description?, is_active? }` | shipping_method actualizado | NOT_FOUND |
| `delete_shipping_method` | user | owner, admin | shipping | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_shipping_methods` | user/system | todos | shipping | — | `{ store_id?, active_only? }` | shipping_method[] | — |

### Componentes UI
- `ShippingMethodList` — lista admin con toggle activo/inactivo
- `ShippingMethodForm` — formulario crear/editar
- `ShippingSelector` — selector en CartDrawer público

### Restricciones
- `price` en centavos. Puede ser 0 (envío gratis).
- El cart module incluye el shipping seleccionado en el mensaje de WhatsApp.

### Edge cases
- Si no hay métodos activos y el módulo está activo, el carrito no muestra selector de envío (lo ignora silenciosamente).

---

## 11. `finance`

**Descripción:** Flujo de caja básico. Registra ingresos y egresos para ver la situación financiera de la tienda.
**Depende de:** `catalog`
**Tablas que posee:** `finance_entries`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_finance_entry` | user | owner, admin | finance | — | `{ type, amount, category, description?, order_id?, payment_id?, date? }` | finance_entry creada | INVALID_INPUT |
| `update_finance_entry` | user | owner, admin | finance | — | `{ id, amount?, category?, description? }` | finance_entry actualizada | NOT_FOUND |
| `delete_finance_entry` | user | owner, admin | finance | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_finance_entries` | user | owner, admin | finance | — | `{ type?, date_from?, date_to?, page?, pageSize? }` | `{ items, total }` | — |
| `get_finance_summary` | user | owner, admin | finance | — | `{ date_from, date_to }` | `{ income, expenses, net }` | — |

### Componentes UI
- `FinanceEntryList` — lista con DataTable y filtros de fecha/tipo
- `FinanceEntryForm` — formulario crear/editar entrada
- `FinanceSummaryCard` — tarjeta de resumen ingreso/egreso/neto
- `FinanceChart` — gráfico de barras mensual

### Restricciones
- `type` enum: `income`, `expense`.
- `amount > 0` siempre. El tipo determina si suma o resta.

### Edge cases
- Si `payments` está activo, los pagos confirmados pueden generar `finance_entries` automáticamente (integración opcional, configurable por el dueño).

---

## 12. `expenses`

**Descripción:** Egresos detallados con categorías específicas. Complementa `finance` con granularidad en los gastos.
**Depende de:** `catalog`, `finance`
**Tablas que posee:** `expenses`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_expense` | user | owner, admin | expenses | — | `{ amount, category, description, date?, receipt_url? }` | expense creado | INVALID_INPUT |
| `update_expense` | user | owner, admin | expenses | — | `{ id, amount?, category?, description?, receipt_url? }` | expense actualizado | NOT_FOUND |
| `delete_expense` | user | owner, admin | expenses | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_expenses` | user | owner, admin | expenses | — | `{ category?, date_from?, date_to?, page?, pageSize? }` | `{ items, total }` | — |
| `get_expenses_summary` | user | owner, admin | expenses | — | `{ date_from, date_to }` | `{ by_category, total }` | — |

### Componentes UI
- `ExpenseList` — lista con DataTable y filtros
- `ExpenseForm` — formulario con ImageUploader para comprobante
- `ExpenseSummaryChart` — gráfico de torta por categoría

### Restricciones
- `category` enum: `supplies`, `rent`, `services`, `marketing`, `equipment`, `salary`, `other`.
- `receipt_url` imagen opcional (via Cloudinary).

### Edge cases
- `get_expenses_summary` puede ser costoso para rangos grandes → cachear en Redis con TTL 2min e invalidar en cada mutación.

---

## 13. `savings_account`

**Descripción:** Cuentas de ahorro virtuales. El dueño puede organizar fondos por propósito (emergencias, inversión, impuestos).
**Depende de:** `catalog`
**Tablas que posee:** `savings_accounts`, `savings_movements`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_savings_account` | user | owner, admin | savings_account | — | `{ name, description?, target_amount? }` | savings_account creada | INVALID_INPUT |
| `update_savings_account` | user | owner, admin | savings_account | — | `{ id, name?, description?, target_amount? }` | savings_account actualizada | NOT_FOUND |
| `create_savings_movement` | user | owner, admin | savings_account | — | `{ account_id, type, amount, description? }` | savings_movement creado | NOT_FOUND, CONFLICT (retiro mayor al saldo) |
| `list_savings_accounts` | user | owner, admin | savings_account | — | `{}` | savings_account[] con saldo | — |
| `list_savings_movements` | user | owner, admin | savings_account | — | `{ account_id, page?, pageSize? }` | `{ items, total }` | NOT_FOUND |

### Componentes UI
- `SavingsAccountList` — lista de cuentas con saldo y progreso hacia meta
- `SavingsMovementForm` — formulario depósito/retiro
- `SavingsProgressBar` — barra de progreso hacia target_amount

### Restricciones
- `type` de movimiento: `deposit`, `withdrawal`.
- El saldo de una cuenta no puede ser negativo.

### Edge cases
- Saldo calculado en runtime (suma de movimientos), no almacenado en columna. Cachear si hay muchos movimientos.

---

## 14. `banners`

**Descripción:** Carrusel de imágenes promocionales en la portada de la vitrina.
**Depende de:** `catalog`
**Tablas que posee:** `banners`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_banner` | user | owner, admin | banners | 10 activos | `{ image_url, title?, subtitle?, link_url?, is_active? }` | banner creado | LIMIT_EXCEEDED (>10 activos), INVALID_INPUT |
| `update_banner` | user | owner, admin | banners | — | `{ id, title?, subtitle?, link_url?, is_active? }` | banner actualizado | NOT_FOUND |
| `delete_banner` | user | owner, admin | banners | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_banners` | user/system | todos | banners | — | `{ active_only? }` | banner[] | — |
| `reorder_banners` | user | owner, admin | banners | — | `{ ids: UUID[] }` | `{ updated: true }` | NOT_FOUND |

### Componentes UI
- `BannerCarousel` — carrusel en vitrina pública (autoplay, swipe)
- `BannerList` — lista admin con drag-and-drop reorder
- `BannerForm` — formulario con ImageUploader

### Restricciones
- Máximo 10 banners activos simultáneos.

### Edge cases
- Sin banners activos → el carrusel no se renderiza (no deja espacio vacío).

---

## 15. `social`

**Descripción:** Links de redes sociales en el footer de la vitrina.
**Depende de:** `catalog`
**Tablas que posee:** ninguna (datos en `stores.config.social_links`)
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `update_social_links` | user | owner, admin | social | — | `{ social_links: { instagram?, facebook?, tiktok?, twitter?, youtube?, linkedin? } }` | config actualizado | INVALID_INPUT |
| `get_social_links` | user/system | todos | social | — | `{ store_id }` | social_links | — |

### Componentes UI
- `SocialLinksForm` — formulario con campos por red social
- `SocialLinksFooter` — íconos con links en el footer de la vitrina

### Restricciones
- Los links deben ser URLs válidas.
- Si un campo es vacío, no se muestra el ícono correspondiente.

### Edge cases
- `get_social_links` es parte de `get_store_public` — no es una llamada separada en la vitrina.

---

## 16. `product_page`

**Descripción:** Metadata extendida para la página de detalle de producto (descripción larga, especificaciones, galería).
**Depende de:** `products`
**Tablas que posee:** ninguna (datos en `products.metadata.page`)
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `update_product_page` | user | owner, admin | product_page | — | `{ product_id, long_description?, specs?: Record<string,string>, gallery_urls?: string[] }` | product actualizado | NOT_FOUND, INVALID_INPUT |
| `get_product_page` | user/system | todos | product_page | — | `{ product_id }` | `{ long_description, specs, gallery_urls }` | NOT_FOUND |

### Componentes UI
- `ProductPageEditor` — editor de descripción larga (rich text simple) + especificaciones key-value + galería
- `ProductDetailPage` — página pública `/[slug]/p/[id]` con metadata extendida

### Restricciones
- Si el módulo está inactivo, la ruta `/[slug]/p/[id]` redirige a la vitrina.
- `gallery_urls` máximo 10 imágenes.

### Edge cases
- Si `product_page` no tiene datos para un producto, la página de detalle muestra la descripción estándar del producto.

---

## 17. `multiuser`

**Descripción:** Múltiples usuarios por tienda con roles diferenciados (owner, admin, collaborator).
**Depende de:** `catalog`
**Tablas que posee:** `store_users` (excepto el registro inicial del owner)
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `invite_store_user` | user | owner, admin | multiuser | — | `{ email, role }` | `{ invited: true }` | CONFLICT (ya existe), INVALID_INPUT |
| `accept_invitation` | user | — | multiuser | — | `{ token }` | `{ accepted: true }` | NOT_FOUND (token expirado/inválido) |
| `update_store_user_role` | user | owner | multiuser | — | `{ user_id, role }` | store_user actualizado | NOT_FOUND, UNAUTHORIZED (no puede cambiar owner) |
| `remove_store_user` | user | owner, admin | multiuser | — | `{ user_id }` | `{ removed: true }` | NOT_FOUND, UNAUTHORIZED (no puede remover owner) |
| `list_store_users` | user | owner, admin | multiuser | — | `{}` | store_user[] con user info | — |

### Componentes UI
- `StoreUserList` — lista de usuarios con roles y estado de invitación
- `InviteUserForm` — formulario de invitación por email
- `RoleSelect` — selector de rol en inline edit

### Restricciones
- Invitaciones expiran en 72 horas.
- El `owner` no puede ser removido ni degradado por ningún otro usuario.
- Solo el `owner` puede cambiar roles. El `admin` solo puede invitar y remover collaborators.

### Edge cases
- Si el usuario invitado no tiene cuenta, se le envía email de registro + aceptación combinado.
- Si el plan baja y ya no incluye `multiuser`, los usuarios existentes mantienen acceso hasta fin de período.

---

## 18. `custom_domain`

**Descripción:** Permite al dueño usar su propio dominio (ej: `micatalogo.com`) en lugar del subdominio de KitDigital.
**Depende de:** `catalog`
**Tablas que posee:** ninguna (campos en `stores`: `custom_domain`, `custom_domain_verified`, `custom_domain_verified_at`)
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `set_custom_domain` | user | owner | custom_domain | — | `{ domain }` | `{ domain, verification_token }` | INVALID_INPUT, CONFLICT (dominio en uso) |
| `verify_custom_domain` | user | owner | custom_domain | — | `{ domain }` | `{ verified: true/false }` | NOT_FOUND |
| `remove_custom_domain` | user | owner | custom_domain | — | `{}` | `{ removed: true }` | — |
| `get_custom_domain_status` | user | owner, admin | custom_domain | — | `{}` | `{ domain, verified, verified_at }` | — |

### Componentes UI
- `CustomDomainForm` — formulario con instrucciones paso a paso para configurar DNS
- `CustomDomainStatus` — badge de estado (pendiente, verificado, error)

### Restricciones
- Verificación por registro `TXT` en DNS con token único generado por KitDigital.
- El middleware tiene en cuenta `custom_domain` para resolver la tienda (prioridad: `custom_domain` > `subdominio`).
- Un dominio custom solo puede apuntar a una tienda.

### Edge cases
- Si la verificación falla por propagación DNS: mostrar estado "pendiente" y permitir reintentar.

---

## 19. `tasks`

**Descripción:** Lista de tareas internas para el dueño y su equipo. Seguimiento simple de pendientes del negocio.
**Depende de:** `catalog`
**Tablas que posee:** `tasks`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_task` | user | owner, admin, collaborator | tasks | — | `{ title, description?, due_date?, assigned_to? }` | task creada | INVALID_INPUT |
| `update_task` | user | owner, admin, collaborator | tasks | — | `{ id, title?, description?, due_date?, assigned_to?, status? }` | task actualizada | NOT_FOUND |
| `complete_task` | user | owner, admin, collaborator | tasks | — | `{ id }` | task actualizada | NOT_FOUND |
| `delete_task` | user | owner, admin | tasks | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_tasks` | user | owner, admin, collaborator | tasks | — | `{ status?, assigned_to?, page?, pageSize? }` | `{ items, total }` | — |

### Componentes UI
- `TaskList` — lista con filtros por estado y asignado
- `TaskForm` — formulario crear/editar
- `TaskStatusToggle` — toggle completada/pendiente (con optimistic update)

### Restricciones
- `status` enum: `pending`, `in_progress`, `completed`.
- `assigned_to` es un `user_id` de `store_users`.

### Edge cases
- Optimistic update en `complete_task`: actualización inmediata en UI, rollback si falla.

---

## 20. `assistant`

**Descripción:** Asistente IA integrado en el panel del dueño. Propone acciones de negocio en lenguaje natural; el dueño confirma y el executor las ejecuta.
**Depende de:** `catalog`
**Tablas que posee:** `assistant_sessions`, `assistant_messages`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `get_assistant_session` | user | owner, admin, collaborator | assistant | — | `{ session_id? }` | session (nueva o existente) | — |
| `send_assistant_message` | user | owner, admin, collaborator | assistant | ai_tokens | `{ session_id, content }` | `{ message, proposed_actions? }` | LIMIT_EXCEEDED (tokens), EXTERNAL_ERROR |
| `execute_assistant_action` | ai | — | assistant | — | `{ session_id, action_name, action_input }` | ActionResult del executor | cualquier error del executor |

### Componentes UI
- `AssistantChat` — panel de chat con historial de mensajes
- `AssistantActionCard` — card de acción propuesta con botones "Confirmar" / "Ignorar"
- `AssistantTokenCounter` — indicador de tokens usados / disponibles

### Restricciones
- El assistant **propone** acciones en formato JSON; el usuario confirma.
- La ejecución de acciones pasa por el executor con `actor_type: 'ai'`.
- `ai_tokens` se descuenta por tokens de input + output de OpenAI.
- TTL de sesión: 24 horas. Después se archiva y se abre sesión nueva.
- Modelo: `gpt-4o-mini`.

### Edge cases
- Si se agotan los `ai_tokens`: bloquear `send_assistant_message` con `LIMIT_EXCEEDED`. Mostrar `PlanUpgradePrompt`.
- El cron de limpieza archiva sesiones expiradas y libera memoria de contexto.

### Tabla: Módulos por Plan

| Módulo | starter | growth | pro |
|--------|---------|--------|-----|
| catalog | ✓ | ✓ | ✓ |
| products | ✓ | ✓ | ✓ |
| categories | ✓ | ✓ | ✓ |
| cart | ✓ | ✓ | ✓ |
| orders | ✓ | ✓ | ✓ |
| stock | — | ✓ | ✓ |
| payments | — | ✓ | ✓ |
| banners | — | ✓ | ✓ |
| social | — | ✓ | ✓ |
| product_page | — | ✓ | ✓ |
| shipping | — | ✓ | ✓ |
| variants | — | add-on | ✓ |
| wholesale | — | add-on | ✓ |
| finance | — | add-on | ✓ |
| expenses | — | — | ✓ |
| savings_account | — | — | ✓ |
| multiuser | — | — | ✓ |
| custom_domain | — | — | ✓ |
| tasks | — | — | ✓ |
| assistant | — | — | ✓ |

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 9: system/tools.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Herramientas y Componentes Reutilizables

Cada herramienta se implementa como componente o utilidad independiente, reutilizable en cualquier módulo.

---

## DataTable

Tabla administrativa con funcionalidad completa.

**Props:**
- `columns` — definición de columnas (nombre, accessor, sortable, formato)
- `data` — array de datos
- `pagination` — server-side: `{ page, pageSize, total }`
- `onSort` — callback de ordenamiento server-side
- `filters` — configuración de filtros por columna
- `onExport` — callback para exportar (conecta con CSVExporter)
- `isLoading` — muestra skeleton
- `emptyState` — componente a mostrar cuando no hay datos

**Usado en:** productos, pedidos, clientes, finanzas, stock, tareas, pagos, expenses, savings.

**Incluye:** skeleton loading por defecto, empty state configurable, export CSV integrado con botón.

---

## PDFGenerator

Genera PDFs server-side con diseño profesional.

**Arquitectura:**
- API Route: `POST /api/pdf/[template]`
- Templates disponibles: `order`, `invoice`, `stock-report`, `finance-summary`
- Input: `{ template, data, store_config }`
- Output: PDF binario como respuesta

**Cada template incluye:**
- Logo de la tienda (desde `store.logo_url`)
- Nombre de la tienda y datos de contacto
- Tabla principal con los datos formateados
- Precios en formato ARS (`$X.XXX,XX`)
- Fecha de generación
- Footer con info legal mínima

**Componente UI:** `<PDFDownloadButton template="order" data={orderData} />`

**Usado en:** detalle de pedido (comprobante), resumen de finanzas, reporte de stock, listado de productos.

---

## CSVImporter

Importación de datos desde archivo CSV.

**Flujo:**
1. Upload del archivo (drag & drop o selección)
2. Parseo automático (detección de separador, encoding)
3. Mapeo de columnas (preview de primeras 5 filas)
4. Validación con Zod fila por fila
5. Preview de resultados: filas válidas (verde) y filas con errores (rojo + motivo)
6. Botón "Confirmar importación" ejecuta bulk insert vía executor
7. Resumen final: N importados, M errores

**Props:**
- `entity` — tipo de entidad (`products`, `customers`, `wholesale_prices`)
- `schema` — Zod schema para validación de cada fila
- `onSuccess` — callback al completar
- `onError` — callback si falla

**Usado en:** importar productos en bulk, subir lista de clientes, precios mayoristas.

---

## CSVExporter

Exportación de datos a CSV.

**Props:**
- `data` — array de objetos
- `columns` — cuáles columnas incluir y en qué orden
- `filename` — nombre del archivo de descarga
- `formatters` — funciones de formato por columna (ej: centavos → ARS)

**Funcionalidad:** genera blob CSV con encoding UTF-8 BOM (para compatibilidad con Excel en español), headers limpios, y descarga automática.

**Usado en:** pedidos, productos, clientes, finanzas, stock. Integrado en DataTable como botón de export.

---

## ImageUploader

Wrapper de Cloudinary para upload de imágenes.

**Props:**
- `onUpload(urls: string[])` — callback con URLs subidas
- `maxFiles` — máximo de archivos (validado antes de subir)
- `folder` — subcarpeta en Cloudinary (`products`, `banners`, `store`)
- `accept` — tipos MIME permitidos (default: `image/*`)
- `maxSizeMB` — tamaño máximo por archivo (default: 5MB)
- `storeId` — para armar el path `kitdigital/{storeId}/{folder}/`

**Incluye:** zona de drag & drop, preview de imagen seleccionada, barra de progreso, error state, botón de eliminar imagen.

**Usado en:** productos (hasta N imágenes según plan), banners, logo de tienda, avatar, comprobantes de gasto.

---

## WhatsAppMessageBuilder

Genera el mensaje formateado para WhatsApp.

**Input:**
- `items` — array de `{ name, quantity, unit_price, variant_label? }`
- `storeConfig` — `{ name, whatsapp, currency }`
- `shippingMethod?` — `{ name, price }`
- `customerName?`
- `customerNotes?`

**Output:**
- `messageText` — texto plano formateado con emojis y precios
- `whatsappUrl` — URL `https://wa.me/{phone}?text={encoded_message}`

**Formato del mensaje:**
```
🛒 *Pedido desde {storeName}*

📦 Productos:
• 2x Remera básica — $3.000
• 1x Jean slim — $8.500

🚚 Envío: Envío a domicilio — $500

💰 *Total: $12.000*

👤 Nombre: Juan
📝 Nota: Talle M en la remera

_Enviado desde KitDigital.ar_
```

**Lógica 100% client-side.** No toca backend. Usa datos del store de Zustand (carrito).

**Usado en:** CartDrawer → WhatsAppCheckoutButton.

---

## CurrencyFormatter

Formatea centavos a moneda legible.

**Funciones:**
- `formatPrice(cents: number, currency?: string): string` — ej: `150000` → `"$1.500,00"`
- `formatPriceShort(cents: number): string` — ej: `150000` → `"$1.500"`

**Hook:** `useCurrency()` — retorna `{ formatPrice, formatPriceShort, currency }` desde store config.

**Locale:** `es-AR`. Separador de miles: `.`. Separador decimal: `,`.

---

## DateFormatter

Formatea fechas para la UI.

**Funciones:**
- `formatDate(date: string | Date): string` — ej: `"12 abr 2026"`
- `formatDateTime(date: string | Date): string` — ej: `"12 abr 2026, 14:30"`
- `formatRelative(date: string | Date): string` — ej: `"hace 2 horas"`, `"ayer"`, `"hace 3 días"`

**Locale:** `es-AR`.

---

## ModalManager

Estado centralizado de modales.

**Store Zustand:**
```typescript
type ModalStore = {
  activeModal: string | null
  modalData: unknown
  open: (name: string, data?: unknown) => void
  close: () => void
}
```

**API de uso:**
```typescript
const { open } = useModalStore()
open('delete-product', { productId: '...' })
```

**Componente:** `<ModalContainer>` en el layout raíz que renderiza el modal activo según `activeModal`.

---

## ToastSystem

Notificaciones globales.

**Basado en:** sonner.

**Uso:**
```typescript
import { toast } from 'sonner'
toast.success('Producto creado')
toast.error('No se pudo guardar')
toast.loading('Guardando...')
```

**Integrado en:** todas las mutations de TanStack Query (onSuccess/onError).

---

## ModuleGate

Wrapper que bloquea UI si un módulo está inactivo.

**Props:**
- `module` — nombre del módulo (ModuleName)
- `fallback?` — componente alternativo (default: `<ModuleLockedState>`)

**Comportamiento:**
- Lee `store.modules` del StoreContext
- Si el módulo está activo → renderiza children
- Si está inactivo → renderiza fallback con nombre del módulo, descripción, y botón "Activar"

---

## PlanUpgradePrompt

Se muestra cuando se alcanza un límite.

**Props:**
- `limitType` — qué límite se alcanzó (`max_products`, `max_orders`, `ai_tokens`)
- `current` — valor actual
- `max` — valor máximo del plan
- `planTarget?` — plan al que debe subir

**Componente:** card con progreso visual, mensaje claro, y CTA "Mejorar plan" → navega a `/admin/billing`.
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 10: system/realtime.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Reactividad, Caché y Sincronización

Este archivo define cómo el sistema mantiene los datos frescos, cuándo usar SSR vs SPA, qué datos se cachean y por cuánto tiempo, y cómo se propagan los cambios entre secciones del panel.

---

## SPA vs SSR — Decisión por Área

| Área | Estrategia | Razón |
|------|-----------|-------|
| Vitrina pública (catálogo, producto, categorías) | SSR + ISR (60s) | SEO, velocidad de carga, Open Graph |
| Vitrina pública (carrito) | Client Component (Zustand) | Estado local, sin SEO |
| Panel admin (layout, sidebar, nav) | Server Component | No cambia con datos |
| Panel admin (secciones de datos) | Client Components + TanStack Query | Interactividad, caché, refetch |
| Dashboard estadísticas | Client + polling cada 60s | Datos frescos sin realtime |
| Lista de pedidos | Client + Supabase Realtime | Actualizaciones push inmediatas |
| Configuración de tienda | Client | Formularios, sin SEO |
| Superadmin | Client + TanStack Query | Interno, sin SEO |

---

## Capas de Estado

| Capa | Tecnología | Qué contiene |
|------|-----------|-------------|
| Servidor | Supabase Postgres | Fuente de verdad absoluta |
| Caché servidor | Upstash Redis | Queries costosas, stats agregadas |
| Caché cliente | TanStack Query | Datos del servidor en el browser |
| Estado UI | Zustand | Carrito, modales, sidebar, notificaciones |
| Estado local | useState | Formularios, toggles efímeros |

---

## StaleTime por Entidad (TanStack Query)

Cuánto tiempo el dato en caché se considera "fresco" (no se refetcha):

| Query Key | staleTime | gcTime | Notas |
|-----------|-----------|--------|-------|
| `['dashboard-stats', storeId]` | 30s | 2min | También polling cada 60s |
| `['orders', storeId]` | 10s | 5min | + Realtime invalidation |
| `['orders', storeId, orderId]` | 15s | 5min | Detalle de pedido |
| `['products', storeId]` | 2min | 10min | Cambian menos frecuentemente |
| `['categories', storeId]` | 2min | 10min | |
| `['customers', storeId]` | 2min | 10min | |
| `['stock', storeId]` | 20s | 3min | Crítico post-venta |
| `['payments', storeId]` | 30s | 5min | |
| `['finance-entries', storeId]` | 1min | 5min | + invalidación tras pago/venta |
| `['expenses', storeId]` | 2min | 5min | |
| `['tasks', storeId]` | 1min | 5min | |
| `['store-config', storeId]` | 5min | 30min | Casi no cambia |
| `['store-modules', storeId]` | 10min | 60min | Solo cambia al upgradear |
| `['banners', storeId]` | 5min | 15min | |
| `['shipping-methods', storeId]` | 5min | 15min | |
| `['savings', storeId]` | 2min | 10min | |
| `['plans']` | 30min | 60min | Casi nunca cambia |

---

## Invalidaciones en Cadena

Cuando ocurre un evento, qué queries se invalidan:

### Nueva orden registrada (`order_created`)
```
invalidar: ['orders', storeId]
invalidar: ['dashboard-stats', storeId]
invalidar: ['customers', storeId]  (si se creó customer nuevo)
si módulo stock activo:
  invalidar: ['stock', storeId]
```

### Pago registrado/aprobado (`payment_approved`)
```
invalidar: ['orders', storeId, orderId]
invalidar: ['payments', storeId]
invalidar: ['dashboard-stats', storeId]
si módulo finance activo:
  invalidar: ['finance-entries', storeId]
```

### Stock deducido (`stock_updated`)
```
invalidar: ['stock', storeId]
invalidar: ['products', storeId]  (disponibilidad en vitrina)
```

### Producto creado/editado (`product_created`, `product_updated`)
```
invalidar: ['products', storeId]
invalidar: ['categories', storeId]  (conteo de productos por categoría)
revalidar vitrina: revalidatePath(`/${slug}`)
```

### Producto eliminado (`product_deleted`)
```
invalidar: ['products', storeId]
invalidar: ['categories', storeId]
invalidar: ['stock', storeId]  (si tenía stock)
revalidar vitrina: revalidatePath(`/${slug}`)
```

### Estado de tienda cambiado (`store_status_changed`)
```
invalidar: ['store-config', storeId]
invalidar: ['store-modules', storeId]
```

### Módulo activado/desactivado (`module_enabled`, `module_disabled`)
```
invalidar: ['store-config', storeId]
invalidar: ['store-modules', storeId]
```

### Categoría creada/editada/eliminada
```
invalidar: ['categories', storeId]
invalidar: ['products', storeId]  (por filtro de categoría)
revalidar vitrina: revalidatePath(`/${slug}`)
```

### Banner creado/editado/eliminado
```
invalidar: ['banners', storeId]
revalidar vitrina: revalidatePath(`/${slug}`)
```

### Finance entry o expense creado
```
invalidar: ['finance-entries', storeId]
invalidar: ['expenses', storeId]
invalidar: ['dashboard-stats', storeId]
```

### Tarea completada/actualizada
```
invalidar: ['tasks', storeId]
```

### Savings movement creado
```
invalidar: ['savings', storeId]
invalidar: ['finance-entries', storeId]  (si vinculada)
```

---

## Supabase Realtime — Canales en Panel Admin

Realtime se activa solo dentro del AdminLayout. Se desactiva al salir.

| Canal | Tabla | Eventos | Handler |
|-------|-------|---------|---------|
| `orders-{storeId}` | `orders` | INSERT, UPDATE | Invalida `['orders']`, toast "Nueva orden" en INSERT |
| `payments-{storeId}` | `payments` | INSERT, UPDATE | Invalida `['payments']`, `['orders']` |
| `stock-{storeId}` | `stock_items` | UPDATE | Invalida `['stock']` |

Reglas:
- Los canales usan filtro `store_id=eq.{storeId}` para no recibir datos de otras tiendas.
- Cleanup: `unsubscribe()` en el `useEffect` cleanup del AdminLayout.
- Fallback: si Realtime falla, los staleTime de TanStack Query garantizan refresco periódico.

---

## Lógica de Tabs en Panel Admin

El panel admin tiene secciones organizadas en tabs o routes. Comportamiento:

| Acción | Comportamiento |
|--------|---------------|
| Tab no visitada aún | No se fetcha nada (lazy) |
| Tab visitada por primera vez | Fetch + caché en TanStack Query |
| Tab re-visitada | Sirve de caché inmediatamente + refetch en background si stale |
| Hover sobre tab (datos livianos) | Prefetch |
| Hover sobre tab (datos pesados: reportes) | No prefetch |
| Error en una sección | ErrorBoundary por sección; no rompe el resto |
| Loading de primera carga | Skeleton por sección |

---

## Optimistic Updates — Dónde Aplicar

| Acción | Optimistic | Razón |
|--------|-----------|-------|
| Cambio de estado de pedido | Sí | Rápido, reversible |
| Toggle módulo en config | Sí | Feedback instantáneo |
| Marcar tarea como completada | Sí | Acción frecuente |
| Actualizar precio de producto | Sí | Feedback rápido |
| Toggle activo/inactivo producto | Sí | Muy frecuente |
| Reorder (drag & drop) | Sí | Visual inmediato |
| Crear pedido | No | Depende de validaciones server |
| Crear/eliminar producto | No | Irreversible o complejo |
| Pagos / billing | No | Crítico, no arriesgar |
| Importación CSV | No | Resultado depende de validación |

---

## Panel de Ventas — Optimizaciones

El panel de creación de nueva orden debe ser especialmente rápido:

1. **Productos precargados:** al entrar al admin, se hace prefetch de `['products', storeId]`. La lista de productos ya está en caché cuando el dueño quiere crear un pedido.
2. **Clientes en caché local:** búsqueda client-side sobre el caché de `['customers', storeId]`.
3. **Formulario 100% client-side** con React Hook Form. Sin roundtrips hasta el submit.
4. **Submit → server action → al completar, invalidar `['orders', storeId]` → lista se refresca.** Sin optimistic update: la validación server (stock, límites, estado de tienda) es necesaria antes de mostrar el pedido como confirmado.
5. **Target: <300ms de feedback visual** via loading state explícito en el botón submit (spinner + disabled) mientras la server action procesa.

---

## Caché Redis (Upstash) — Qué Cachear Server-Side

| Key Pattern | Dato | TTL | Invalidación |
|------------|------|-----|-------------|
| `store:{storeId}:products:public` | Productos activos para vitrina | 5min | `product_created`, `product_updated`, `product_deleted` |
| `store:{storeId}:categories:public` | Categorías activas para vitrina | 5min | Cambio en categorías |
| `store:{storeId}:config` | Config pública de la tienda | 10min | `store_updated` |
| `store:{storeId}:stats:dashboard` | Stats del dashboard | 2min | Cualquier mutation relevante |
| `global:plans` | Lista de planes | 1h | Cambio en planes (superadmin) |

Keys siempre con prefijo `store:{storeId}:` para aislamiento multitenant.
Invalidación asíncrona (fire and forget) desde el executor paso 9.
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 11: system/executor.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Executor — Motor Central del Sistema

El executor es la función centralizada que ejecuta toda operación de negocio. Todo request (de usuario, IA o sistema) pasa por este pipeline sin excepción.

---

## Firma

```typescript
async function executor(params: {
  name:     string
  store_id: string | null
  actor:    { type: ActorType; id: string | null }
  input:    object
}): Promise<ActionResult>
```

## Retorno

```typescript
type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string; field?: string } }
```

---

## Pipeline de Ejecución (10 pasos)

```
1. Resolver action handler (del registry)
2. Validar store_id + estado de tienda
3. Validar actor y permisos
4. Validar módulos requeridos activos
5. Validar límites del plan
6. Validar input de negocio (Zod + reglas del módulo)
7. Ejecutar lógica del módulo (dentro de transacción)
8. Emitir evento (dentro de la misma transacción)
9. Invalidar caché afectado (async, post-commit)
10. Devolver resultado
```

Si cualquier paso falla, se retorna el error y no se avanza.

---

## Detalle de Cada Paso

### Paso 1 — Resolver handler
Busca en el registry el handler para `name`. Si no existe → `SYSTEM_ERROR`.

### Paso 2 — Validar tienda
- Verificar que `store_id` no es null (salvo operaciones globales de superadmin)
- Cargar tienda desde DB o StoreContext
- Verificar que existe → `NOT_FOUND`
- Verificar que el status permite la operación:

| Status | Permitido |
|--------|----------|
| `demo` | CORE + módulos base |
| `active` | Todo |
| `past_due` | Solo lecturas (GET, LIST) |
| `suspended` | Nada → `STORE_INACTIVE` |
| `archived` | Nada → `STORE_INACTIVE` |

### Paso 3 — Validar actor y permisos
- Verificar que el actor está autenticado según su tipo
- Verificar que tiene el rol requerido en `permissions` del handler
- Para `user`: verificar en `store_users` que tiene rol permitido
- Si no tiene permiso → `UNAUTHORIZED`

### Paso 4 — Validar módulos
- Para cada módulo en `handler.requires`: verificar `store.modules[modulo] === true`
- Si alguno inactivo → `MODULE_INACTIVE`
- Actions CORE tienen `requires: []` y pasan sin verificación

### Paso 5 — Validar límites
Solo aplica si el handler declara un límite a verificar (`max_products`, `max_orders`, `ai_tokens`).
- Contar entidades actuales con scope de tienda
- Si `current >= limit` → `LIMIT_EXCEEDED`

### Paso 6 — Validar input de negocio
El handler ejecuta sus validaciones específicas:
- Referencias a otras entidades existen y pertenecen a la misma tienda
- Valores en rangos válidos
- Estados consistentes con la operación
- Error → código apropiado (`NOT_FOUND`, `CONFLICT`, `INVALID_INPUT`)

### Paso 7 — Ejecutar lógica (transacción)
- BEGIN TRANSACTION
- Handler ejecuta writes en sus tablas
- Si necesita datos de otro módulo, los lee dentro de la transacción
- Si necesita invocar action de otro módulo: llamada recursiva al executor con misma transacción (omite pasos 2-4 ya validados)
- Si falla → ROLLBACK

### Paso 8 — Emitir evento (misma transacción)
```sql
INSERT INTO events (store_id, type, actor_type, actor_id, data)
VALUES ($1, $2, $3, $4, $5)
```
Si falla el insert del evento → ROLLBACK completo.
COMMIT solo si todo ok.

### Paso 9 — Invalidar caché (post-commit)
Cada handler declara qué cache keys invalida:
```typescript
invalidates: ['store:{store_id}:products:public', 'store:{store_id}:categories']
```
Invalidación async (fire and forget). Si falla, los datos se refrescan al expirar el TTL.

### Paso 10 — Retornar resultado
```typescript
return { success: true, data: handler.output }
```

---

## Registro de Handlers

Cada handler se registra en `src/lib/executor/registry.ts`:

```typescript
type ActionHandler = {
  name:        string
  requires:    ModuleName[]
  permissions: (StoreUserRole | 'superadmin' | 'system' | 'ai')[]
  limits?:     { field: string; countQuery: (storeId: string) => Promise<number> }
  event_type:  string | null
  invalidates: string[]
  validate:    (input: unknown, context: StoreContext) => ValidationResult
  execute:     (input: unknown, context: StoreContext, db: Transaction) => Promise<unknown>
}
```

---

## Superadmin

El superadmin bypasea pasos 2d (estado de tienda) y 3b (permisos de rol por tienda).
No bypasea: validación de datos (paso 6-7), emisión de evento (paso 8). Siempre deja traza con `actor_type: 'superadmin'`.

## Actor IA

El actor `ai` usa exactamente el mismo pipeline. No tiene modo especial. La única diferencia: `actor_type` se registra como `'ai'` en el evento, y se verifica que la action esté habilitada para IA.
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 12: system/frontend.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Frontend — Reglas, Estructura y Design System

---

## Stack

- Next.js 15 App Router, TypeScript estricto
- Tailwind CSS v3, shadcn/ui (default/slate), next-themes
- TanStack Query v5 (data fetching), Zustand (estado UI)
- React Hook Form + Zod (formularios)
- Lucide React (íconos), sonner (toasts)

---

## Tres Superficies

| Superficie | Rutas | Audiencia | Layout |
|-----------|-------|-----------|--------|
| Vitrina pública | `/(public)/[slug]/*` | Clientes de la tienda | PublicLayout |
| Panel admin | `/(admin)/admin/*` | Dueño + equipo | AdminLayout |
| Panel superadmin | `/(superadmin)/superadmin/*` | Operador KitDigital | SuperadminLayout |

Cada superficie tiene su propio layout raíz. No comparten header ni nav. Sí comparten componentes primitivos (Button, Input, DataTable).

---

## Estructura de Carpetas

```
src/
├── app/
│   ├── (public)/[slug]/
│   │   ├── page.tsx                → catálogo
│   │   ├── [category]/page.tsx     → categoría
│   │   └── p/[id]/page.tsx         → producto
│   ├── (admin)/admin/
│   │   ├── layout.tsx              → AdminLayout
│   │   ├── page.tsx                → dashboard
│   │   ├── products/
│   │   ├── categories/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── stock/
│   │   ├── payments/
│   │   ├── finance/
│   │   ├── expenses/
│   │   ├── savings/
│   │   ├── tasks/
│   │   ├── banners/
│   │   ├── shipping/
│   │   ├── settings/
│   │   └── billing/
│   ├── (superadmin)/superadmin/
│   │   ├── layout.tsx
│   │   ├── stores/
│   │   ├── plans/
│   │   ├── events/
│   │   └── metrics/
│   ├── api/webhooks/mercadopago/
│   └── providers.tsx
├── components/
│   ├── ui/                         → shadcn base
│   ├── admin/                      → componentes de panel
│   ├── public/                     → componentes de vitrina
│   └── shared/                     → compartidos (DataTable, EmptyState, etc.)
├── lib/
│   ├── supabase/                   → clients (browser, server, service-role)
│   ├── executor/                   → index.ts, registry.ts
│   ├── hooks/                      → TanStack Query hooks
│   ├── stores/                     → Zustand stores
│   ├── utils/                      → currency, date, format
│   ├── validations/                → Zod schemas
│   ├── db/queries/                 → funciones de lectura
│   ├── billing/                    → MP integration
│   └── types/                      → database.ts, index.ts
└── middleware.ts
```

---

## Reglas de Frontend

1. **Mobile-first.** Todo se diseña primero para móvil. Breakpoints: `sm` (640), `md` (768), `lg` (1024), `xl` (1280).

2. **Data fetching solo con TanStack Query.** Nunca `fetch` directo ni `useEffect` para fetching.

3. **Zustand solo para UI.** Datos del servidor en TanStack Query. Zustand para: carrito, modales, sidebar, notificaciones.

4. **Formularios con RHF + Zod.** El schema Zod es compartido con el backend para consistencia.

5. **Módulo inactivo = UI bloqueada.** `ModuleGate` muestra `ModuleLockedState`, no 404.

6. **Optimistic updates** para acciones frecuentes y reversibles. No para acciones destructivas o de billing.

7. **Errores visibles y no técnicos.** Toast para errores de negocio. Banner global para errores de red. Nunca stack traces ni JSON crudo al usuario.

8. **Loading states explícitos.** Skeleton por sección. Botón submit con spinner + disabled. Nunca pantalla en blanco.

9. **Accesibilidad básica.** Labels en inputs, focus visible, contraste WCAG AA, navegación por teclado en formularios y modales.

10. **Renders estratégicos.** Vitrina: SSR + ISR. Panel: Client Components + TanStack Query. Layout/nav: Server Components.

11. **Imágenes con next/image.** Nunca `<img>` directo.

12. **Lazy loading de módulos no-core.** `dynamic()` para secciones de módulos avanzados.

13. **Virtualización** para listas de más de 100 ítems (TanStack Virtual).

14. **Textos en constantes** en `src/lib/copy/` para facilitar futuras traducciones. Locale: `es-AR`.

15. **Guards de ruta en middleware.** No en componentes. Si el middleware permite el acceso, el componente asume autenticación.

---

## Tokens de Diseño

```
brand:   { DEFAULT, light, dark }    → configurados por el humano en pausa de diseño
success: { DEFAULT: '#22c55e', light: '#f0fdf4' }
warning: { DEFAULT: '#f59e0b', light: '#fffbeb' }
error:   { DEFAULT: '#ef4444', light: '#fef2f2' }
```

Tipografía, logo y favicon se definen en la pausa de diseño.
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 13: system/billing.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Billing — Planes, Suscripciones y Mercado Pago

---

## Modelo

```
Total mensual = precio_plan_base + Σ precio_módulos_adicionales_activos
```

Cobro mediante Mercado Pago Suscripciones (recurrente automático). KitDigital no almacena datos de tarjeta.

---

## Planes

| Plan | Productos | Pedidos/mes | IA Tokens | Módulos incluidos |
|------|-----------|-------------|-----------|-------------------|
| `starter` | 30 | 100 | 0 | CORE (5 módulos) |
| `growth` | 200 | 500 | 1000 | 11 módulos + add-ons |
| `pro` | 1000 | ilimitados | 5000 | Todos (20 módulos) |

Precios definidos por superadmin en tabla `plans`. Trial (demo): 14 días, sin tarjeta, límites del starter.

---

## Módulos Adicionales (add-ons)

Los módulos no incluidos en el plan se cobran como add-on mensual. Precios en `plans.module_prices`.

- Activar: costo se agrega al próximo período. Módulo disponible inmediato.
- Desactivar: módulo se desactiva inmediato. Sin devolución. Costo se quita del próximo período.

---

## Ciclo de Facturación

```
Día 0   → Tienda activada. Primer cobro. billing_cycle_anchor = hoy.
Día 30  → MP cobra automáticamente.
           Éxito → billing_status permanece 'active'. Período renovado.
           Fallo → billing_status → 'past_due'.
Día 60  → 30 días en 'past_due' → billing_status → 'archived'. Datos conservados 90 días.
```

---

## Flujo de Alta de Suscripción

1. Dueño elige plan en `/admin/billing`
2. Backend crea suscripción en MP vía API (`POST /preapproval`)
3. MP devuelve `init_point` (URL de pago)
4. Dueño redirigido a MP para ingresar método de pago
5. MP cobra primer mes y notifica vía webhook
6. Webhook handler: `billing_status → 'active'`, registra `mp_subscription_id`
7. Evento: `billing_activated`

---

## Flujo de Cambio de Plan

- Upgrade (precio mayor): cambio inmediato. Cobro prorrateado de la diferencia.
- Downgrade (precio menor): cambio al inicio del próximo período. Sin devolución.
- Si el nuevo plan tiene límites menores a los activos (ej: 200 productos con plan de 30), el dueño debe reducir primero.

---

## Flujo de Cancelación

1. Dueño cancela desde panel o superadmin cancela manualmente
2. Se cancela suscripción en MP vía API
3. Acceso continúa hasta fin del período actual pagado
4. Al vencer → `past_due` → 30 días → `archived`

---

## Webhooks de Mercado Pago

**Endpoint:** `POST /api/webhooks/mercadopago/billing`

**Pipeline:**
1. Verificar firma HMAC-SHA256 con `MP_WEBHOOK_SECRET`
2. Parsear payload
3. Verificar idempotencia en `billing_webhook_log`
4. Consultar estado actual en API de MP
5. Resolver `store_id` desde `mp_subscription_id`
6. Ejecutar lógica según tipo
7. Registrar evento
8. Marcar como procesado en `billing_webhook_log`
9. Responder 200

**Topics procesados:**
- `payment` (approved): renovar período, `billing_status → 'active'`
- `payment` (rejected/cancelled): `billing_status → 'past_due'` si estaba active
- `subscription_preapproval` (authorized): alta de suscripción
- `subscription_preapproval` (cancelled): registrar `cancelled_at`, acceso hasta fin de período
- `subscription_preapproval` (paused): `billing_status → 'past_due'`

**Reintentos:** webhooks fallidos se encolan en Redis. Max 5 intentos con backoff (1min, 5min, 15min, 1h, 6h). Después → `failed` + alerta a superadmin.

---

## Reglas de Billing

1. Nunca cobrar dos veces el mismo período (idempotencia por `mp_payment_id`).
2. Billing de KitDigital es independiente del módulo `payments` (que gestiona cobros del dueño a sus clientes).
3. Precios siempre de tabla `plans`. Nunca hardcodeados.
4. Límites se aplican en tiempo de ejecución vía executor.
5. Superadmin puede override de billing manualmente. Siempre con evento registrado.
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 14: system/auth.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Autenticación, Roles y Permisos

---

## Roles Globales (users.role)

| Rol | Descripción |
|-----|-------------|
| `user` | Usuario estándar. Acceso a tiendas donde tiene store_user. |
| `superadmin` | Operador global. Acceso a todo el sistema. No pertenece a ninguna tienda. |

---

## Roles por Tienda (store_users.role)

| Rol | Permisos |
|-----|----------|
| `owner` | Acceso total. Billing, configuración, módulos, usuarios, todo. |
| `admin` | Casi como owner. Sin billing ni transferencia de ownership. |
| `collaborator` | Operativo: ver/editar productos, ver/actualizar pedidos. Sin configuración, módulos ni billing. |

---

## Middleware Multitenant

El middleware de Next.js resuelve el contexto antes de cualquier handler:

1. **Rutas públicas** (`/(public)/[slug]/*`): resolver tienda por slug del subdominio o path. Sin autenticación.
2. **Rutas admin** (`/(admin)/admin/*`): requiere sesión. Resolver store_id del usuario. Si tiene múltiples tiendas, usar la activa en sesión.
3. **Rutas superadmin** (`/(superadmin)/superadmin/*`): requiere sesión con `role === 'superadmin'`.

El `StoreContext` se construye en servidor y se propaga:
```typescript
StoreContext = {
  store_id: UUID
  slug: string
  status: StoreStatus
  modules: Record<ModuleName, boolean>
  limits: { max_products: number; max_orders: number; ai_tokens: number }
}
```

---

## Resolución de Tienda

Orden de precedencia:
1. **Subdominio:** `{slug}.kitdigital.ar` → buscar store por slug
2. **Dominio custom:** leer Host header → buscar store por `custom_domain` (si módulo activo y dominio verificado)
3. **Sesión admin:** store_id del store_user del usuario autenticado

---

## Row Level Security (RLS)

Todas las tablas de dominio tienen RLS habilitado.

Política base: `store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())`

Vitrina pública: políticas adicionales que permiten SELECT sin autenticación en productos, categorías y banners activos de tiendas con status `demo`, `active` o `past_due`.

Superadmin: bypasea RLS usando `service_role` key.

RLS es la última línea de defensa. El backend también filtra por `store_id` en todas las queries.

---

## Aislamiento de Medios (Cloudinary)

```
kitdigital/{store_id}/products/{filename}
kitdigital/{store_id}/banners/{filename}
kitdigital/{store_id}/store/{filename}
```

El `store_id` en el path se verifica en backend antes del upload.

---

## Aislamiento de Cache (Redis)

```
store:{store_id}:products
store:{store_id}:categories
store:{store_id}:config
```

Solo se invalidan keys del `store_id` afectado.

---

## Invitaciones (módulo multiuser)

1. Owner/admin invita por email con rol
2. Se crea `store_user` con `accepted_at = null`
3. Se genera token de invitación
4. Invitado recibe email con link
5. Al aceptar → `accepted_at = NOW()`
6. Si el email no tiene cuenta, la invitación queda pendiente hasta que se registre
7. Expiración: 72 horas
```

---

# ═══════════════════════════════════════════════════════════════
# SECCIÓN 15: system/superadmin.md
# ═══════════════════════════════════════════════════════════════

```markdown
# Superadmin — Panel Interno de Operaciones

Acceso: `/superadmin/*`. Solo `users.role === 'superadmin'`. Sin RLS (usa service_role).

---

## Capacidades

### Gestión de Tiendas
- Listar todas las tiendas (con filtros por status, plan, fecha)
- Ver detalle de cualquier tienda (config, módulos, billing, usuarios)
- Cambiar status de tienda (active, suspended, archived)
- Cambiar plan de tienda
- Override de módulos (activar/desactivar individualmente)
- Override de límites (max_products, max_orders, ai_tokens)
- Extender trial (modificar trial_ends_at)
- Impersonar tienda (acceso lectura al panel como si fuera el owner)

### Gestión de Usuarios
- Listar usuarios
- Ban/unban usuario
- Ver tiendas de un usuario

### Gestión de Planes
- CRUD de planes (crear, editar, desactivar)
- Modificar precios de módulos add-on

### Auditoría
- Ver tabla de eventos (filtros por tienda, tipo, fecha, actor)
- Ver log de webhooks de billing (`billing_webhook_log`)
- Ver billing payments por tienda

### Métricas
- MRR (Monthly Recurring Revenue)
- Tiendas activas por plan
- Churn rate
- Tasa de conversión demo → active
- Top tiendas por pedidos/mes

---

## Seguridad

- Toda acción de superadmin genera evento con `actor_type: 'superadmin'`.
- Doble confirmación en acciones destructivas (archivar tienda, ban usuario).
- Impersonation es solo lectura; no puede modificar datos como el owner.
- El superadmin nunca ve datos de tarjeta (manejados por MP).
```

---

# ═══════════════════════════════════════════════════════════════
# INSTRUCCIONES PARA EL AGENTE EJECUTOR
# ═══════════════════════════════════════════════════════════════

El agente que reciba este documento debe:

1. **Crear la estructura de carpetas** del nuevo repo según "Estructura del Nuevo Repo"
2. **Generar cada archivo** con el contenido exacto especificado en las secciones 1-15
3. **Para `system/modules.md`**: copiar exactamente la sección 8 de este documento. El formato canónico completo (actions con firma, componentes UI, restricciones, edge cases) ya está expandido en este mismo documento. No inferir ni inventar nada adicional.
4. **Para `schema.sql`**: generar el SQL exacto de la sección 6. Es ejecutable directamente en Supabase SQL Editor. Incluye `BEGIN`/`COMMIT`, la función `store_allows_writes()`, el trigger `sync_store_status()` y todas las políticas RLS completas.
5. **Verificar congruencia**: no debe haber contradicciones entre archivos. Un dato existe en un solo lugar. Las referencias cruzadas apuntan a secciones reales.
6. **No agregar contenido que no esté en este documento.** Si algo no está especificado aquí, no se inventa.
7. **No agregar notas, comentarios de IA, disclaimers o metadatos.** Los archivos son documentación limpia para uso en producción.

## Verificación Post-Generación

El agente que ejecute este plan debe verificar antes de dar por completado el trabajo:

- [ ] `schema.sql` contiene exactamente 28 tablas (`CREATE TABLE`) y políticas RLS para cada una de ellas — sin comentarios "análogo" ni placeholders
- [ ] `plans` tiene `ALTER TABLE plans ENABLE ROW LEVEL SECURITY` y la política `plans_public_select`
- [ ] La función `store_allows_writes()` está definida antes de las políticas que la usan
- [ ] Las políticas de INSERT/UPDATE/DELETE en tablas de dominio incluyen `AND store_allows_writes(store_id)` o `AND store_allows_writes(id)` (stores)
- [ ] El trigger `sync_store_status()` está definido en la tabla `stores`
- [ ] `users` tiene la columna `banned_at TIMESTAMPTZ`
- [ ] `product_categories.store_id` tiene `REFERENCES stores(id) ON DELETE CASCADE`
- [ ] El SQL empieza con `BEGIN;` y termina con `COMMIT;`
- [ ] `system/modules.md` contiene los 20 módulos con el formato completo (actions table, componentes UI, restricciones, edge cases)
- [ ] `README.md` menciona `Node 22 + pnpm` en la tabla de stack
- [ ] `START.md` incluye las 3 reglas de runtime (Node, Tailwind, subdominios dev/prod)
- [ ] `PASOS-MANUALES.md` incluye la sección 9 sobre desarrollo local sin subdominios
- [ ] `system/realtime.md` no dice "optimistic en lista de pedidos" — dice "sin optimistic update"
- [ ] `system/domain.md` documenta la excepción de `events.store_id` nullable

---

**Fin del documento maestro.**
