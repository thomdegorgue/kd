# Checklist — Fase 0: Fundación

## Objetivo de la Fase

Que el sistema exista de forma estructurada antes de escribir lógica de negocio.

**Criterio de completitud:** el design system está 100% documentado y la base de datos puede ejecutarse desde cero en cualquier momento produciendo el sistema completo.

→ Roadmap estratégico: `/docs/roadmap.md`

---

## BLOQUE A — Sistema de Contexto (`/system`)

Verificar que existen los 44 archivos del plan y ninguno tiene secciones vacías ni placeholders sin resolver.

### Grupo 1 — Fundación conceptual

- [x] `/system/core/domain-language.md` — nomenclatura canónica de todo el sistema
- [x] `/system/core/action-contract.md` — contrato universal de actions
- [x] `/system/constraints/global-rules.md` — 16 reglas técnicas absolutas
- [x] `/system/core/anti-patterns.md` — 16 patrones prohibidos con justificación
- [x] `/system/core/system-overview.md` — visión técnica general del sistema
- [x] `/system/core/decisions.md` — 7 decisiones arquitectónicas con contexto y justificación

### Grupo 2 — Arquitectura

- [x] `/system/architecture/multi-tenant.md` — modelo de aislamiento de datos por `store_id`

### Grupo 3 — Módulos (20 archivos)

- [x] `/system/modules/catalog.md`
- [x] `/system/modules/products.md`
- [x] `/system/modules/categories.md`
- [x] `/system/modules/cart.md`
- [x] `/system/modules/orders.md`
- [x] `/system/modules/stock.md`
- [x] `/system/modules/payments.md`
- [x] `/system/modules/variants.md`
- [x] `/system/modules/wholesale.md`
- [x] `/system/modules/shipping.md`
- [x] `/system/modules/finance.md`
- [x] `/system/modules/banners.md`
- [x] `/system/modules/social.md`
- [x] `/system/modules/product_page.md`
- [x] `/system/modules/multiuser.md`
- [x] `/system/modules/custom_domain.md`
- [x] `/system/modules/tasks.md`
- [x] `/system/modules/savings_account.md`
- [x] `/system/modules/expenses.md`
- [x] `/system/modules/assistant.md`

### Grupo 4 — Datos y Eventos

- [x] `/system/core/events.md` — contrato formal de 24 tipos de eventos
- [x] `/system/database/schema.md` — 26 tablas derivadas de los módulos

### Grupo 5 — Backend

- [x] `/system/backend/backend-rules.md` — 13 reglas operativas del servidor
- [x] `/system/backend/execution-model.md` — pipeline de 10 pasos del executor

### Grupo 6 — IA

- [x] `/system/ai/ai-behavior.md` — comportamiento y límites del asistente
- [x] `/system/ai/actions.md` — lista canónica de actions autorizadas para la IA
- [x] `/system/ai/execution.md` — pipeline técnico de 9 pasos del asistente

### Grupo 7 — Billing y Superadmin

- [x] `/system/billing/billing.md` — modelo de facturación del SaaS
- [x] `/system/billing/webhooks.md` — procesamiento de webhooks de Mercado Pago
- [x] `/system/superadmin/superadmin.md` — rol, capacidades y restricciones del superadmin

### Grupo 8 — Frontend y Design

- [x] `/system/frontend/frontend-rules.md` — 15 reglas de arquitectura frontend
- [x] `/system/design/system-design.md` — tokens, colores, tipografía, grillas
- [x] `/system/design/components.md` — catálogo completo de componentes UI

### Grupo 9 — Flows

- [x] `/system/flows/onboarding.md` — flujo de alta de tienda
- [x] `/system/flows/billing.md` — flujos de activación, módulos, cambio de plan
- [x] `/system/flows/lifecycle.md` — máquina de estados completa de la tienda

### Grupo 10 — Checklists

- [x] `/system/checklists/fase-0.md` — este archivo

**Total archivos `/system`:** 44 + `system-build-plan.md` (meta-documento) = 45 archivos
**Total tablas DB:** 28 (ver `/system/database/schema.md` — Resumen de Tablas)

---

## BLOQUE B — Documentación Conceptual (`/docs`)

- [x] `/docs/fundamentals.md` — problema, usuarios, diferenciación, principios
- [x] `/docs/product.md` — capacidades funcionales y módulos
- [x] `/docs/architecture.md` — decisiones arquitectónicas de alto nivel
- [x] `/docs/database.md` — modelo de datos conceptual
- [x] `/docs/business.md` — modelo de negocio SaaS y billing
- [x] `/docs/roadmap.md` — fases de desarrollo Fase 0 → Fase 6

---

## BLOQUE C — Entorno de Proyecto

### Repositorio y configuración base

- [ ] Repositorio Git inicializado con rama `main`
- [ ] `.gitignore` configurado (Next.js + Node + `.env*`)
- [ ] `.env.example` con todas las variables requeridas documentadas
- [ ] `README.md` actualizado con instrucciones de setup local

### Variables de entorno requeridas en `.env.example`

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `MP_ACCESS_TOKEN`
- [ ] `MP_PUBLIC_KEY`
- [ ] `MP_WEBHOOK_SECRET`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `OPENAI_API_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` (dominio base de la plataforma)

### Dependencias instaladas

- [ ] `next` v15 + `react` + `react-dom`
- [ ] `typescript` + `@types/react` + `@types/node`
- [ ] `tailwindcss` + `postcss` + `autoprefixer`
- [ ] `@supabase/supabase-js` + `@supabase/ssr`
- [ ] `@tanstack/react-query` v5
- [ ] `zustand`
- [ ] `react-hook-form` + `@hookform/resolvers` + `zod`
- [ ] `lucide-react`
- [ ] `shadcn/ui` (components base inicializados)
- [ ] `openai`
- [ ] `@upstash/redis`

---

## BLOQUE D — Base de Datos

### Schema SQL

- [ ] Script SQL generado a partir de `/system/database/schema.md`
- [ ] Script ejecutable en Supabase desde cero (sin errores)
- [ ] Todas las 28 tablas creadas con campos, tipos y restricciones correctas
- [ ] Índices definidos en `schema.md` implementados
- [ ] Restricciones `NOT NULL`, `DEFAULT`, `CHECK` implementadas

### Seguridad (RLS)

- [ ] RLS habilitado en todas las tablas de dominio
- [ ] Política `store_id = auth.uid()` o equivalente en todas las tablas con `store_id`
- [ ] Tabla `events` con RLS que permite INSERT pero no UPDATE ni DELETE
- [ ] Tabla `plans` con política de solo lectura para usuarios autenticados
- [ ] Tabla `users` con política de lectura solo del propio registro

### Supabase Auth

- [ ] Email de confirmación configurado (template en español)
- [ ] Redirect URL post-confirmación → `/crear-tienda`
- [ ] Políticas de contraseña: mínimo 8 caracteres

---

## BLOQUE E — Design System

### Configuración de Tailwind

- [ ] Tokens de color de `system-design.md` definidos en `tailwind.config.ts`
- [ ] Escala tipográfica definida
- [ ] Breakpoints configurados (base: 360px mínimo)
- [ ] Extensiones de `border-radius`, `shadow` y `spacing` según el sistema de diseño

### Componentes base (shadcn/ui inicializados)

- [ ] `Button` (variantes: primary, secondary, ghost, destructive)
- [ ] `Input` con label y estado de error
- [ ] `Select`
- [ ] `Checkbox`
- [ ] `Switch`
- [ ] `Modal` / `Dialog`
- [ ] `Drawer` / `Sheet`
- [ ] `Toast` / `Sonner`
- [ ] `Badge` con variantes semánticas (success, warning, error, info, gray)
- [ ] `Skeleton`
- [ ] `Table` base
- [ ] `Tabs`
- [ ] `Card`
- [ ] `Avatar`
- [ ] `Tooltip`
- [ ] `DropdownMenu`

### Componentes admin construidos

- [ ] `AdminLayout` (sidebar + contenido)
- [ ] `Sidebar` con navegación por módulos
- [ ] `BottomNav` para mobile
- [ ] `PageHeader` (título + breadcrumb + acciones)
- [ ] `ModuleLockedState`
- [ ] `EmptyState`
- [ ] `StatCard`
- [ ] `StatusBadge` mapeado a estados del dominio

---

## BLOQUE F — Arquitectura de Código

### Estructura de carpetas

- [ ] `/app/(public)/[slug]/` — routing de vitrina pública
- [ ] `/app/(admin)/admin/` — routing del panel de gestión con `AdminLayout`
- [ ] `/app/(superadmin)/superadmin/` — routing del panel superadmin
- [ ] `/app/api/` — API routes organizadas por módulo
- [ ] `/lib/executor/` — executor central
- [ ] `/lib/middleware/` — resolución de tienda, auth, rate limit
- [ ] `/lib/db/` — cliente Supabase y helpers
- [ ] `/lib/cache/` — helpers de Redis
- [ ] `/lib/events/` — helper de emisión de eventos
- [ ] `/components/ui/` — primitivos
- [ ] `/components/admin/` — componentes del panel
- [ ] `/components/public/` — componentes de la vitrina

### Middleware de Next.js

- [ ] Resolución de tienda por subdominio (`{slug}.kitdigital.ar`)
- [ ] Guard de autenticación para `/admin/*` → redirect a `/login`
- [ ] Guard de superadmin para `/superadmin/*` → 403 si no es superadmin
- [ ] `StoreContext` construido una sola vez por request

### Executor

- [ ] Función `executor({ name, store_id, actor, input })` implementada
- [ ] Pipeline de 10 pasos según `/system/backend/execution-model.md`
- [ ] Registro de handlers (`/lib/executor/registry.ts`)
- [ ] Retorno tipado `ActionResult` (success + data | error)

---

## BLOQUE G — Verificación de Consistencia del Sistema

Validaciones transversales que garantizan que el `/system` es internamente consistente.

### Nomenclatura

- [ ] Todos los nombres de actions en `snake_case` siguiendo la tipología de `/system/core/domain-language.md`
- [ ] Todos los nombres de tablas en `snake_case` singular
- [ ] Todos los nombres de eventos en `snake_case` pasado (`product_created`, no `create_product`)
- [ ] Todos los nombres de campos en `snake_case`

### Contratos

- [ ] Cada action declarada en módulos tiene su contrato completo (actor, requires, permissions, input, output, errors)
- [ ] Cada evento declarado en módulos existe en `/system/core/events.md`
- [ ] Cada tabla declarada en módulos (`Data Impact`) existe en `/system/database/schema.md`
- [ ] Cada campo declarado en módulos existe en la tabla correspondiente de `schema.md`

### Módulos

- [ ] Ningún módulo define lógica de negocio de otro módulo
- [ ] `assistant.md` no define business logic propia (solo orquesta actions existentes)
- [ ] Cada módulo lista sus `External reads` explícitamente

### IA

- [ ] Ninguna action en `/system/ai/actions.md` está en la lista de prohibidas
- [ ] Todas las actions de `/system/ai/actions.md` tienen `requires` alineados con el módulo dueño
- [ ] El pipeline de `/system/ai/execution.md` invoca al executor sin bypass

### Seguridad

- [ ] Todas las tablas con `store_id` tienen RLS habilitado
- [ ] El executor siempre valida `store_id` antes de ejecutar (Paso 2)
- [ ] Ningún endpoint de billing expone datos de tarjeta
- [ ] El superadmin no puede acceder a datos de negocio privados de tiendas

---

## BLOQUE H — Criterio de Completitud de Fase 0

Según `/docs/roadmap.md`, la Fase 0 está completa cuando:

- [ ] **El design system está 100% documentado** — cumplido con `system-design.md` + `components.md`
- [ ] **La base de datos puede ejecutarse desde cero** — script SQL generado desde `schema.md`, probado en Supabase
- [ ] **La estructura del proyecto está definida y documentada** — cumplido con `system-build-plan.md` + todos los archivos del `/system`
- [ ] **El entorno de desarrollo funciona localmente** — `npm run dev` sin errores, conexión a Supabase verificada
- [ ] **Los componentes base están construidos** — los componentes del Bloque E están implementados y funcionales

**La Fase 0 NO requiere:**
- Lógica de negocio implementada
- Endpoints funcionales de módulos
- Flujo de onboarding operativo
- Billing integrado con Mercado Pago

Eso corresponde a Fase 1 en adelante.

---

## Estado Actual al Cerrar Fase 0

| Bloque | Estado |
|--------|--------|
| A — Sistema de contexto (`/system`) | ✅ Completo — 44 archivos creados + schema.md corregido (28 tablas) |
| B — Documentación conceptual (`/docs`) | ✅ Completo — 6 archivos creados |
| C — Entorno de proyecto | ⏳ Pendiente de implementación |
| D — Base de datos | ⏳ Pendiente de implementación |
| E — Design system | ⏳ Pendiente de implementación |
| F — Arquitectura de código | ⏳ Pendiente de implementación |
| G — Verificación de consistencia | ⏳ Pendiente de validación final |
| H — Criterio de completitud | ⏳ Parcialmente cumplido (A + B listos) |

**Próximo paso:** Iniciar implementación técnica comenzando por Bloque C (entorno) → Bloque D (base de datos) → Bloque E (design system) → Bloque F (arquitectura de código).
