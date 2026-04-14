# Estado del Proyecto

**Fase actual:** F2 — Herramientas Transversales
**Paso actual:** Etapa 1 + polish /design panel completa. Admin panel refinado (ronda 2). Listo para F2.

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
  - config-hub: dark mode toggle, header con título, link a vitrina completa

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
- [ ] 3.0 Onboarding wizard (4 pasos: nombre, logo, productos, compartir link)
- [ ] 3.1 Rutas públicas: /[slug], /[slug]/[category], /[slug]/p/[id], /tracking/[code]
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
- [ ] 4.9 Módulos secundarios: stock, variantes, wholesale, shipping (métodos + envíos con tracking)
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

## Blockers Actuales

(ninguno — F0 completa)
