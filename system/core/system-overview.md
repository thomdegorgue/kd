# System Overview — KitDigital.AR

## Qué es este sistema

KitDigital es un SaaS multi-tenant modular que permite a negocios pequeños crear y operar una tienda digital en minutos.

Cada tienda es un tenant aislado dentro de una infraestructura compartida.
El sistema es un monolito modular: una sola base de código, una sola base de datos, sin microservicios.

→ Fundamento de negocio: `/docs/fundamentals.md`
→ Decisiones de arquitectura: `/docs/architecture.md`

---

## Stack Tecnológico

| Capa | Tecnología | Rol |
|------|-----------|-----|
| Frontend | Next.js 15 (App Router) | UI, rutas, SSR/SSG |
| Estilos | Tailwind CSS + shadcn/ui | Design system base |
| Estado cliente | TanStack Query | Cache y sync de datos |
| Backend | Supabase (PostgreSQL) | Base de datos, Auth, Storage, Realtime |
| Media | Cloudinary | Upload y transformación de imágenes |
| Cache / Rate limit | Upstash Redis | Cache de consultas frecuentes y rate limiting |
| Hosting | Vercel | Deploy, wildcard subdomains, Edge functions |
| Pagos | Mercado Pago | Suscripciones y billing |
| IA | OpenAI GPT-4o-mini | Generación de contenido y onboarding |

---

## Modelo de Tenancy

Una sola instancia del sistema sirve a todas las tiendas.

El aislamiento entre tenants se garantiza exclusivamente por `store_id`:
- toda entidad de dominio tiene `store_id`
- toda query incluye `WHERE store_id = currentStoreId`
- el `currentStoreId` se resuelve en servidor, nunca en cliente

Resolución de tienda (en orden de precedencia):
1. Subdominio: `{slug}.kitdigital.ar`
2. Dominio custom: `mitienda.com` (si módulo `custom_domain` activo)
3. Rutas especiales: `/demo/{slug}`, `/archived/{slug}`

→ Detalles: `/system/architecture/multi-tenant.md`

---

## Estructura del Sistema

```
/system
  /core             — contratos, lenguaje, reglas y eventos del sistema
  /architecture     — decisiones de infraestructura y tenancy
  /constraints      — reglas globales de enforcement
  /modules          — comportamiento de cada módulo (20 módulos)
  /database         — schema completo de la base de datos
  /backend          — reglas y pipeline de ejecución del servidor
  /ai               — comportamiento, actions y ejecución de la IA
  /billing          — modelo de billing, webhooks y lifecycle
  /superadmin       — capacidades del rol global
  /frontend         — reglas de la capa de presentación
  /design           — design system y componentes
  /flows            — flujos de usuario de punta a punta
  /checklists       — validación de fases de desarrollo
```

---

## Capas del Sistema

```
┌─────────────────────────────────┐
│         VITRINA PÚBLICA         │  Acceso sin login. Mobile-first.
│  (catálogo + carrito + WA)      │  → módulos: catalog, cart
├─────────────────────────────────┤
│         PANEL DE GESTIÓN        │  Acceso autenticado por dueño/admin.
│  (productos, pedidos, config)   │  → módulos: products, orders, etc.
├─────────────────────────────────┤
│         PANEL SUPERADMIN        │  Acceso global. Impersonación.
│  (tiendas, billing, overrides)  │  → /system/superadmin/superadmin.md
├─────────────────────────────────┤
│           EXECUTOR              │  Valida módulos, límites, input.
│  (action pipeline)              │  → /system/backend/execution-model.md
├─────────────────────────────────┤
│           MÓDULOS               │  Lógica de negocio encapsulada.
│  (20 módulos independientes)    │  → /system/modules/
├─────────────────────────────────┤
│     BASE DE DATOS (Supabase)    │  Un schema, múltiples tenants por store_id.
│  (PostgreSQL + RLS)             │  → /system/database/schema.md
└─────────────────────────────────┘
```

---

## Roles del Sistema

| Rol | Scope | Descripción |
|-----|-------|-------------|
| `owner` | Una tienda | Control total sobre su tienda |
| `admin` | Una tienda | Igual que owner salvo billing |
| `collaborator` | Una tienda | Operaciones limitadas |
| `superadmin` | Todo el sistema | Sin restricciones |
| `system` | — | Procesos internos (cron, webhooks) |
| `ai` | Una tienda | Propone actions, no ejecuta directamente |

---

## Sistema Modular

Cada tienda tiene un campo `store.modules` (JSONB) que registra qué módulos están activos:

```json
{
  "catalog": true,
  "cart": true,
  "orders": false,
  "stock": false
}
```

Los módulos del CORE (`catalog`, `cart`, `products`, `categories`) están activos por defecto.
El resto se activa individualmente según el plan.

Toda action verifica en el executor que los módulos requeridos están activos.

→ Lista completa de módulos: `/system/core/domain-language.md`
→ Cada módulo definido en: `/system/modules/{nombre}.md`

---

## Sistema de Límites

Cada tienda tiene límites según su plan:

```json
{
  "max_products": 10,
  "max_orders": 100,
  "ai_tokens": 5000
}
```

Los límites se verifican en el executor antes de ejecutar actions que los afectan.
El superadmin puede modificar los límites de cualquier tienda manualmente.

---

## Lifecycle de Tienda

```
[NUEVO USUARIO]
      ↓
   demo (15 días, límites reducidos)
      ↓ pago confirmado (webhook)
   active (acceso total)
      ↓ pago vencido (cron diario)
   past_due (acceso limitado)
      ↓ intervención manual superadmin
   suspended (sin acceso)
      ↓ tiempo sin pago (cron)
   archived (fuera del sistema activo)
```

→ Reglas de transición: `/system/flows/lifecycle.md`
→ Billing detallado: `/system/billing/billing.md`

---

## Sistema de IA

La IA opera como capa de asistencia. No ejecuta acciones directamente.

Flujo:
1. Usuario interactúa con el asistente
2. IA genera una propuesta: `{ "action": "create_product", "data": {...} }`
3. La propuesta se presenta al usuario para confirmación (si aplica)
4. El executor recibe el JSON, aplica todas las validaciones del contrato
5. Si pasa todas las validaciones, se ejecuta la action
6. Se emite el evento correspondiente

→ Comportamiento: `/system/ai/ai-behavior.md`
→ Actions disponibles: `/system/ai/actions.md`
→ Ejecución: `/system/ai/execution.md`

---

## Sistema de Eventos

Todo efecto de negocio significativo genera un evento inmutable registrado en la tabla `events`.

Eventos mínimos obligatorios:
- `product_created`
- `order_created`
- `payment_approved`
- `module_enabled`
- `store_status_changed`

→ Contrato completo: `/system/core/events.md`

---

## Fuentes de Verdad

| Qué | Dónde |
|-----|-------|
| Propósito y negocio | `/docs/` |
| Nomenclatura | `/system/core/domain-language.md` |
| Contrato de actions | `/system/core/action-contract.md` |
| Reglas globales | `/system/constraints/global-rules.md` |
| Lo prohibido | `/system/core/anti-patterns.md` |
| Comportamiento por módulo | `/system/modules/{nombre}.md` |
| Contrato de eventos | `/system/core/events.md` |
| Estructura de datos | `/system/database/schema.md` |
| Pipeline de ejecución | `/system/backend/execution-model.md` |
| Decisiones excepcionales | `/system/core/decisions.md` |
