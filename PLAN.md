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
- Integrar en: products, orders, customers, payments, stock, shipping, finance, expenses, tasks, banners.
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
