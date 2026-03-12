# Documento Técnico Fundamental — KitDigital.ar
**Versión**: 1.0  
**Fecha**: Marzo 2026  
**Estado**: Borrador vivo (source of truth)  

## Alcance de este documento
Este documento define la base integral para construir **KitDigital.ar** como un **SaaS multitenant modular** para catálogos digitales + carrito WhatsApp, **100% mobile-first**, orientado a emprendedores y pymes de Argentina y Latam.

- **Incluye**: visión, arquitectura, multitenancy, módulos, estructura de Next.js, esquema SQL (referenciado), flujos y deploy.
- **No incluye**: roadmap / próximos pasos (por decisión explícita).
- **Nivel de detalle**: estructuras y contratos (sin implementaciones completas de código).

## Nombres oficiales (Latam-friendly)
- **Producto**: KitDigital.ar  
- **Catálogo público**: Mi Vitrina  
- **Banner principal (público)**: Portada Principal  
- **Sección de módulos en admin**: Módulos Potenciadores  
- **Onboarding IA**: Creá tu Kit en 60 segundos  

## Tabla de contenidos
1. [Visión del Producto](#1-visión-del-producto)  
2. [Arquitectura General (Stack confirmado)](#2-arquitectura-general-stack-confirmado)  
3. [Multitenancy (corazón del sistema)](#3-multitenancy-corazón-del-sistema)  
4. [Esquema SQL completo (archivo referenciado)](#4-esquema-sql-completo-archivo-referenciado)  
5. [Sistema de Módulos (Módulos Potenciadores)](#5-sistema-de-módulos-módulos-potenciadores)  
6. [Estructura Next.js 15 (App Router) + Componentes principales](#6-estructura-nextjs-15-app-router--componentes-principales)  
7. [Flujos principales](#7-flujos-principales)  
8. [Configuración y Deploy](#8-configuración-y-deploy)  

---

## 1. Visión del Producto
### 1.1 Resumen
**KitDigital.ar** es la "vitrina digital mágica" que un negocio puede tener en **60 segundos**: un catálogo público independiente por cliente (subdominio o dominio propio), con carrito que envía el pedido directo por **WhatsApp**.

### 1.2 Principios de producto
- **Time-to-value extremo**: onboarding corto, resultado visible inmediato.
- **Mobile-first real**: panel y vitrina pensados para uso desde celular.
- **Modularidad**: el negocio empieza simple y activa módulos con toggles.
- **Latam-first**: ARS, Mercado Pago, copy y defaults argentinos/latinos.

### 1.3 Modelo de negocio (inicial)
- **Plan base**: $20.000 ARS/mes cada 100 productos.
- **Módulos opcionales**: $8.000–$15.000 ARS/mes según módulo.
- **Cobro**: suscripciones recurrentes con Mercado Pago.

---

## 2. Arquitectura General (Stack confirmado)
### 2.1 Stack
| Capa | Tecnología | Razón principal |
|---|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn/ui + TanStack Query | Ultra rápido, mobile-first, sensación SPA |
| Hosting | Vercel (wildcard subdominios + custom domains) | Subdominios "gratis", middleware, edge |
| Base de datos | Supabase (Postgres + Auth + Storage + Realtime + Edge Functions) | Plataforma unificada |
| IA | OpenAI GPT-4o-mini (vía Edge Function) | Costo/beneficio excelente |
| Pagos | Mercado Pago (suscripciones) | ARS nativo |
| Analytics | PostHog (self-hosted, preferente en Supabase) | Centro de datos Superadmin |

### 2.2 Componentes de alto nivel (lógico)
- **Landing**: `kitdigital.ar` (marketing + precios).
- **Admin App**: `app.kitdigital.ar` (panel del cliente).
- **Vitrina pública**: `{tenant}.kitdigital.ar` (catálogo + carrito WhatsApp).
- **Superadmin**: sección protegida (operación + datos + impersonación).

---

## 3. Multitenancy (corazón del sistema)
### 3.1 Objetivo
Aislamiento fuerte entre tenants con **una sola base**, minimizando complejidad operativa y costo.

### 3.2 Estrategia
- **Una DB** (Supabase Postgres).
- Tabla principal: `tenants`.
- Todas las tablas "de negocio" contienen `tenant_id uuid` (FK a `tenants.id`).
- **RLS** como aislamiento primario.
- **Superadmin** con bypass controlado por claim/rol.

### 3.3 Identidad y claims (alto nivel)
- Auth: Supabase Auth.
- JWT: incluir `tenant_id` y `role` como claims.
- Rol `superadmin`: bypass de policies (ver `schema.sql`).

**Estrategia recomendada (estructura)**:
- **Usuario cliente (tenant admin)**:
  - `tenant_id`: tenant "activo" en sesión.
  - `role`: vacío o `tenant_admin` (opcional; RLS principal sigue siendo `tenant_id`).
- **Superadmin**:
  - `role = superadmin` para bypass (RLS lo contempla).

**Notas**:
- En público (Mi Vitrina) se opera con **anon key** y policies de `SELECT` público (ver `schema.sql`).
- En admin se opera autenticado y con `tenant_id` presente.

### 3.4 Resolución de tenant (routing)
- Dominio público: `{slug}.kitdigital.ar` o dominio custom.
- Admin: `app.kitdigital.ar` (siempre "contextualiza" tenant por sesión/claim).
- Middleware Edge (Vercel) **(estructura, no código final)**:
  - Extraer host y subdominio.
  - Resolver `tenant.slug → tenant.id`.
  - En público: setear contexto (header/cookie) para SSR/queries.
  - En login/admin: garantizar claim `tenant_id` en JWT según tenant activo.

### 3.5 Patrón RLS (resumen)
El patrón aplicado en [`schema.sql`](./schema.sql) es:
- **Tablas privadas** (admin/sistema): `tenant_id = current_tenant_id()` OR `is_superadmin()`.
- **Tablas públicas** (Mi Vitrina): `SELECT` público condicionado (por ejemplo `is_active = true`) + escritura solo tenant/superadmin.

> **Nota sobre RLS público (fase 1)**: Las políticas `categories_public_select` y `products_public_select` permiten `SELECT` público de productos/categorías activos de todos los tenants. Esto es seguro en fase 1 (hasta ~1000 tenants) porque: (1) Next.js siempre filtra por `tenant_id` en queries (middleware + server components), (2) IDs son UUID (no adivinables), (3) el 99,9% del tráfico público viene de subdominios. En escala mayor, se puede agregar `current_public_tenant_id()` en ~2 horas si se requiere.

---

## 4. Esquema SQL completo (archivo referenciado)
El esquema SQL (tablas + RLS + funciones + triggers + índices) vive en:

- **Archivo**: [`schema.sql`](./schema.sql)

### 4.1 Aplicación del esquema (Supabase)
- Ejecutar el contenido de [`schema.sql`](./schema.sql) en el **SQL editor** de Supabase (o migraciones).
- Verificar que RLS quede habilitado en todas las tablas listadas (en el archivo ya se ejecuta `enable row level security`).
- Verificar que los **claims** `tenant_id` y `role` existan en el JWT (condición necesaria para aislamiento y bypass superadmin).

> Nota: `schema.sql` está diseñado para multitenancy con `tenant_id` + claims en JWT.

---

## 5. Sistema de Módulos (Módulos Potenciadores)
### 5.1 Principio
Cada tenant puede activar/desactivar módulos con un toggle. El sistema debe:
- Mantener **Core** siempre activo.
- Encender módulos sin "romper" UI/DB (feature flags por tenant).
- Soportar configuración por módulo (jsonb).

### 5.2 Modelo de datos (alto nivel)
Tabla: `tenant_modules`
- `tenant_id`
- `module_key`
- `active`
- `config` (jsonb)

### 5.3 Módulos iniciales
- **Core** (siempre activo)
- **Stock**
- **Ventas**
- **Finanzas**
- **Mayorista** (`/mayorista`)
- **Variantes y Marcas**

---

## 6. Estructura Next.js 15 (App Router) + Componentes principales
> Esta sección define **estructura de carpetas** y **componentes principales**. Sin implementaciones completas de código.

### 6.1 Principios de estructura
- **Separación por "áreas"**: público (Mi Vitrina), admin (cliente), superadmin.
- **Mobile-first**: layouts y componentes con prioridad de UX en celular.
- **Data fetching**: RSC para shell/SSR + TanStack Query para interacciones "SPA-like".
- **TypeScript**: estricto "razonable" para builds en Vercel (evitar `any`, evitar `ts-ignore`, habilitar checks útiles).

### 6.2 Árbol de carpetas propuesto (alto nivel)
> Nota: es estructura inicial recomendada; se ajusta al crecer.

```
/
├─ app/
│  ├─ (public)/
│  │  ├─ [tenant]/
│  │  │  ├─ layout.tsx                 # layout de Mi Vitrina (público)
│  │  │  ├─ page.tsx                   # catálogo (home)
│  │  │  ├─ producto/[productId]/page.tsx
│  │  │  ├─ mayorista/page.tsx         # condicionado a módulo
│  │  │  └─ _components/
│  │  │     ├─ CatalogHeader.tsx
│  │  │     ├─ ProductGrid.tsx
│  │  │     ├─ CartDrawer.tsx
│  │  │     └─ WhatsAppCheckoutButton.tsx
│  ├─ (admin)/
│  │  ├─ layout.tsx                    # shell del Panel Admin
│  │  ├─ dashboard/page.tsx
│  │  ├─ productos/
│  │  │  ├─ page.tsx
│  │  │  ├─ nuevo/page.tsx
│  │  │  └─ [productId]/editar/page.tsx
│  │  ├─ categorias/page.tsx
│  │  ├─ portada-principal/page.tsx
│  │  ├─ modulos-potenciadores/page.tsx
│  │  ├─ pedidos/page.tsx
│  │  └─ configuracion/page.tsx
│  ├─ (superadmin)/
│  │  ├─ layout.tsx
│  │  ├─ tenants/page.tsx
│  │  ├─ tenants/[tenantId]/page.tsx
│  │  ├─ centro-de-datos/page.tsx
│  │  └─ _components/
│  │     ├─ TenantTable.tsx
│  │     └─ ImpersonateButton.tsx
│  ├─ (auth)/
│  │  ├─ login/page.tsx
│  │  └─ callback/page.tsx
│  ├─ api/
│  │  ├─ health/route.ts               # verificación simple
│  │  └─ mp/webhook/route.ts           # Mercado Pago (estructura)
│  ├─ globals.css
│  └─ layout.tsx                       # root layout
│
├─ components/
│  ├─ ui/                              # shadcn/ui (copiado)
│  ├─ AppShell.tsx
│  ├─ MobileNav.tsx
│  └─ LoadingSkeletons.tsx
│
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts                     # browser client
│  │  ├─ server.ts                     # server client (cookies/headers)
│  │  └─ types.ts                      # DB types (generados)
│  ├─ tenant/
│  │  ├─ resolveTenant.ts              # resolución por host/slug (estructura)
│  │  └─ tenantContext.ts              # helpers de contexto (estructura)
│  ├─ modules/
│  │  ├─ moduleKeys.ts                 # union de keys
│  │  └─ moduleAccess.ts               # helpers de gating (estructura)
│  ├─ whatsapp/
│  │  └─ buildMessage.ts               # builder mensaje WhatsApp (estructura)
│  └─ money/
│     └─ formatARS.ts
│
├─ hooks/
│  ├─ useTenant.ts
│  ├─ useModules.ts
│  └─ useCart.ts
│
├─ middleware.ts                       # Vercel Middleware (estructura)
├─ types/
│  ├─ domain.ts                        # tipos de dominio (Tenant, Product, etc.)
│  └─ modules.ts
├─ .env.example
└─ README.md
```

### 6.3 Componentes principales (contratos)
- **Público (Mi Vitrina)**:
  - `CatalogHeader`: muestra `name`, búsqueda, acceso al carrito.
  - `ProductGrid`: grilla responsive + skeleton.
  - `CartDrawer`: estado local + persistencia (estructura) + CTA a WhatsApp.
  - `WhatsAppCheckoutButton`: construye URL `wa.me` con mensaje.
- **Admin**:
  - `ModuleToggle`: switch iOS-like + optimistic update (estructura).
  - `ProductForm`: create/edit (estructura).
  - `CategoryManager`: CRUD simple (estructura).
  - `PortadaPrincipalEditor`: editor de título/subtítulo/color.
- **Superadmin**:
  - `TenantTable`: listado, filtros, métricas básicas (estructura).
  - `ImpersonateButton`: setea contexto de impersonación (estructura).

### 6.4 TypeScript "decente" (criterios)
- `strict: true` (recomendado) con enfoque en:
  - Tipos de dominio en `types/` y tipos DB en `lib/supabase/types.ts`.
  - Evitar `any`; preferir `unknown` + refinamiento.
  - `noUncheckedIndexedAccess: true` (opcional, si no complica DX).
  - `skipLibCheck: true` (para builds más estables).

---

## 7. Flujos principales
### 7.1 Onboarding con IA — "Creá tu Kit en 60 segundos" (estructura)
**Objetivo**: crear tenant + datos iniciales (categorías, productos, portada) en 1 flujo guiado.

**UI (pasos)**:
- **Paso 1 (inputs)**:
  - Nombre del negocio
  - WhatsApp del comercio
  - "¿De qué trata tu negocio?" (texto libre)
  - Color principal (color picker)
- **Paso 2 (IA)**:
  - Llamada a Edge Function: genera categorías/productos/portada.
- **Paso 3 (resultado)**:
  - Redirección al dashboard con vitrina pública operativa.

**Contrato Edge Function (alto nivel)**:
- **Entrada**: `{ name, whatsapp, descripcion, primary_color }`
- **Salida**: `{ tenant_id, slug, seeded: { categories: n, products: n } }`
- **Persistencia**:
  - `tenants`
  - `categories`
  - `products`
  - `tenant_portada_principal`

### 7.2 Carrito → WhatsApp (estructura)
**Objetivo**: pedido sin checkout propio; el cliente final confirma por WhatsApp.

**Estructura**:
- `CartDrawer` mantiene items (productId, qty, price snapshot).
- Botón "Enviar pedido":
  - Construye mensaje WhatsApp (estructura en `lib/whatsapp/buildMessage.ts`).
  - Abre `wa.me/<whatsapp>?text=<encoded>`.
- Registro interno:
  - Crear `orders` + `order_items` con snapshot del mensaje y totales.

### 7.3 Suscripciones Mercado Pago (estructura)
**Objetivo**: billing recurrente ARS con límites por plan.

**Estructura**:
- Tabla `subscriptions` (ver `schema.sql`).
- Webhook `app/api/mp/webhook/route.ts` (estructura):
  - Verificar firma/evento.
  - Upsert en `subscriptions`.
  - Actualizar `tenants.plan_product_limit` / estado.

### 7.4 Superadmin: impersonación (estructura)
**Objetivo**: operar tenants rápidamente.

**Estructura**:
- Vista `tenants` con búsqueda.
- Acción "Impersonar":
  - Establece contexto (cookie/claim) para operar como tenant.
  - Auditoría sugerida (pendiente si se requiere).

---

## 8. Configuración y Deploy
### 8.1 Variables de entorno (estructura)
> Definir en Vercel y local. Mantener un `.env.example`.

- **Supabase**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (solo server/edge, nunca al cliente)
- **OpenAI (Edge Function)**
  - `OPENAI_API_KEY`
- **Mercado Pago**
  - `MP_ACCESS_TOKEN`
  - `MP_WEBHOOK_SECRET` (si aplica)
- **Base URL**
  - `NEXT_PUBLIC_APP_URL` (e.g. `https://app.kitdigital.ar`)
  - `NEXT_PUBLIC_ROOT_DOMAIN` (e.g. `kitdigital.ar`)

### 8.2 Vercel: wildcard subdomains + domains custom (estructura)
- Configurar wildcard: `*.kitdigital.ar` apuntando a Vercel.
- Configurar `app.kitdigital.ar` (admin) y root `kitdigital.ar` (landing).
- Middleware (`middleware.ts`) se encarga de:
  - Resolver tenant por host/subdominio.
  - Redirigir rutas inválidas.
  - En público: setear contexto de tenant para SSR/data fetch.

### 8.3 Supabase: Auth + claims + RLS (estructura)
- **RLS**: definidas en [`schema.sql`](./schema.sql) con patrón:
  - `tenant_id = current_tenant_id()` OR `is_superadmin()`.
- **Claims requeridos**:
  - `tenant_id`: UUID del tenant activo.
  - `role`: `superadmin` para bypass.
- **Edge Functions**:
  - `onboarding-ai`: crea tenant + seed.
  - (Opcional) `set-claims`: seteo de claims por tenant al login (según estrategia).

### 8.4 Storage (estructura)
- Bucket `product-images`:
  - paths por tenant: `tenants/<tenant_id>/products/<product_id>/<file>`
  - policies alineadas a `tenant_id` (detalle en implementación, fuera de este doc).

### 8.5 PostHog (estructura)
- Self-host en infraestructura controlada (idealmente cerca de Supabase).
- Eventos mínimos:
  - `tenant_created`
  - `product_created`
  - `order_sent_whatsapp`
  - `module_toggled`

### 8.6 Checklist de deploy inicial
- Subdominios wildcard y dominios listos.
- Supabase project + Auth habilitado.
- Ejecutar [`schema.sql`](./schema.sql).
- Variables de entorno seteadas en Vercel.
- Onboarding IA funcionando (Edge Function + keys).


