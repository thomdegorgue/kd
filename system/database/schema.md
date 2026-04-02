# Database Schema — KitDigital.AR

## Propósito

Este archivo es la fuente de verdad de la estructura de datos del sistema.

Define todas las tablas, sus campos, relaciones, índices y reglas de diseño. Se deriva directamente de los módulos (sección Data Impact de cada uno) y del sistema de eventos.

Este archivo es la referencia para generar el SQL ejecutable en Supabase.

→ Entidades declaradas por módulos: `/system/modules/`
→ Eventos: `/system/core/events.md`
→ Reglas globales de datos: `/system/constraints/global-rules.md`
→ Multi-tenancy: `/system/architecture/multi-tenant.md`

---

## Reglas de Diseño

1. **Toda tabla de dominio tiene `store_id`** — sin excepción. Ver R1 en global-rules.
2. **UUID v4 para todos los IDs** — nunca integers autoincrementales.
3. **Timestamps con timezone** — `timestamptz` en Postgres. Siempre en UTC.
4. **Soft delete** — las entidades de dominio no se eliminan físicamente si tienen historial. Se marcan con `deleted_at` donde aplique.
5. **JSONB solo para extensiones** — `store.config`, `store.modules`, `store.limits`, `product.metadata`, `order.metadata`. Nunca lógica crítica en JSONB. Los campos de billing son columnas explícitas (no JSONB) porque requieren queries directas y son actualizados frecuentemente.
6. **Índices obligatorios** — `store_id` en toda tabla de dominio. Índices compuestos en columnas de filtro frecuente.
7. **Row Level Security (RLS)** — habilitado en todas las tablas de dominio vía Supabase.
8. **Snapshots en order_items** — `unit_price` y `product_name` son snapshots al momento del pedido; no referencias dinámicas.

---

## Tablas del Sistema

### SISTEMA GLOBAL (sin store_id)

---

#### `users`
Propietario: core (Auth de Supabase gestiona la autenticación; esta tabla extiende el perfil)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK, referencia a `auth.users.id` |
| `email` | TEXT | NOT NULL, UNIQUE |
| `full_name` | TEXT | nullable |
| `avatar_url` | TEXT | nullable |
| `role` | TEXT | NOT NULL, default `'user'` — `user\|superadmin`. Usado por el middleware para proteger `/superadmin/*` |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |

Índices: `email`, `role` (parcial: `WHERE role = 'superadmin'`)

---

#### `plans`
Propietario: billing/core

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL — `starter\|growth\|pro` |
| `price` | INTEGER | NOT NULL (centavos/mes) |
| `max_products` | INTEGER | NOT NULL |
| `max_orders` | INTEGER | NOT NULL |
| `ai_tokens` | INTEGER | NOT NULL — tokens mensuales incluidos |
| `available_modules` | JSONB | NOT NULL — lista de módulos incluidos en el plan base |
| `module_prices` | JSONB | NOT NULL, default `{}` — precios de módulos adicionales: `{ stock: 150000, payments: 200000, ... }` (centavos/mes) |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

---

### TIENDA (con store_id)

---

#### `stores`
Propietario: catalog / core

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `name` | TEXT | NOT NULL |
| `slug` | TEXT | NOT NULL, UNIQUE |
| `status` | TEXT | NOT NULL — `demo\|active\|past_due\|suspended\|archived` |
| `plan_id` | UUID | nullable, FK → `plans.id` |
| `modules` | JSONB | NOT NULL, default `{}` — `{ catalog: true, orders: false, ... }` |
| `config` | JSONB | NOT NULL, default `{}` — apariencia, colores, social_links, whatsapp_message |
| `limits` | JSONB | NOT NULL, default `{}` — `{ max_products, max_orders, ai_tokens }` (copiado del plan al activar) |
| `custom_domain` | TEXT | nullable, UNIQUE |
| `custom_domain_verified` | BOOLEAN | NOT NULL, default false |
| `custom_domain_verified_at` | TIMESTAMPTZ | nullable |
| `logo_url` | TEXT | nullable |
| `cover_url` | TEXT | nullable |
| `whatsapp` | TEXT | nullable |
| `description` | TEXT | nullable |
| `billing_status` | TEXT | NOT NULL, default `'demo'` — estado operativo del billing: `demo\|active\|past_due\|suspended\|archived` |
| `trial_ends_at` | TIMESTAMPTZ | nullable — fecha de vencimiento del trial (solo para status demo) |
| `billing_cycle_anchor` | INTEGER | nullable — día del mes de renovación (1-31) |
| `current_period_start` | TIMESTAMPTZ | nullable — inicio del período de facturación actual |
| `current_period_end` | TIMESTAMPTZ | nullable — fin del período de facturación actual |
| `mp_subscription_id` | TEXT | nullable, UNIQUE — ID de suscripción activa en Mercado Pago |
| `mp_customer_id` | TEXT | nullable — ID del cliente en Mercado Pago |
| `ai_tokens_used` | INTEGER | NOT NULL, default 0 — tokens de IA consumidos en el período actual |
| `cancelled_at` | TIMESTAMPTZ | nullable — fecha de cancelación voluntaria (acceso continúa hasta current_period_end) |
| `last_billing_failure_at` | TIMESTAMPTZ | nullable — fecha del último fallo de pago (usado por cron para calcular archivado) |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `slug`, `custom_domain`, `status`, `billing_status`, `mp_subscription_id`

**Nota:** `stores.status` y `stores.billing_status` son el mismo valor semántico. `billing_status` es la columna canónica para todas las operaciones de billing. `status` se mantiene como alias para compatibilidad con el executor y las reglas de RLS. Ambos se actualizan simultáneamente en toda transición de estado.

---

#### `store_users`
Propietario: core / multiuser

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL, FK → `stores.id` |
| `user_id` | UUID | NOT NULL, FK → `users.id` |
| `role` | TEXT | NOT NULL — `owner\|admin\|collaborator` |
| `invited_by` | UUID | nullable, FK → `users.id` |
| `invited_at` | TIMESTAMPTZ | nullable |
| `accepted_at` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id, user_id)` UNIQUE, `store_id`, `user_id`

---

#### `billing_payments`
Propietario: billing
Historial de todos los cobros procesados por Mercado Pago para KitDigital. Es un registro inmutable: no se actualiza, solo se inserta.

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL, FK → `stores.id` |
| `plan_id` | UUID | NOT NULL, FK → `plans.id` |
| `mp_payment_id` | TEXT | NOT NULL, UNIQUE — ID del pago en Mercado Pago |
| `mp_subscription_id` | TEXT | NOT NULL — ID de la suscripción a la que pertenece |
| `amount` | INTEGER | NOT NULL — monto cobrado en centavos |
| `status` | TEXT | NOT NULL — `approved\|rejected\|pending\|refunded` |
| `period_start` | TIMESTAMPTZ | NOT NULL — inicio del período cubierto por este pago |
| `period_end` | TIMESTAMPTZ | NOT NULL — fin del período cubierto |
| `created_at` | TIMESTAMPTZ | NOT NULL |

**Sin `updated_at` — registro inmutable.**
Índices: `store_id`, `(store_id, status)`, `mp_payment_id`, `mp_subscription_id`

---

#### `billing_webhook_log`
Propietario: billing
Control de idempotencia para webhooks de Mercado Pago. Garantiza que cada notificación se procese exactamente una vez.

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `mp_event_id` | TEXT | NOT NULL, UNIQUE — ID único del evento en Mercado Pago |
| `topic` | TEXT | NOT NULL — tipo de notificación: `payment\|subscription_preapproval` |
| `store_id` | UUID | nullable, FK → `stores.id` — null si no se pudo resolver la tienda |
| `status` | TEXT | NOT NULL, default `'pending'` — `pending\|processed\|failed` |
| `raw_payload` | JSONB | NOT NULL — payload completo del webhook para auditoría |
| `error` | TEXT | nullable — detalle del error si status = failed |
| `processed_at` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL |

**Sin `updated_at` — el estado solo avanza (pending → processed/failed).**
Índices: `mp_event_id` UNIQUE, `status`, `store_id`, `created_at`

---

### CATÁLOGO

---

#### `products`
Propietario: products

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL, FK → `stores.id` |
| `name` | TEXT | NOT NULL, max 200 |
| `description` | TEXT | nullable, max 2000 |
| `price` | INTEGER | NOT NULL, >= 0 (centavos) |
| `image_url` | TEXT | nullable |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `is_featured` | BOOLEAN | NOT NULL, default false |
| `sort_order` | INTEGER | NOT NULL, default 0 |
| `metadata` | JSONB | NOT NULL, default `{}` — extensiones de módulos (page, etc.) |
| `deleted_at` | TIMESTAMPTZ | nullable — soft delete |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, is_active)`, `(store_id, is_featured)`, `(store_id, deleted_at)`

---

#### `categories`
Propietario: categories

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL, FK → `stores.id` |
| `name` | TEXT | NOT NULL, max 100 |
| `description` | TEXT | nullable |
| `image_url` | TEXT | nullable |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `sort_order` | INTEGER | NOT NULL, default 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, is_active)`

---

#### `product_categories`
Propietario: categories (relación)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `product_id` | UUID | NOT NULL, FK → `products.id` |
| `category_id` | UUID | NOT NULL, FK → `categories.id` |
| `store_id` | UUID | NOT NULL |

PK compuesta: `(product_id, category_id)`
Índices: `(store_id, category_id)`, `(store_id, product_id)`

---

#### `banners`
Propietario: banners

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL, FK → `stores.id` |
| `image_url` | TEXT | NOT NULL |
| `title` | TEXT | nullable |
| `subtitle` | TEXT | nullable |
| `link_url` | TEXT | nullable |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `sort_order` | INTEGER | NOT NULL, default 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, is_active)`

---

### MÓDULOS DE PRODUCTO

---

#### `variants`
Propietario: variants

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `product_id` | UUID | NOT NULL, FK → `products.id` |
| `price` | INTEGER | nullable — si null, usa precio del product |
| `sku` | TEXT | nullable |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `sort_order` | INTEGER | NOT NULL, default 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id, product_id)`

---

#### `variant_attributes`
Propietario: variants

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `product_id` | UUID | NOT NULL, FK → `products.id` |
| `name` | TEXT | NOT NULL — "Talle", "Color" |
| `created_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id, product_id)`

---

#### `variant_values`
Propietario: variants

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `variant_id` | UUID | NOT NULL, FK → `variants.id` |
| `attribute_id` | UUID | NOT NULL, FK → `variant_attributes.id` |
| `value` | TEXT | NOT NULL — "M", "Rojo" |
| `created_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id, variant_id)`

---

#### `stock_items`
Propietario: stock

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `product_id` | UUID | NOT NULL, FK → `products.id` |
| `variant_id` | UUID | nullable, FK → `variants.id` |
| `quantity` | INTEGER | NOT NULL, >= 0 |
| `low_stock_threshold` | INTEGER | NOT NULL, default 0 |
| `track_stock` | BOOLEAN | NOT NULL, default true |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

UNIQUE: `(store_id, product_id, variant_id)`
Índices: `(store_id)`, `(store_id, product_id)`

---

#### `wholesale_prices`
Propietario: wholesale

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `product_id` | UUID | NOT NULL, FK → `products.id` |
| `variant_id` | UUID | nullable, FK → `variants.id` |
| `price` | INTEGER | NOT NULL, >= 0 |
| `min_quantity` | INTEGER | NOT NULL, default 1 |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

UNIQUE: `(store_id, product_id, variant_id)`
Índices: `(store_id)`

---

#### `shipping_methods`
Propietario: shipping

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `name` | TEXT | NOT NULL |
| `description` | TEXT | nullable |
| `price` | INTEGER | NOT NULL, default 0 |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `sort_order` | INTEGER | NOT NULL, default 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, is_active)`

---

### CLIENTES Y PEDIDOS

---

#### `customers`
Propietario: orders (se crea implícitamente al crear un pedido)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `name` | TEXT | nullable |
| `phone` | TEXT | nullable |
| `email` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, phone)`

---

#### `orders`
Propietario: orders

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `customer_id` | UUID | nullable, FK → `customers.id` |
| `status` | TEXT | NOT NULL — `pending\|confirmed\|preparing\|delivered\|cancelled` |
| `total` | INTEGER | NOT NULL, >= 0 |
| `notes` | TEXT | nullable |
| `metadata` | JSONB | NOT NULL, default `{}` — shipping_method_id, etc. |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, status)`, `(store_id, created_at)`, `(store_id, customer_id)`

---

#### `order_items`
Propietario: orders

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `order_id` | UUID | NOT NULL, FK → `orders.id` |
| `product_id` | UUID | NOT NULL, FK → `products.id` |
| `variant_id` | UUID | nullable, FK → `variants.id` |
| `quantity` | INTEGER | NOT NULL, > 0 |
| `unit_price` | INTEGER | NOT NULL — snapshot |
| `product_name` | TEXT | NOT NULL — snapshot |
| `created_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id, order_id)`, `(store_id, product_id)`

---

### PAGOS

---

#### `payments`
Propietario: payments

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `order_id` | UUID | NOT NULL, FK → `orders.id` |
| `amount` | INTEGER | NOT NULL, > 0 |
| `status` | TEXT | NOT NULL — `pending\|approved\|rejected\|refunded` |
| `method` | TEXT | NOT NULL — `cash\|transfer\|card\|mp\|other` |
| `mp_payment_id` | TEXT | nullable |
| `notes` | TEXT | nullable |
| `paid_at` | TIMESTAMPTZ | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, order_id)`, `(store_id, status)`, `(store_id, created_at)`

---

### FINANZAS

---

#### `finance_entries`
Propietario: finance

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `type` | TEXT | NOT NULL — `income\|expense` |
| `amount` | INTEGER | NOT NULL, > 0 |
| `category` | TEXT | NOT NULL |
| `description` | TEXT | nullable |
| `order_id` | UUID | nullable, FK → `orders.id` |
| `payment_id` | UUID | nullable, FK → `payments.id` |
| `date` | DATE | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, type)`, `(store_id, date)`

---

#### `expenses`
Propietario: expenses

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `amount` | INTEGER | NOT NULL, > 0 |
| `category` | TEXT | NOT NULL |
| `description` | TEXT | NOT NULL |
| `supplier` | TEXT | nullable |
| `date` | DATE | NOT NULL |
| `is_recurring` | BOOLEAN | NOT NULL, default false |
| `recurrence_period` | TEXT | nullable — `monthly\|weekly\|annual` |
| `receipt_url` | TEXT | nullable |
| `finance_entry_id` | UUID | nullable, FK → `finance_entries.id` |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, category)`, `(store_id, date)`

---

#### `savings_accounts`
Propietario: savings_account

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `name` | TEXT | NOT NULL |
| `balance` | INTEGER | NOT NULL, default 0 |
| `goal_amount` | INTEGER | nullable |
| `is_active` | BOOLEAN | NOT NULL, default true |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`

---

#### `savings_movements`
Propietario: savings_account

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `savings_account_id` | UUID | NOT NULL, FK → `savings_accounts.id` |
| `type` | TEXT | NOT NULL — `deposit\|withdrawal` |
| `amount` | INTEGER | NOT NULL, > 0 |
| `description` | TEXT | nullable |
| `finance_entry_id` | UUID | nullable, FK → `finance_entries.id` |
| `created_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id, savings_account_id)`

---

### TAREAS

---

#### `tasks`
Propietario: tasks

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `title` | TEXT | NOT NULL, max 200 |
| `description` | TEXT | nullable |
| `status` | TEXT | NOT NULL — `pending\|in_progress\|done\|cancelled` |
| `due_date` | DATE | nullable |
| `assigned_to` | UUID | nullable, FK → `users.id` |
| `order_id` | UUID | nullable, FK → `orders.id` |
| `created_by` | UUID | NOT NULL, FK → `users.id` |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `updated_at` | TIMESTAMPTZ | NOT NULL |

Índices: `(store_id)`, `(store_id, status)`, `(store_id, assigned_to)`

---

### IA

---

#### `assistant_sessions`
Propietario: assistant

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | NOT NULL |
| `user_id` | UUID | NOT NULL, FK → `users.id` |
| `last_activity_at` | TIMESTAMPTZ | NOT NULL, default NOW() |
| `created_at` | TIMESTAMPTZ | NOT NULL |
| `expires_at` | TIMESTAMPTZ | NOT NULL — TTL 24h desde last_activity_at |

Índices: `(store_id, user_id)`, `expires_at` (para limpieza por cron)

---

#### `assistant_messages`
Propietario: assistant
Historial de mensajes de cada sesión del asistente. Persiste el turno completo (usuario + respuesta de la IA).

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `session_id` | UUID | NOT NULL, FK → `assistant_sessions.id` |
| `store_id` | UUID | NOT NULL — denormalizado para RLS y queries eficientes |
| `role` | TEXT | NOT NULL — `user\|assistant` |
| `content` | TEXT | NOT NULL — contenido del mensaje (JSON serializado para mensajes del asistente) |
| `created_at` | TIMESTAMPTZ | NOT NULL |

**Sin `updated_at` — los mensajes son inmutables.**
Índices: `(session_id, created_at)`, `(store_id, session_id)`

---

### SISTEMA DE EVENTOS

---

#### `events`
Propietario: core (todos los módulos emiten aquí)

| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | UUID | PK |
| `store_id` | UUID | nullable — null para eventos de sistema global |
| `type` | TEXT | NOT NULL — nombre canónico del evento |
| `actor_type` | TEXT | NOT NULL — `user\|superadmin\|system\|ai` |
| `actor_id` | UUID | nullable |
| `data` | JSONB | NOT NULL — payload del evento |
| `created_at` | TIMESTAMPTZ | NOT NULL |

**No tiene `updated_at` — es inmutable.**
Índices: `(store_id)`, `(store_id, type)`, `(store_id, created_at)`, `(type, created_at)`

---

## Resumen de Tablas por Módulo

| Tabla | Módulo propietario |
|-------|-------------------|
| `users` | core |
| `plans` | billing/core |
| `stores` | catalog/core |
| `store_users` | core/multiuser |
| `billing_payments` | billing — historial de cobros de MP |
| `billing_webhook_log` | billing — idempotencia de webhooks |
| `products` | products |
| `categories` | categories |
| `product_categories` | categories |
| `banners` | banners |
| `variants` | variants |
| `variant_attributes` | variants |
| `variant_values` | variants |
| `stock_items` | stock |
| `wholesale_prices` | wholesale |
| `shipping_methods` | shipping |
| `customers` | orders |
| `orders` | orders |
| `order_items` | orders |
| `payments` | payments |
| `finance_entries` | finance |
| `expenses` | expenses |
| `savings_accounts` | savings_account |
| `savings_movements` | savings_account |
| `tasks` | tasks |
| `assistant_sessions` | assistant |
| `assistant_messages` | assistant |
| `events` | core (todos emiten aquí) |

**Total: 28 tablas**

---

## Campos JSONB por Tabla

| Tabla | Campo JSONB | Contenido |
|-------|-------------|-----------|
| `stores` | `modules` | `{ catalog: true, orders: false, ... }` — módulos activos de la tienda |
| `stores` | `config` | apariencia, colores, social_links, whatsapp_message template |
| `stores` | `limits` | `{ max_products, max_orders, ai_tokens }` — copiado del plan al activar |
| `products` | `metadata` | extensiones: `{ page: {...} }` (product_page module) |
| `orders` | `metadata` | `{ shipping_method_id, shipping_cost }` |
| `plans` | `available_modules` | lista de nombres de módulos incluidos en el plan base |
| `plans` | `module_prices` | `{ stock: 150000, payments: 200000, ... }` — precios add-on en centavos/mes |
| `events` | `data` | payload específico por tipo de evento |
| `billing_webhook_log` | `raw_payload` | payload completo del webhook recibido de MP |

**Nota:** el JSONB `stores.billing` fue eliminado. Los campos de billing son ahora columnas explícitas en `stores` (ver tabla de la sección TIENDA).

---

## Notas de Implementación SQL

- Todos los `id` son `UUID DEFAULT gen_random_uuid()`
- Todos los `created_at` y `updated_at` son `TIMESTAMPTZ DEFAULT NOW()`
- Se necesita un trigger `updated_at` en todas las tablas con ese campo
- RLS habilitado en todas las tablas de dominio
- Política base de RLS: `store_id = auth.jwt()->>'store_id'` para operaciones de usuario
- Los superadmins bypasean RLS via service role key
- La tabla `events` tiene política RLS de solo inserción para usuarios normales (no pueden leer todos los eventos, solo los propios)
