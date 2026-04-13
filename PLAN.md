# Plan Maestro de Ejecución

Este documento define el orden exacto de implementación. Cada fase tiene pasos numerados con criterios de aceptación.

---

## F0 — Setup Inicial

**Objetivo:** Proyecto Next.js funcional con DB, tipos, executor y middleware.

### 0.1 Crear proyecto Next.js + estructura

```bash
pnpm create next-app@latest kitdigital --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
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

**Criterio:** `pnpm dev` funciona. Estructura de carpetas existe.

### 0.2 Instalar dependencias

```bash
pnpm add @supabase/supabase-js @supabase/ssr @tanstack/react-query @tanstack/react-query-devtools zustand react-hook-form @hookform/resolvers zod lucide-react sonner next-themes
pnpm add @upstash/redis @upstash/ratelimit mercadopago openai resend
pnpm add -D supabase vitest
```

**Criterio:** `pnpm build` sin errores.

### 0.3 Configurar Supabase clients

Crear tres clientes:
- `client.ts` — para componentes client-side (usa `createBrowserClient`)
- `server.ts` — para Server Components y Server Actions (usa `createServerClient` con cookies)
- `service-role.ts` — para operaciones de sistema (webhooks, crons) que bypasean RLS

**Criterio:** los tres clientes exportan correctamente y compilan.

### 0.4 Ejecutar schema.sql en Supabase

Ejecutar el archivo `schema.sql` completo en el SQL Editor de Supabase. Este archivo contiene las 30 tablas, índices, políticas RLS, trigger de updated_at y datos iniciales de plans.

**Criterio:** las 30 tablas existen en Supabase. Las políticas RLS están habilitadas.

### 0.5 Generar tipos TypeScript

```bash
pnpm dlx supabase gen types typescript --project-id <project-id> > src/lib/types/database.ts
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
export type StoreInvitation = Database['public']['Tables']['store_invitations']['Row']
export type Shipment = Database['public']['Tables']['shipments']['Row']
export type FinanceEntry = Database['public']['Tables']['finance_entries']['Row']
export type Event = Database['public']['Tables']['events']['Row']

export type StoreStatus = 'demo' | 'active' | 'past_due' | 'suspended' | 'archived'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'
export type ShipmentStatus = 'preparing' | 'in_transit' | 'delivered' | 'cancelled'
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

**Criterio:** `pnpm exec tsc --noEmit` sin errores.

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

**Criterio:** providers montados en el layout raíz. `pnpm build` sin errores.

---

## F1 — Design System Base

**Objetivo:** Componentes UI base listos para usar en todo el sistema.

### 1.1 Configurar shadcn/ui

```bash
pnpm dlx shadcn@latest init
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
pnpm dlx shadcn@latest add button input label card badge skeleton dialog sheet select separator tabs textarea toast dropdown-menu avatar command popover table
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

### 3.0 Onboarding wizard

Wizard de 4 pasos para tiendas nuevas:
1. Nombre y WhatsApp
2. Subir logo
3. Agregar 3 productos
4. Compartir link de vitrina

Se muestra una sola vez al owner al crear la tienda. Progreso persistido en `stores.config.onboarding`. Al completar todos los pasos o al hacer skip, no se vuelve a mostrar.

**Criterio:** wizard se muestra al primer login del owner. Permite skip. Al completar, la tienda tiene datos mínimos para funcionar.

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
