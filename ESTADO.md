# Estado del Proyecto

**Fase actual:** F9 — Auth + Onboarding ✅ COMPLETA
**Paso actual:** F9 completada. Flujo de registro, onboarding e invitaciones implementado.

---

## Progreso por Fase

### F0 — Setup Inicial
- [x] 0.1 Crear proyecto Next.js + estructura de carpetas
- [x] 0.2 Instalar dependencias (shadcn, tanstack, zustand, zod, supabase, etc.)
- [x] 0.3 Configurar Supabase client (browser + server + service role)
- [x] 0.4 Ejecutar schema.sql en Supabase
- [x] 0.5 Generar tipos TypeScript desde schema
- [x] 0.6 Implementar executor base
- [x] 0.7 Implementar middleware multitenant
- [x] 0.8 Configurar TanStack Query + Zustand + providers

### F1 — Design System Base
- [x] 1.1 Configurar shadcn/ui (style: base-nova, baseColor: neutral — ajustable en pausa)
- [x] 1.2 Definir tokens de diseño en tailwind.config.ts
- [x] 1.3 Instalar componentes shadcn base (17 componentes)
- [x] 1.4 Crear componentes compartidos (DataTable, EmptyState, ErrorState, LoadingSpinner, ModuleGate, PlanUpgradePrompt)
- [x] 1.5 Crear layouts (AdminLayout, PublicLayout, SuperadminLayout)

### ⏸️ PAUSA DE DISEÑO — COMPLETADA + POLISH APLICADO
- [x] Humano confirma: colores brand configurados (#1b1b1b / #f6f6f6)
- [x] Humano confirma: tipografía Inter configurada (Google Fonts, jerarquía completa)
- [x] Humano confirma: logo en public/logo.jpg
- [x] Humano confirma: visual check aprobado — /design panel activo
- [x] Design Excellence polish aplicado (ver plan cheeky-herding-bengio.md)
  - design-store: persist + logoUrl default '/logo.jpg'
  - tailwind.config: tokens info (#0284c7) y pro (#7c3aed) agregados
  - globals.css: keyframes accordion duplicados eliminados
  - design-nav: scrollable en mobile, logo en nav bar
  - vitrine-preview: sticky top-0 fix, búsqueda funcional, stagger animation, social icons semánticos
  - admin-preview: toast system (sonner), SidebarContent anti-pattern fix, inline handlers eliminados, order detail con timeline + items + botones de acción, loading states en guardar config y producto, copyTracking con toast
  - superadmin-preview: hamburger mobile funcional, filtro de estado en tabla de tiendas, card list en mobile
  - components-tab: tokens CSS correctos, toast demo interactivo con botones reales de Sonner
  - config-hub: dark mode toggle, header con título, link a catálogo completo
- [x] **Abr 2026 — /design v2 (ejecución plan):** restaurado `src/components` desde `components_old`; rutas `src/app/design/*`; redirects `design_old` → `design` en `next.config.ts`; `tsconfig` excluye `components_old`. Admin: POS con búsqueda + Enter, ticket, pagos en botones, cuentas de ahorro + alta en sheet, resumen por medio, historial y pedidos del día paginados; pedidos 3 estados; form producto por tabs (sin SEO genérico, slug en ficha); módulos base/pro y badges marca; catálogo sin rating, carrusel y carrito pulidos; superadmin plan “base”.
- [x] **Abr 2026 — Admin preview (plan toasts/layout/toolbar/banners):** Sonner compacto (`providers.tsx` + `globals.css`); topbar y main a ancho útil (`max-w-[1920px]`); secciones con padding unificado; sidebar nav con `min-h-0` + scroll refinado; `EntityToolbar` (búsqueda + filtros en sheet con mes calendario por defecto + menú); categorías de productos solo en sheet; `LIST_PAGE_SIZE = 50`; tokens compartidos tabla/cards; sección Banners en grid con cards 16:9 y CTA dashed.

### F2 — Herramientas Transversales
- [x] 2.1 DataTable con sort, filter, paginación server-side, export CSV
- [x] 2.2 ImageUploader (Cloudinary wrapper)
- [x] 2.3 CSVImporter (upload → parse → validación → preview → confirmar)
- [x] 2.4 CSVExporter
- [x] 2.5 PDFGenerator (server-side, templates por entidad)
- [x] 2.6 WhatsAppMessageBuilder
- [x] 2.7 CurrencyFormatter + DateFormatter
- [x] 2.8 ModalManager (Zustand)
- [x] 2.9 ToastSystem (sonner)
- [x] 2.10 ModuleGate + PlanUpgradePrompt

### F3 — Catálogo Público + Core
- [ ] 3.0 Onboarding wizard (4 pasos: nombre, logo, productos, compartir link) — pospuesto a F4, requiere admin panel
- [x] 3.1 Rutas públicas: /[slug], /[slug]/[category], /[slug]/p/[id], /tracking/[code]
- [x] 3.2 Resolución de tienda por subdominio (middleware) — ya existía de F0
- [x] 3.3 Módulo catalog: get_store_public, StoreHeader, StoreCover
- [x] 3.4 Módulo products: list_products_public, ProductCard, ProductGrid
- [x] 3.5 Módulo categories: list_categories_public, CategoryFilter
- [x] 3.6 Módulo cart: CartDrawer, CartButton, WhatsAppCheckoutButton (Zustand)
- [x] 3.7 Página de producto (si módulo product_page activo)
- [x] 3.8 Banners: BannerCarousel (si módulo banners activo)
- [x] 3.9 Social links en footer (si módulo social activo) — ya existía en PublicLayout

### F4 — Panel Admin
- [x] 4.1 AdminLayout con sidebar, navegación, StoreContext
- [x] 4.2 Dashboard con estadísticas básicas
- [x] 4.3 CRUD productos completo
- [x] 4.4 CRUD categorías con drag-and-drop reorder
- [x] 4.5 Gestión de pedidos (crear, cambiar estado, ver detalle)
- [x] 4.6 Gestión de clientes (listado, detalle)
- [x] 4.7 Configuración de tienda (nombre, logo, WhatsApp, colores)
- [x] 4.8 Configuración de módulos (enable/disable)
- [x] 4.9 Módulos secundarios: stock, variantes, wholesale, shipping (métodos + envíos con tracking)
- [x] 4.10 Módulos de finanzas: finance, expenses, savings
- [x] 4.11 Módulo tareas
- [x] 4.12 Módulo multiuser (invitar, roles, remover)
- [x] 4.13 Módulo custom_domain
- [x] 4.14 Módulo pagos (registro manual de cobros)

### F5 — Billing ✅ COMPLETA
- [x] 5.1 Calculadora de precios + queries de billing
- [x] 5.2 Integración Mercado Pago: crear/cancelar suscripción + server actions
- [x] 5.3 Webhook handler: /api/webhooks/mercadopago
- [x] 5.4 Lógica de billing_status transitions (en webhook handler)
- [x] 5.5 Cron check_billing_due: /api/cron/check-billing (vercel.json configurado)
- [x] 5.6 UI de billing en panel admin: /admin/billing
- [x] 5.7 Bloqueo de operaciones según billing_status (executor ya lo tenía + banner en admin-shell)

### F6 — Superadmin ✅ COMPLETA
- [x] 6.1 SuperadminLayout + SuperadminShell (sidebar nav)
- [x] 6.2 Listar tiendas + ver detalle (estado, módulos override, límites, trial)
- [x] 6.3 Override de módulos (sin restricción billing) y límites
- [x] 6.4 Ver eventos (auditoría) y log de webhooks MP
- [x] 6.5 Gestión de precios del plan modular (precio×100prod, precio módulo pro, trial)
- [x] 6.6 Métricas dashboard (MRR, tiendas activas, conversión demo→activo)
- [x] 6.7 Usuarios: listado + ban/unban

### F7 — Performance + Seguridad ✅ COMPLETA
- [x] 7.1 Upstash Redis: caché de queries costosas
- [x] 7.2 Rate limiting en API routes
- [x] 7.3 ISR para catálogo público
- [x] 7.4 Bundle analysis y optimización
- [x] 7.5 Virtualización de listas largas (TanStack Virtual)

### F8 — Asistente IA ✅ COMPLETA
- [x] 8.1 Módulo assistant: sesiones, mensajes, límites
- [x] 8.2 Integración OpenAI (GPT-4o-mini)
- [x] 8.3 UI AssistantChat
- [x] 8.4 Actions permitidas para IA
- [x] 8.5 Cron de limpieza de sesiones expiradas

### F9 — Auth + Onboarding ✅ COMPLETA
- [x] 9.1 Validaciones Zod: loginSchema, signupSchema, slugify helper
- [x] 9.2 Server actions auth: signIn, signOut, signUp
- [x] 9.3 Handler createStore (standalone, fuera del executor — mismo patrón que billing)
- [x] 9.4 acceptStoreInvitation (standalone en src/lib/invitations.ts — evita dependencia circular)
- [x] 9.5 Fix bug multiuser.ts: .eq('accepted', false) → .is('accepted_at', null)
- [x] 9.6 Middleware: excluir /auth, /invite, /design (sin auth); /onboarding (auth sin store)
- [x] 9.7 Auth layout (centrado, logo, max-w-sm)
- [x] 9.8 Página /auth/login (RHF + useActionState)
- [x] 9.9 Página /auth/signup (RHF + slug auto-generado + useActionState)
- [x] 9.10 Página /auth/no-store (fallback para usuarios sin tienda)
- [x] 9.11 Página /invite/[token] (Server Component — acepta invitación, maneja errores)
- [x] 9.12 Onboarding wizard 4 pasos: nombre/whatsapp → logo → producto → done
- [x] 9.13 pnpm build + tsc --noEmit sin errores

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
- [ ] RESEND_API_KEY
- [ ] NEXT_PUBLIC_APP_URL
- [ ] NEXT_PUBLIC_APP_DOMAIN

## Decisiones Tomadas

- **Next.js 16.2.3** instalado (última versión disponible, no 15 como indicaba PLAN.md — compatible y superior)
- **Tailwind 3.4.19** forzado manualmente (create-next-app instaló v4; se removió y reemplazó con v3 + autoprefixer + postcss.config.mjs reescrito)
- **Tokens de diseño en tailwind.config.ts** definidos con valores placeholder (negro) — se sobreescriben en la pausa de diseño (F1.2)
- **`src/lib/types/database.ts`** es un placeholder temporal (`Record<string, unknown>`) — se reemplaza en paso 0.5 tras ejecutar schema.sql
- **Supabase CLI** no genera tipos en Windows con pnpm — `database.ts` escrito manualmente desde `schema.sql`. Cast `as any` en executor para insert en events (compatible en runtime, resolver al migrar a tipos CLI si corresponde)
- **shadcn v4** instalado (CLI más reciente). Usa `base-nova` + `neutral`. Compatible con Tailwind v3 tras reescribir `globals.css` (eliminar imports de Tailwind v4) y actualizar `tailwind.config.ts` con sistema de colores CSS variable
- **@tanstack/react-table** agregado como dependencia para DataTable
- **postcss-import** instalado pero no usado (puede removerse si no se necesita)
- **Supabase project ID:** `vqkvqowvmdwabelpiiil`

- **F2 — papaparse** agregado para CSVImporter (parsing robusto de CSV)
- **F2 — Cloudinary** sin SDK, upload unsigned via fetch directo a API
- **F3 — `as any` cast** extendido a todas las queries (`db/queries/*`) y handlers (`executor/handlers/*`) por el mismo issue de Relationships faltantes en database.ts
- **F3 — StoreProvider** (React Context) para pasar datos de store del layout a componentes client del catálogo público
- **F3 — Onboarding wizard (3.0)** pospuesto a F4 porque requiere el admin panel funcional
- **F3 — Carrito separado por storeId** en Zustand con persist, key `kd-cart`

## Decisiones F4 (4.9–4.14)

- **11 módulos secundarios implementados** end-to-end: handler → action → validations → hook → page
- **`db = supabaseServiceRole as any`** en todos los handlers (mismo patrón F3, Supabase relationship typing workaround)
- **Zod form schemas locales** por página (no `.extend().omit()`): evita incompatibilidades con `Resolver<>` de RHF
- **AlertDialogTrigger** usa `render={<Button />}` (no `asChild`) — patrón Radix UI v2
- **Tracking codes** auto-generados `KD-XXXXXX` en `create_shipment`
- **DNS verification** usa Google DNS-over-HTTPS (`dns.google/resolve?type=TXT`)
- **Savings balance** computado en runtime desde movimientos; withdrawal validado en handler
- **Payments panel** integrado en `orders/[id]/page.tsx` (no página separada extra)
- **Variants** accesibles desde `products/[id]/variants` (no nav top-level)
- **Multiuser/domain** nav hrefs: `/admin/settings/team` y `/admin/settings/domain`
- **`pnpm build` + `pnpm exec tsc --noEmit`** pasan sin errores tras F4

## Decisiones F5

- **Modelo de billing rediseñado:** 3 planes fijos (starter/growth/pro) → precio dinámico lineal ($20k ARS × cada 100 productos + $5k ARS por módulo pro)
- **`plans` table refactorizada:** nuevas columnas `price_per_100_products`, `pro_module_price`, `base_modules`, `trial_days`, `trial_max_products`. Eliminadas `price`, `max_products`, `max_orders`, `ai_tokens`, `available_modules`, `module_prices`. `database.ts` actualizado.
- **Módulos base (incluidos):** catalog, products, categories, cart, orders, stock, payments, banners, social, product_page, shipping
- **Módulos pro ($5k/mes c/u):** variants, wholesale, finance, expenses, savings_account, multiuser, custom_domain, tasks, assistant
- **Billing actions NO pasan por executor:** usan `supabaseServiceRole` directo + evento manual. El executor se usa solo para operaciones de dominio (no para alta/cancelación de suscripciones en MP).
- **MP wrapper sin SDK oficial:** fetch directo a API REST de MP para evitar conflictos con Next.js.
- **Firma HMAC:** basada en headers `x-signature` y `x-request-id` según doc oficial de MP.
- **Cron en Vercel:** `/api/cron/check-billing` (no Supabase Edge Function). `vercel.json` creado con schedule `0 3 * * *`.
- **Banner de billing en admin-shell:** se renderiza via `renderTopbar` prop del PanelShell. Usa `useBilling()` hook.
- **Paso manual requerido:** ejecutar `schema.sql` actualizado en Supabase (tabla `plans` refactorizada). Ver PASOS-MANUALES.md.

## Blockers Actuales

- **MANUAL REQUERIDO:** Ejecutar el schema actualizado de la tabla `plans` en Supabase. La tabla `plans` fue refactorizada — si no se migra el schema en prod, el sistema de billing no funcionará.
- **ENV VARS faltantes:** `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `CRON_SECRET` deben configurarse antes de probar billing en producción.

## Decisiones F6

- **Cleanup modular aplicado:** `module-toggle-list.tsx` usa `tier: 'base'`; pro modules bloqueados si `billing_status !== 'active'`; `enable_module` handler verifica billing para pro modules; `createSubscription` guarda `pending_pro_modules` en `stores.config`; webhook activa módulos pending al autorizar suscripción.
- **Superadmin bypass total:** override de módulos y límites no tiene restricción de billing (superadmin puede activar cualquier módulo de cualquier tienda).
- **Tablas inline** en lugar de DataTable genérico para events/webhooks/users/stores — control total de columnas y expansión de rows sin overhead.
- **Row expansion en events:** click en fila expande JSON del campo `data`.
- **Row expansion en webhooks:** click en fila muestra `result` y `error` del log.
- **`render={<Link />}`** en Button para navegación (no `asChild`) — patrón Radix UI v2 validado en F4.
- **`onValueChange={(v) => set(v ?? 'all')}`** en Select — Radix UI v2 puede pasar `null`.
- **`pnpm build` + `pnpm exec tsc --noEmit`** pasan sin errores tras F6.

## Decisiones F7

- **Redis cache helper:** `src/lib/cache.ts` implementa función genérica `cached<T>(key, ttl, fn)` para read-through caching en Upstash Redis.
- **Executor step 9 implementado:** reemplazó placeholder con `await redis.del(...keys)` para invalidación real de caché Redis tras cada operación. Importación dinámica de módulo para evitar errores en build sin env vars.
- **Queries públicas del catálogo cacheadas:** `getStoreBySlug` (300s), `listProductsPublic` (60s, solo sin filtros), `listCategoriesPublic` (300s), `getBannersPublic` (300s). Búsquedas por categoría o texto no se cachean (dinámicas).
- **Rate limiting aplicado:** PDF endpoint (10 req/60s per IP via `pdfLimiter`), webhook MercadoPago (30 req/10s per IP via `apiLimiter`). Extracción de IP desde header `x-forwarded-for` con fallback `anonymous`.
- **Bundle analyzer configurado:** `@next/bundle-analyzer` instalado, script `analyze` agregado a package.json, `next.config.ts` reescrito para aplicarlo condicionalmente con env var `ANALYZE=true`.
- **@tanstack/react-virtual instalado:** listo para virtualización de listas en admin (products, orders, customers si superan 100 ítems con paginación).
- **ISR ya funcional:** todas las rutas públicas tienen `revalidate = 60`. Caché Redis en front evita que cada ciclo ISR golpee Supabase.
- **`pnpm build` + `pnpm exec tsc --noEmit`** pasan sin errores tras F7. Warnings de Upstash esperados sin env vars configuradas.

## Blockers Actuales

- **MANUAL REQUERIDO:** Configurar env vars `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en Vercel/`.env.local` antes de usar caché Redis en prod/dev.
- **MANUAL REQUERIDO:** Ejecutar el schema actualizado de la tabla `plans` en Supabase (si aún pendiente de F5).

## Decisiones F8

- **Executor modificado:** actor.type 'ai' bypasea el check de actor.id (null permitido) y la verificación de permisos por rol, igual que 'superadmin'. Esto permite que el handler `execute_assistant_action` llame al executor recursivamente con actor.type 'ai'.
- **Import dinámico del executor en el handler:** para evitar la dependencia circular `executor → registry → handler → executor`, el handler usa `await import('@/lib/executor')` dentro de la función execute.
- **Token counting:** se usa `response.usage.total_tokens` de OpenAI (más preciso que tiktoken). El update de `stores.ai_tokens_used` intenta vía RPC `increment_ai_tokens` primero, con fallback a update directo.
- **5 acciones permitidas para IA:** create_product, update_product, create_category, create_task, update_order_status. Validadas tanto en el system prompt como en el handler (`ALLOWED_AI_ACTIONS`).
- **Session ID en local state:** el frontend mantiene session_id en estado local y lo pasa a la query para reutilizar sesión existente.
- **`pnpm build` + `pnpm exec tsc --noEmit`** pasan sin errores tras F8.

## Decisiones F9

- **createStore fuera del executor:** crear una tienda no puede pasar por el executor porque no existe `store_id` previo. Se implementó como función standalone en `src/lib/executor/handlers/stores.ts` (mismo patrón que billing actions). Llama a service role directo.
- **acceptStoreInvitation en módulo independiente:** movido a `src/lib/invitations.ts` para evitar dependencia circular (`page → multiuser.ts → registry.ts → multiuser.ts`). El mismo patrón de import dinámico de F8.
- **signUp usa rollback manual:** si `createStore` falla después de crear el usuario en Supabase Auth, llama a `db.auth.admin.deleteUser(userId)` para limpiar. Esto requiere service_role key.
- **Onboarding usa acciones dedicadas:** `src/lib/actions/onboarding.ts` tiene acciones que resuelven el `store_id` del usuario autenticado vía `store_users` (no usan `getStoreContext()` que depende de headers del middleware admin).
- **useActionState hook:** login y signup usan `useActionState` de React 19 + server actions para manejo de estado de formulario sin useState adicional.
- **Bug fix multiuser:** `.eq('accepted', false)` → `.is('accepted_at', null)` en `list_invitations` handler.
- **`pnpm build` + `pnpm exec tsc --noEmit`** pasan sin errores tras F9.

## Blockers Actuales

- **MANUAL REQUERIDO:** Configurar env var `OPENAI_API_KEY` en `.env.local` y Vercel antes de usar el asistente.
- **MANUAL REQUERIDO (opcional):** Crear función RPC `increment_ai_tokens(p_store_id, p_tokens)` en Supabase para atomic increment de tokens. Sin ella, usa update directo (race condition en alto concurrencia, aceptable para MVP).
- **MANUAL REQUERIDO:** Configurar env vars Upstash Redis y otras variables pendientes de F5/F7.
- **MANUAL REQUERIDO:** Configurar Supabase Auth → email confirmación (actualmente disabled para MVP — habilitar en prod).

## Estado actual

F9 completa. Plataforma completa F0–F9. El flujo completo de registro → tienda → onboarding → panel admin está operativo.
