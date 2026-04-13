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
