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

## F3 — Catálogo Público + Core

**Objetivo:** El catálogo público funcional con productos, categorías, carrito y WhatsApp.

### 3.0 Onboarding wizard

Wizard de 4 pasos para tiendas nuevas:
1. Nombre y WhatsApp
2. Subir logo
3. Agregar 3 productos
4. Compartir link del catálogo

Se muestra una sola vez al owner al crear la tienda. Progreso persistido en `stores.config.onboarding`. Al completar todos los pasos o al hacer skip, no se vuelve a mostrar.

**Criterio:** wizard se muestra al primer login del owner. Permite skip. Al completar, la tienda tiene datos mínimos para funcionar.

### 3.1–3.9 (ver ESTADO.md para desglose)

El catálogo usa Server Components con ISR (revalidación cada 60s) para SEO y velocidad. El carrito es 100% client-side con Zustand en localStorage.

Flujo de compra:
1. Cliente navega el catálogo → ve productos
2. Agrega al carrito (Zustand, localStorage)
3. Click "Enviar pedido por WhatsApp"
4. Se genera URL wa.me con mensaje formateado
5. El dueño recibe el pedido por WhatsApp
6. El dueño registra el pedido en el panel (F4)

**Criterio:** catálogo público carga con SSR. Carrito funciona. Mensaje de WhatsApp se genera correctamente.

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

---

## F9 — Auth + Onboarding

**Objetivo:** Flujo de registro, login, recuperación de contraseña y wizard de onboarding completo.

**Criterio:** signup → onboarding → admin funciona end-to-end. Invitaciones de multiuser aceptables.

---

## F10 — Pulido + Auditoría

**Objetivo:** Auditoría de coherencia codebase vs documentación. Fix de inconsistencias menores.

**Criterio:** `pnpm build` + `tsc --noEmit` sin errores. Auditoría documentada en `auditoria.md`.

---

## F11 — Onboarding Pulido + Auth

**Objetivo:** Mejorar UX del onboarding, flujo forgot-password, normalización de query keys.

**Criterio:** onboarding wizard mejorado. Query keys normalizados. Auditoría de módulos documentada.

---

## F12 — Correcciones Previas al Lanzamiento

**Objetivo:** Correcciones de bugs identificados en auditoría (multiuser, email, billing cron).

**Criterio:** bugs críticos de auditoría corregidos. Build limpio.

---

## F13 — Go-to-Market

**Objetivo:** Preparar KitDigital para producción y lanzamiento comercial: billing dual (mensual + anual), cap de tiendas configurable, grupos de módulos en landing, y corrección de todos los bugs de auditoría pendientes.

Ver `system/billing.md` para la especificación completa del modelo dual.
Ver `system/modules.md` para la tabla de grupos de módulos.

### 13.0 SQL Migration (Paso Manual — PASOS-MANUALES.md §16)

Ejecutar en Supabase SQL Editor antes de cualquier deploy de F13:

```sql
ALTER TABLE stores ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'monthly'
  CHECK (billing_period IN ('monthly', 'annual'));
ALTER TABLE stores ADD COLUMN annual_paid_until DATE;
ALTER TABLE plans ADD COLUMN annual_discount_months INTEGER NOT NULL DEFAULT 2;
ALTER TABLE plans ADD COLUMN max_stores_total INTEGER;
ALTER TABLE billing_payments ALTER COLUMN mp_subscription_id DROP NOT NULL;
```

**Criterio:** las 5 columnas existen en Supabase Table Editor sin errores.

### 13.1 `src/lib/billing/calculator.ts` — Precio Anual

Agregar función `calculateAnnualPrice(maxProducts: number, plan: Plan): number`:
- Fórmula: `Math.ceil(maxProducts / 100) * plan.price_per_100_products * (12 - plan.annual_discount_months)`
- El plan anual NO suma módulos pro (están todos incluidos en el precio base anual).

**Criterio:** función exportada, tipada, sin `any`. Tests unitarios opcionales pero recomendados.

### 13.2 `src/lib/billing/mercadopago.ts` — Checkout Preference Anual

Agregar función `createCheckoutPreference({ store_id, amount, back_url })`:
- `POST /checkout/preferences` en API de MP.
- `external_reference = store_id` (para identificar el pago en el webhook).
- `back_url.success`, `back_url.failure`, `back_url.pending` → `/admin/billing?status=...`
- Devuelve `{ id, init_point, sandbox_init_point }`.

**Criterio:** función exportada, tipada. Flujo en staging genera URL de MP válida.

### 13.3 `src/app/api/webhooks/mercadopago/route.ts` — Billing Dual

Actualizar handler para distinguir pago anual vs mensual:
- Si `data.preapproval_id` está ausente y `topic === 'payment'` → rama anual: actualizar `billing_period`, `annual_paid_until`, activar módulos pro (excepto `assistant`), emitir evento `annual_subscription_created`.
- Si `data.preapproval_id` presente y `topic === 'payment'` → rama mensual existente (sin cambios).
- Corregir inconsistencias de nombres de eventos identificadas en auditoría (usar snake_case canónico de `system/modules.md`).

**Criterio:** webhook procesa ambos tipos. Idempotencia respetada. Evento correcto registrado.

### 13.4 `src/app/api/cron/check-billing/route.ts` — Soporte Anual + Bug Fix

- **Bug fix:** query de `owner_id` debe resolverse via `store_users` con `role = 'owner'`, no del campo directo en `stores` (que no existe). Ver auditoria.md §cron.
- Agregar rama anual: tiendas con `billing_period = 'annual'` y `annual_paid_until < NOW()` → `billing_status = 'past_due'`.
- Agregar aviso a 14 días: tiendas con `annual_paid_until BETWEEN NOW() AND NOW() + INTERVAL '14 days'` → enviar email de aviso.

**Criterio:** cron procesa ambos tipos de billing sin errores. Email de aviso se envía correctamente.

### 13.5 `src/lib/billing/verify-signature.ts` — timingSafeEqual

Reemplazar comparación de firma con `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` para evitar timing attacks.

**Criterio:** comparación usa `timingSafeEqual`. Sin cambios en la lógica de derivación HMAC.

### 13.6 `src/lib/email/resend.ts` — Logging de Errores

En el catch del `resend.emails.send()`: en lugar de solo `console.error`, insertar registro en tabla `events` con `action: 'email_send_failed'`, `actor_type: 'system'`, `data: { template, recipient, error: err.message }`.

**Criterio:** errores de email se registran en `events`. Silent failures eliminados.

### 13.7 `src/lib/executor/handlers/stores.ts` — Cap de Tiendas

Al inicio de `createStore()`, antes de insertar:
1. Leer `plans.max_stores_total` (single row).
2. Si no es `null`, contar tiendas activas (`status != 'archived'`).
3. Si `count >= max_stores_total` → retornar error `STORE_CAP_REACHED`.

**Criterio:** no se pueden crear tiendas por encima del cap. Error descriptivo.

### 13.8 Superadmin UI — Campo `max_stores_total`

En `/superadmin/settings` (panel de precios, ya existe), agregar campo de formulario para `plans.max_stores_total`:
- Input numérico, opcional (vacío = sin límite / NULL).
- Label: "Cap máximo de tiendas (dejar vacío = sin límite)".
- Guardar via server action existente de superadmin settings.

**Criterio:** superadmin puede leer y actualizar el cap desde la UI.

### 13.9 Admin Billing UI — Opción Plan Anual

En `/admin/billing`, agregar toggle/tab "Mensual / Anual":
- Anual muestra precio calculado (`calculateAnnualPrice`), módulos incluidos (todos excepto `assistant`), ahorro vs mensual.
- Botón "Contratar Plan Anual" → llama a server action que crea Checkout Preference → redirige a `init_point` de MP.
- Mensual mantiene flujo existente.
- Si `billing_period = 'annual'`, mostrar fecha de vencimiento y botón de renovación.

**Criterio:** UI renderiza correctamente. Precio anual correcto. Redirect a MP funciona en staging.

### 13.10 Landing Page `src/app/page.tsx` — Grupos de Módulos + Cap Real

- Mostrar módulos agrupados según tabla de `system/modules.md` (Catálogo y Ventas, Operaciones, Equipo, Comercial, Finanzas, Dominio, IA).
- Reemplazar `NEXT_PUBLIC_SLOTS_AVAILABLE` hardcodeado por fetch a `/api/stores/capacity` en Server Component (con `revalidate = 60`).
- Crear `src/app/api/stores/capacity/route.ts` que devuelve `{ available: number | null }`.
- El WhatsApp CTA debe usar el número real configurado en env var `NEXT_PUBLIC_WHATSAPP_NUMBER`.

**Criterio:** landing muestra grupos, cupos en tiempo real, y número WhatsApp real.

### 13.11 `src/app/global-error.tsx` — Ocultar Error en Producción

```tsx
// Antes (incorrecto):
<p>{error.message}</p>

// Después (correcto):
<p>{process.env.NODE_ENV === 'development' ? error.message : 'Ocurrió un error inesperado.'}</p>
```

**Criterio:** en `NODE_ENV=production` no se expone el mensaje técnico del error.

### 13.12 `src/app/sitemap.ts` — Tiendas Activas

Completar el TODO existente: consultar `stores` donde `billing_status = 'active'` y `status = 'active'`, devolver una URL por tienda `https://{slug}.kitdigital.ar`.

**Criterio:** sitemap incluye todas las tiendas activas. No incluye tiendas archivadas ni en trial.

### 13.13 `src/lib/executor/handlers/banners.ts` — Requires Fix

Agregar `requires: ['banners']` en todas las actions del handler `banners` (create_banner, update_banner, delete_banner, reorder_banners) para que el executor valide que el módulo está activo antes de ejecutar.

**Criterio:** operaciones de banners devuelven `MODULE_INACTIVE` si el módulo `banners` no está activo.

### 13.14 `src/lib/executor/handlers/multiuser.ts` — Query Keys

Reemplazar query keys inline (`['invitations', store_id]`, etc.) con la factory de `src/lib/hooks/query-keys.ts` para consistencia con el resto del codebase.

**Criterio:** todos los query keys de multiuser usan la factory. Sin strings inline duplicados.

### 13.15 `src/app/privacidad/page.tsx` — AFIP → AAIP

Reemplazar todas las referencias a "AFIP" en la página de privacidad por "AAIP" (Agencia de Acceso a la Información Pública — el organismo correcto de protección de datos en Argentina).

**Criterio:** "AFIP" no aparece en la página de privacidad.

### 13.16 `src/app/terminos/page.tsx` — WhatsApp Real

Reemplazar el número placeholder de WhatsApp por el número real del soporte de KitDigital (usar env var `NEXT_PUBLIC_WHATSAPP_NUMBER` o valor fijo confirmado por el humano).

**Criterio:** el número de WhatsApp en términos es el real de soporte.

### 13.17 `public/og-image.jpg` — Open Graph (Paso Manual)

Crear y subir imagen Open Graph de 1200×630px con branding de KitDigital. Requerida por el meta tag en `src/app/layout.tsx`. Sin esta imagen, las previews en redes sociales no funcionan.

Ver PASOS-MANUALES.md §16.

**Criterio:** `public/og-image.jpg` existe. Verificar preview en [opengraph.xyz](https://www.opengraph.xyz).

### 13.18 Build Final + Deploy

```bash
pnpm build
pnpm exec tsc --noEmit
```

Sin errores. Deploy a Vercel. Verificar en staging con cuenta de prueba:
- [ ] Crear cuenta → onboarding → admin accesible
- [ ] Activar plan mensual → webhook procesa → módulos activos
- [ ] Activar plan anual → webhook procesa → módulos pro activos (excepto assistant)
- [ ] Cap de tiendas funciona (configurar max=1 en superadmin, intentar crear segunda tienda)
- [ ] Cron de check-billing funciona (forzar manualmente con cURL)
- [ ] Email de aviso de vencimiento llega
- [ ] Landing muestra grupos de módulos y cupos correctos
- [ ] Sitemap incluye tiendas activas

**Criterio:** todos los checks pasan. Plataforma en producción.

---

**Criterio global F13:** build limpio, billing anual procesable end-to-end, cap de tiendas respetado, bugs de auditoría corregidos, plataforma desplegada y verificada en producción.

---

## F15 — Design Excellence: Admin Premium + Vitrine Premium

**Objetivo:** Llevar el producto al nivel visual y funcional de `/design/admin` y `/design/vitrine`. Calidad Apple. Producto listo para primeras 100 ventas con UX de producto premium.

**Fuentes de verdad visual:**
- Admin: `src/components/design/admin-preview.tsx` + `src/components/design/admin/entity-toolbar.tsx`
- Vitrine (catálogo público): `src/components/design/vitrine-preview.tsx`

**SQL manual requerido antes de deploy F15:**
```sql
ALTER TABLE products ADD COLUMN compare_price INTEGER;
```

### Bloque 0 — Bugs críticos (OBLIGATORIO PRIMERO)

**0.1 — Fix error "Server Components render" en producción**

Raíz: `middleware.ts` retorna un `NextResponse.next(...)` nuevo en el branch `/admin` sin copiar las cookies que Supabase escribió en el `response` de `createMiddlewareClient`. Las cookies de sesión refrescadas se pierden → sesión expira → `getStoreContext()` lanza → error.

- Fix A — `src/middleware.ts`: Para todos los branches autenticados, copiar cookies del response de Supabase al response final.
- Fix B — `src/lib/auth/store-context.ts`: `getStoreContextOrNull()` debe hacer fallback a query directa a DB si el header no existe.
- Fix C — `src/app/(admin)/admin/layout.tsx`: Si `getStoreContext()` falla, redirigir a `/auth/login` (no lanzar).

**0.2 — Fix cron security guard** — `src/app/api/cron/check-billing/route.ts:43` — `if (!cronSecret || ...)`

**0.3 — Fix signup user insert error** — `src/lib/actions/auth.ts:159` — destructuring de error + rollback.

**0.4 — Fix ReactQueryDevtools en prod** — `src/app/providers.tsx:54` — condicionar a `NODE_ENV=development`.

**0.5 — Fix mobile nav rota** — `src/components/admin/admin-shell.tsx` — `renderTopbar` debe incluir hamburger + título de sección + billing banner. Crear `AdminTopbar` componente.

**0.6 — Fix asignación de categorías en ProductForm** — `src/components/admin/product-form.tsx` — agregar MultiSelect de categorías con `useCategories()`.

**0.7 — Fix token counter asistente** — `src/app/(admin)/admin/assistant/page.tsx:259` — leer desde `useBilling()`.

**Criterio B0:** Ningún error de Server Components. Mobile nav funcional. ProductForm incluye categorías.

### Bloque 1 — Admin Shell premium

Referenciar `src/components/design/admin-preview.tsx` §sección sidebar/topbar para el diseño visual.

- `AdminTopbar`: hamburger (mobile) + nombre de sección + "Ver catálogo" link (external) + avatar con dropdown (cerrar sesión).
- Sidebar header: logo/avatar tienda + nombre + badge estado.
- Sidebar footer: "Ver catálogo" + "Cerrar sesión".
- `BillingBanner` como elemento separado debajo del topbar (no reemplaza el topbar entero).

**Criterio B1:** Admin visible en móvil con navegación funcional. Sidebar footer con logout.

### Bloque 2 — EntityToolbar a páginas reales

- Mover `src/components/design/admin/entity-toolbar.tsx` → `src/components/shared/entity-toolbar.tsx`.
- Hacer `categories` prop dinámica (no hardcodeada).
- Integrar en: products, orders, customers, **ventas** (`/admin/ventas`, F16), stock, shipping, finance, expenses, tasks, banners. (**Sin** lista dedicada `/admin/payments` en menú — ver `FLUJO.md` I-08.)
- Mover `EntityListPagination` → `src/components/shared/entity-list-pagination.tsx`.

**Criterio B2:** Todas las listas tienen barra de búsqueda + botón filtros + menú exportar.

### Bloque 3 — ProductSheet

- Lista de productos: thumbnail + nombre + categorías + precio + stock badge.
- ProductSheet (Sheet lateral): tabs Ficha | Categorías | Stock | Página | Variantes.
- Tab Categorías: multi-select de categorías de la tienda (usa `useCategories()`).
- `compare_price` en Tab Ficha (campo opcional).
- Crear y editar desde la lista — sin navegación a página separada.

**Criterio B3:** Crear producto con categorías funciona end-to-end desde Sheet.

### Bloque 4 — OrderSheet

- Lista de pedidos: cards en mobile, tabla en desktop.
- OrderSheet: timeline visual de estados + items + cliente + pago + WhatsApp.
- Cambiar estado tocando el step del timeline.

**Criterio B4:** Estado de pedido cambia desde el timeline. WhatsApp al cliente funciona.

### Bloque 5 — Vitrine premium

- Header: logo + ciudad/horarios + búsqueda inline + carrito.
- Trust badges (si módulo shipping activo).
- Product cards: compare price tachado, badge sin stock, botón + rápido.
- Product detail sheet: variantes, cantidad, stock disponible.
- Cart drawer: thumbnails + nota de pedido.
- SQL: `ALTER TABLE products ADD COLUMN compare_price INTEGER`.

**Criterio B5:** Catálogo público carga con los nuevos componentes. Compare price muestra ahorro.

### Bloque 6 — Dashboard + Settings

- Dashboard: 4 cards métricas + últimos pedidos + accesos rápidos.
- Settings: sección apariencia con preview live + ciudad/horarios.
- Módulos: toggle grid por grupo (igual que landing).

**Criterio B6:** Dashboard muestra métricas reales. Settings guarda city/hours.

### Bloques 7–9 — Otras secciones (banners, categories, envíos, finanzas, savings, tareas, asistente)

Ver `ESTADO.md §F15 BLOQUE 9` para detalle.

**Criterio global F15:** Build limpio. Error Server Components resuelto. Admin premium en mobile y desktop. Vitrine premium con compare price y trust badges. Todos los bloques anteriores completos.

---

## F16 — Admin Ventas: Sistema de Caja / POS

**Objetivo:** Sección `/admin/ventas` — sistema POS para que el dueño registre ventas en persona (caja). Reemplaza el flujo de "crear pedido manual". El catálogo público sigue enviando solo a WhatsApp.

**Decisión de producto:** DP-03 (START.md). Ver también `ESTADO.md §F16` para el contexto completo.

### 16.0 SQL Migration (Paso Manual)

Ejecutar en Supabase **antes** de hacer deploy:

```sql
ALTER TABLE orders ADD COLUMN source TEXT NOT NULL DEFAULT 'admin'
  CHECK (source IN ('admin', 'whatsapp', 'mp_checkout'));
CREATE INDEX idx_orders_store_source ON orders(store_id, source);
```

**Criterio:** columna `source` existe en tabla `orders`. Index creado.

### 16.1 Handler `create_sale`

Archivo: `src/lib/executor/handlers/orders.ts` (agregar action al handler existente de orders).

```typescript
// Input type
interface CreateSaleInput {
  items: Array<{
    product_id: string
    variant_id?: string
    quantity: number
    price_at_sale: number // en centavos
    name_snapshot: string
  }>
  customer_id?: string      // cliente existente
  customer_name?: string    // nombre rápido si no hay customer_id
  customer_phone?: string
  payment_method: 'cash' | 'transfer' | 'mp_link' | 'savings' | 'card' | 'other'
  payment_amount: number    // en centavos (puede diferir del total si hay cambio)
  savings_account_id?: string // si payment_method='savings'
  discount_amount?: number  // en centavos, descuento aplicado
  shipping_method_id?: string
  notes?: string
}
```

Lógica del handler:
1. Validar que items no estén vacíos.
2. Calcular total: `sum(price_at_sale * quantity) - discount_amount`.
3. Si módulo `stock` activo: verificar `products.stock >= quantity` para cada item. Si falla → `LIMIT_EXCEEDED` con producto específico.
4. Resolver customer: si `customer_id` → verificar que pertenece a la tienda. Si `customer_name` → crear customer nuevo.
5. Insertar en `orders` con `source='admin'`, `status='confirmed'`.
6. Insertar en `order_items` (snapshot de nombre + precio al momento).
7. Insertar en `payments` con el método y monto.
8. Si `payment_method='savings'` → insertar en `savings_movements` con `type='withdrawal'`, `amount=payment_amount`.
9. Si módulo `stock` activo → `UPDATE products SET stock = stock - quantity` para cada item.
10. Emitir evento `sale_created`.
11. Invalidar: `orders:{store_id}`, `products:{store_id}`, `dashboard:{store_id}`, `savings:{store_id}`.

**Criterio:** action `create_sale` registrada en el registry. Pasa todos los pasos del executor. `pnpm exec tsc --noEmit` sin errores.

### 16.2 Validación Zod

Archivo: `src/lib/validations/sale.ts`

- `createSaleSchema` con todos los campos de CreateSaleInput.
- Items: array non-empty, `price_at_sale >= 0`, `quantity >= 1`.
- `payment_amount >= 0`.
- `discount_amount` opcional, default 0.

**Criterio:** Zod schema compila, valida correctamente, rechaza inputs inválidos.

### 16.3 Server Actions

Archivo: `src/lib/actions/sales.ts`

```typescript
'use server'
export async function createSale(input: unknown)        // → executor create_sale
export async function getDailySalesSummary(date?: string) // → query totales del día
export async function getSalesHistory(filters: {...})    // → lista paginada de ventas
```

`getDailySalesSummary` devuelve:
```typescript
{
  total_sales: number         // suma de totales
  total_orders: number        // count
  by_method: Record<PaymentMethod, number>  // total por método de pago
  top_products: Array<{ name, quantity, total }>  // top 5 del día
}
```

**Criterio:** actions exportadas, tipadas. Llamadas desde el cliente funcionan.

### 16.4 Hooks TanStack Query

Archivo: `src/lib/hooks/use-sales.ts`

- `useCreateSale()` — mutation, invalida queries al completar.
- `useDailySalesSummary(date)` — query con staleTime 30s.
- `useSalesHistory(filters)` — query con paginación.

### 16.5 Página `/admin/ventas` — UI POS

Archivo: `src/app/(admin)/admin/ventas/page.tsx` + componentes en `src/components/admin/ventas/`

**Layout desktop** (2 columnas, 60/40):

**Columna izquierda — Caja:**
```
┌─────────────────────────────────────────┐
│ [Buscar producto...                    ] │
│                                          │
│ [ProductCard] [ProductCard] [ProductCard]│
│ [ProductCard] [ProductCard] [ProductCard]│
│                                          │
│ ─── Items en la venta ───               │
│ Remera Azul  × 2  $10.000  [−][+][✕]   │
│ Pantalón     × 1  $15.000  [−][+][✕]   │
│                                          │
│ Descuento: [_____] %/$ [toggle]          │
│                             Total: $25.000│
└─────────────────────────────────────────┘
```

**Columna derecha — Pago:**
```
┌────────────────────────────────┐
│ Cliente (opcional)             │
│ [Buscar o nombre rápido...   ] │
│                                │
│ Método de pago                 │
│ ○ Efectivo                     │
│ ○ Transferencia                │
│ ○ Mercado Pago (Link)          │
│ ○ Cuenta de Ahorro             │
│                                │
│ Nota (opcional)                │
│ [________________________]     │
│                                │
│ [    CONFIRMAR VENTA    ]      │
│        Total: $25.000          │
└────────────────────────────────┘
```

**Mobile**: Tabs "Caja" | "Pago" | "Historial".

**Componentes a crear:**
- `SaleProductSearch` — input + debounce + grid de resultados (max 12 productos visibles).
- `SaleCart` — lista de items con controles de cantidad.
- `SalePaymentPanel` — selección de cliente, método y confirmación.
- `SaleTicket` — modal de éxito con resumen, número de orden, y botones de acción.
- `SaleDailyHistory` — lista del historial del día + resumen por método.

**SaleTicket** (modal post-confirmación):
```
┌──────────────────────────────┐
│  ✅ Venta registrada         │
│  Pedido #4521                │
│                              │
│  2 × Remera Azul    $10.000  │
│  1 × Pantalón       $15.000  │
│  ─────────────────────────── │
│  Total              $25.000  │
│  Método: Efectivo            │
│                              │
│  [Nueva venta]               │
│  [Enviar por WhatsApp]       │
│  [Descargar PDF]             │
└──────────────────────────────┘
```

**Criterio:** flujo completo funciona en desktop y mobile. Venta se registra en DB. Stock se descuenta. Ticket muestra datos correctos.

### 16.6 Navegación Admin

- Agregar ítem "Ventas" en el sidebar con ícono `ShoppingBag` entre "Dashboard" y "Pedidos".
- Badge con contador de ventas del día (query ligera: count orders source='admin' created_at=today).

### 16.7 Dashboard Integration

- Las métricas de Dashboard incluyen ventas de `source='admin'` además de otros sources.
- Card "Ventas hoy" muestra suma de todos los sources del día actual.

### 16.8 Build + Verificación

```bash
pnpm build
pnpm exec tsc --noEmit
```

**Criterio global F16:** Sección Ventas completa y funcional. POS operativo en mobile y desktop. Ventas se registran con stock deducido. Historial del día con resumen por método de pago.

---

## F17 — Onboarding Magic 2.0 + Billing en Onboarding

**Objetivo:** Rediseño completo del onboarding con pago obligatorio antes de acceder al admin. Experiencia Apple-style: animaciones suaves, cero fricción, texto claro y motivador.

**Decisión de producto:** DP-01 y DP-02 (START.md). Ver `ESTADO.md §F17` para contexto completo.

### 17.0 Instalación de dependencias

Si no existe `framer-motion`:
```bash
pnpm add framer-motion
```

O alternativa sin dependencia extra: usar `CSS @keyframes` + clases de Tailwind (`animate-slide-in`, etc.) definidas en `globals.css`.

**Criterio:** animaciones de transición disponibles.

### 17.1 `OnboardingShell` y barra de progreso

Archivo: `src/app/onboarding/layout.tsx` (reemplazar completamente)

```typescript
// Barra de progreso horizontal animada (no stepper con números)
// 5 pasos: store → design → modules → payment → done
// currentStep detectado por pathname
// Animación: width transition 400ms ease-out
// En mobile: barra full-width en top. En desktop: centrada 600px max-w.
```

Estructura visual:
```
┌────────────────────────────────────────────┐
│ [logo]                    Paso 3 de 5      │
│ ████████████████░░░░░░░░  60%              │
└────────────────────────────────────────────┘
     ↓  (contenido del paso con slide-in)
```

**Criterio:** barra de progreso animada visible en todos los pasos.

### 17.2 Animaciones de transición entre pasos

En cada página del onboarding (`/onboarding/store`, `/design`, etc.), envolver el contenido en un componente `OnboardingStep` que aplica:

```typescript
// Con framer-motion:
<motion.div
  initial={{ opacity: 0, x: 40 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -40 }}
  transition={{ duration: 0.3, ease: 'easeOut' }}
>
  {children}
</motion.div>
```

**Criterio:** transiciones fluidas. Sin flash de pantalla blanca entre pasos.

### 17.3 Copy y diseño de cada paso

**Paso 1 `/onboarding/store`** (ya existe, mejorar):
- Headline: "¿Cómo se llama tu negocio?"
- Subtitle: "Este nombre aparecerá en tu catálogo online."
- Campo nombre + auto-generación de slug + preview de URL en tiempo real.
- Campo WhatsApp con flag de Argentina + formato automático.
- CTA: "Continuar →"

**Paso 2 `/onboarding/design`** (ya existe, mejorar):
- Headline: "Dale identidad a tu tienda"
- Subtitle: "Podés cambiarlo cuando quieras desde la configuración."
- Logo: zona de drag & drop grande con ícono de upload + texto "Arrastrá tu logo aquí o hacé click".
- Color: 8 swatches + input hex. Preview del header del catálogo en tiempo real (componente `MiniCatalogPreview`).
- CTA: "Continuar →"

**Paso 3 `/onboarding/modules`** (ya existe, mejorar):
- Headline: "¿Qué necesitás para tu negocio?"
- Subtitle: "Activá lo que uses hoy. Podés agregar más después."
- Grid de módulos con iconos grandes, descripción corta, toggle. Módulos core marcados como "Siempre incluido".
- CTA: "Continuar →"

**Paso 4 `/onboarding/payment`** (nuevo):
- Headline: "Elegí tu plan"
- Subtitle: "Sin permanencia. Cancelás cuando quieras."
- Toggle "Mensual / Anual" con badge "Ahorrás 2 meses" en el anual.
- Card de plan: precio calculado + lista de lo que incluye.
- Botón "Ir a Mercado Pago →" (prominente, full-width en mobile).
- Texto pequeño debajo: "Serás redirigido a Mercado Pago de forma segura."
- Back URLs: `success → /onboarding/done?status=success`, `failure → /onboarding/payment?status=error`.

**Paso 5 `/onboarding/done`** (reemplazar completamente):
- Si `status=success` en query params **desde MP** (return URL):
  1. **Primero** pantalla fija **“Verificando tu pago…”** (skeleton + microcopy pro).
  2. **Polling** server-side o RSC refresh cada ~2 s (máx. ~30 intentos) hasta `billing_status === 'active'` (webhook aplicado).
  3. Luego: animación de confetti o check animado + "¡Tu tienda está lista!" + "Enviamos un email a **{email}**…" + reenviar email + CTA al panel.
  4. Si timeout sin `active`: copy honesto + reintentar consulta + soporte (ver `FLUJO.md` §1.7b).
- Si al cargar la página **ya** está `billing_status=active` (reload o webhook rápido): ir directo al bloque de éxito (sin paso 1 redundante largo).
- Si `status=error` o no hay pago:
  - Headline: "Algo salió mal con el pago"
  - Botón "Reintentar" → vuelve al paso 4.
- Si onboarding incompleto (sin pago confirmado):
  - Headline: "Completá el pago para activar tu tienda"
  - Botón "Ir a pagar" → paso 4. (**No** usar el término "modo demo" en UI; `demo` en BD queda stand-by / legacy — `FLUJO.md` I-05.)

### 17.4 Server action `createOnboardingCheckout`

Archivo: `src/lib/actions/onboarding.ts` (agregar):

```typescript
'use server'
export async function createOnboardingCheckout(billing_period: 'monthly' | 'annual') {
  // 1. getStoreContextOnboarding() — resolver store_id del usuario autenticado
  // 2. calculateMonthlyPrice() o calculateAnnualPrice() según billing_period
  // 3. createCheckoutPreference({ store_id, amount, back_url: '/onboarding/done' })
  // 4. Retornar { init_point, sandbox_init_point }
}
```

### 17.5 Middleware: manejar email no confirmado

En `src/middleware.ts`, para rutas `/admin/*`:
- Si `auth.getUser()` retorna usuario con `email_confirmed_at = null` → redirigir a `/onboarding/done`.
- Agregar `/onboarding/done` y `/auth/signout` a la lista de rutas que no requieren email confirmado.

**Criterio:** usuario sin email confirmado no puede acceder al admin.

### 17.6 PASOS-MANUALES.md §20

Agregar sección "§20 — Habilitar Email Confirmation en Supabase":
- Ir a Supabase Dashboard → Authentication → Settings.
- Activar "Enable email confirmations".
- Configurar el redirect URL a `https://kitdigital.ar/auth/callback`.
- Verificar que el dominio del remitente esté configurado con Resend.

**Criterio:** sección documentada. Paso manual pendiente de ejecución antes de launch.

### 17.7 Build + Verificación

```bash
pnpm build
pnpm exec tsc --noEmit
```

**Criterio global F17:** Onboarding con 5 pasos y animaciones. Pago integrado en el paso 4. Pantalla de éxito con instrucción de confirmación de email. Flujo completo funciona end-to-end en staging con cuenta real de MP.

---

## F18 — Bugs Críticos de Auditoría

**Objetivo:** Corregir todos los bugs 🔴 críticos y los 🟠 altos más impactantes de `auditory.md`. Estos son prerequisito de cualquier venta real.

Ver `ESTADO.md §F18` para la lista completa de pasos. A continuación los más técnicos:

### 18.1 Fix firma HMAC webhook Mercado Pago

**Archivo:** `src/lib/billing/verify-signature.ts`

Firma actual (incorrecta):
```typescript
const template = `id:${xRequestId};ts:${ts};`
```

Firma correcta según spec oficial de MP:
```typescript
// El route handler extrae data.id de los query params:
const dataId = request.nextUrl.searchParams.get('data.id') ?? ''
const xRequestId = request.headers.get('x-request-id') ?? ''
const ts = // extraído del header x-signature

// Template correcto:
const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`

// La función verifyWebhookSignature ahora acepta 4 parámetros:
function verifyWebhookSignature(body: string, signature: string | null, dataId: string, requestId: string): boolean
```

**Criterio:** webhook procesa correctamente pagos reales de MP en producción.

### 18.2 Fix max_products respeta plan

**Archivo:** `src/lib/executor/handlers/stores.ts`

```typescript
// ANTES:
limits: { max_products: 30, max_orders: 100, ai_tokens: 0 }

// DESPUÉS:
const plan = await db.from('plans').select('*').single()
limits: {
  max_products: plan.data?.trial_max_products ?? 100,
  max_orders: 500,
  ai_tokens: 0,
}
```

**Criterio:** nuevo usuario en trial puede agregar hasta `plan.trial_max_products` productos.

### 18.3 AI Tokens: límite mensual

**SQL (ejecutar primero):**
```sql
ALTER TABLE plans ADD COLUMN ai_tokens_monthly INTEGER NOT NULL DEFAULT 50000;
ALTER TABLE stores ADD COLUMN ai_tokens_reset_at TIMESTAMPTZ DEFAULT NOW();
```

**Handler** `execute_assistant_action`:
```typescript
// Al inicio del handler:
const { ai_tokens_used, ai_tokens_reset_at, plan_id } = store
const plan = await db.from('plans').select('ai_tokens_monthly').eq('id', plan_id).single()
const monthlyLimit = plan.data?.ai_tokens_monthly ?? 50000

// Verificar si corresponde resetear (mes calendario):
const now = new Date()
const resetDate = new Date(ai_tokens_reset_at)
if (resetDate.getMonth() !== now.getMonth() || resetDate.getFullYear() !== now.getFullYear()) {
  await db.from('stores').update({ ai_tokens_used: 0, ai_tokens_reset_at: now.toISOString() }).eq('id', store_id)
  // Continuar con tokens usados = 0
}

// Verificar límite:
if (ai_tokens_used >= monthlyLimit) {
  const resetDay = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return error(`Límite mensual de ${monthlyLimit.toLocaleString()} tokens alcanzado. Se reinicia el ${resetDay.toLocaleDateString('es-AR')}.`)
}
```

**Criterio:** asistente bloquea cuando `ai_tokens_used >= ai_tokens_monthly`. Muestra fecha de reset.

### 18.4–18.9

Ver `ESTADO.md §F18` para los detalles de cada paso restante (18.4 UUID validation, 18.5 URL catálogo, 18.6 rate limiter, 18.7 realtime channels, 18.8 invitations conflict, 18.9 manual).

### 18.10 Build + Verificación

```bash
pnpm build
pnpm exec tsc --noEmit
```

**Criterio global F18:** Todos los bugs 🔴 críticos de auditory.md corregidos. Webhook MP procesa correctamente. AI tokens tiene límite. Ningún riesgo de fuga de datos o pérdida de ingresos.

---

## F19 — Catálogo Público: Checkout Mejorado + Performance

**Objetivo:** Mejorar la experiencia del comprador en el catálogo público. Cart drawer con formulario de datos. Paginación. ISR por cambio real.

Ver `ESTADO.md §F19` para el detalle de cada paso.

### 19.1 Cart Drawer: formulario de checkout

**Archivo:** `src/components/public/cart-drawer.tsx` (modificar) y nuevo componente `CheckoutForm`.

El drawer tiene dos "vistas" (state machine con `step: 'cart' | 'checkout'`):

**Vista `cart`** (actual): lista de items + botón "Ir a pedir →" (en lugar de "Enviar por WhatsApp").

**Vista `checkout`** (nueva):
```tsx
<CheckoutForm
  onSubmit={({ name, deliveryType, address, paymentNote, notes }) => {
    const message = buildWhatsAppMessage({ items, name, deliveryType, address, paymentNote, notes, total })
    window.open(`https://wa.me/${storeWhatsApp}?text=${encodeURIComponent(message)}`)
    // Limpiar carrito
    clearCart()
    setStep('cart')
  }}
/>
```

El botón "Volver" vuelve a la vista `cart`.

**Criterio:** flujo cart → checkout → WhatsApp funciona sin recarga de página.

### 19.2–19.6

Ver `ESTADO.md §F19` para detalles de cada paso (filtro de categorías, búsqueda normalizada, paginación, self-fetch, ISR).

### 19.7 Build + Verificación

**Criterio global F19:** Checkout con datos del cliente funciona en mobile. Catálogo paginado. ISR basado en cambios reales.

---

## F20 — SEO + OpenGraph por Tienda

**Objetivo:** Previews de WhatsApp y redes sociales con logo e info de la tienda. JSON-LD para Google Shopping.

Ver `ESTADO.md §F20` para detalles.

**Criterio global F20:** Al compartir `{slug}.kitdigital.ar` en WhatsApp aparece preview con logo y nombre de la tienda. Productos tienen schema.org.

---

## F21 — Custom Domain: Feature Base + Middleware

**Objetivo:** Mover `custom_domain` a feature base. Middleware resuelve dominios custom via Redis + DB.

Ver `ESTADO.md §F21` para el detalle de cada paso incluyendo el snippet de código del middleware.

**Criterio global F21:** Un dominio custom apuntado correctamente resuelve la tienda. No más cobro por custom_domain como módulo pro.

---

## F22 — Email + Notificaciones Mejoradas

**Objetivo:** Emails de bienvenida, notificación de venta, templates separados para billing. Rate limit en password reset.

Ver `ESTADO.md §F22` para el detalle de cada paso.

**Criterio global F22:** Usuario nuevo recibe email de bienvenida. Dueño recibe email por cada venta registrada en el POS. Templates de billing diferenciados.

---

## Checklist de Lanzamiento

### 🔴 Obligatorio antes de primera venta

- [ ] F15 completo (Design Excellence)
- [ ] F16 completo (Ventas/POS)
- [ ] F17 completo (Onboarding Magic)
- [ ] F18.1 (firma webhook MP)
- [ ] F18.2 (max_products respeta plan)
- [ ] F18.3 (AI tokens límite mensual)
- [ ] F18.4 (validación UUID webhook anual)
- [ ] SQL migrations ejecutadas en producción (todas las de START.md)
- [ ] `CRON_SECRET` configurado en Vercel
- [ ] `MP_WEBHOOK_SECRET` configurado en Vercel
- [ ] Superadmin creado en Supabase
- [ ] Email confirmation habilitado en Supabase Auth
- [ ] OG image creada y en `public/og-image.jpg`
- [ ] Test E2E completo en staging

### 🟠 Recomendado antes de 10 ventas

- [ ] F18 completo (todos los bugs de auditoría)
- [ ] F19 (checkout mejorado + performance)
- [ ] F20 (SEO + OG por tienda)
- [ ] F21 (custom domain base)

### 🟡 Post-10 ventas

- [ ] F22 (email mejorado)
- [ ] Generar tipos Supabase con CLI (eliminar `as any`)
- [ ] Bundle analyze + code-split por módulo
- [ ] Virtualización de listas largas
