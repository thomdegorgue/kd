# Auditoría Técnica Completa — KitDigital.ar

> **Fecha:** 25 de abril de 2026  
> **Auditor:** Cursor AI Agent  
> **Alcance:** Repositorio completo — schema.sql, server actions, executor/handlers, middleware, API routes, componentes, hooks, tipos, utilidades, billing, seguridad, UX/UI.

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Base de Datos — schema.sql](#2-base-de-datos--schemasql)
3. [Server Actions y Validaciones](#3-server-actions-y-validaciones)
4. [Executor y Handlers](#4-executor-y-handlers)
5. [Middleware, Auth y Seguridad](#5-middleware-auth-y-seguridad)
6. [API Routes y Webhooks](#6-api-routes-y-webhooks)
7. [Billing y Pagos (Mercado Pago)](#7-billing-y-pagos-mercado-pago)
8. [Componentes Admin](#8-componentes-admin)
9. [Catálogo Público y UX](#9-catálogo-público-y-ux)
10. [Superadmin](#10-superadmin)
11. [Hooks y TanStack Query](#11-hooks-y-tanstack-query)
12. [Tipos TypeScript](#12-tipos-typescript)
13. [DB Queries](#13-db-queries)
14. [Utilidades y Helpers](#14-utilidades-y-helpers)
15. [Dependencias (package.json)](#15-dependencias-packagejson)
16. [Configuración Next.js](#16-configuración-nextjs)
17. [Performance General](#17-performance-general)
18. [Priorización de Mejoras](#18-priorización-de-mejoras)

---

## 1. Resumen Ejecutivo

> Se completará al finalizar todas las secciones.

---

## Leyenda de Severidad

| Símbolo | Severidad | Descripción |
|---------|-----------|-------------|
| 🔴 | **Crítico** | Bug o vulnerabilidad de seguridad que afecta funcionalidad o datos |
| 🟠 | **Alto** | Problema significativo que puede causar errores o mala UX |
| 🟡 | **Medio** | Inconsistencia o deuda técnica importante |
| 🟢 | **Bajo / Mejora** | Optimización o mejora de calidad de código |

---

## 1. Resumen Ejecutivo

> Se completará al finalizar todas las secciones.

---

## 2. Base de Datos — schema.sql

### 2.1 Inventario de tablas (30 tablas)

| Tabla | Propósito |
|-------|-----------|
| `users` | Perfil de usuario (vinculado a `auth.users`), email, rol (`user`/`superadmin`), ban |
| `plans` | Planes de precio (centavos, módulos base JSON, trial, tokens IA, flags) |
| `stores` | Inquilino principal: slug, `status`/`billing_status`, `plan_id`, módulos/límites JSON, dominio, MP, tokens IA |
| `store_users` | Membresía usuario↔tienda, rol, invitación |
| `store_invitations` | Invitaciones por email, token UUID, expiración |
| `billing_payments` | Registro de pagos de suscripción (MP, importes, periodo) |
| `billing_webhook_log` | Log idempotente de webhooks de billing |
| `products` | Productos con precios en enteros (centavos), stock, soft delete |
| `categories` | Categorías por tienda |
| `product_categories` | N:M producto–categoría con `store_id` denormalizado |
| `banners` | Banners del catálogo público |
| `variants` | Variantes de producto |
| `variant_attributes` | Nombres de atributos (ej: Talle) |
| `variant_values` | Valor por variante+atributo |
| `stock_items` | Stock por producto/variante |
| `wholesale_prices` | Precios mayoristas por cantidad mínima |
| `shipping_methods` | Métodos de envío |
| `customers` | Clientes |
| `orders` | Pedidos con total, source, metadata |
| `order_items` | Líneas de pedido (snapshot de nombre y precio) |
| `shipments` | Envíos con tracking único y estado |
| `payments` | Pagos vinculados a pedido |
| `finance_entries` | Ingresos/gastos (finanzas generales) |
| `expenses` | Gastos con posible enlace a `finance_entries` |
| `savings_accounts` | Cuentas de ahorro internas |
| `savings_movements` | Movimientos en cuentas de ahorro |
| `tasks` | Tareas internas con asignación y enlace a pedido |
| `assistant_sessions` | Sesiones del asistente IA |
| `assistant_messages` | Mensajes de la sesión IA |
| `events` | Eventos/auditoría multiplataforma |

---

### 2.2 Índices — Problemas y Huecos

🟠 **FKs sin índice en columna hija** (PostgreSQL NO crea índice automático):
- `finance_entries.order_id` y `finance_entries.payment_id` — sin índice; afecta reportes financieros
- `expenses.finance_entry_id` — sin índice
- `savings_movements.finance_entry_id` — sin índice
- `tasks.order_id` — sin índice propio (solo existe para `assigned_to`)

🟡 **Índices faltantes en columnas de filtro frecuente:**
- `store_invitations.expires_at` — tareas de limpieza de invitaciones vencidas sin índice

🟢 **Redundancia de índices en `events`:**
- `idx_events_store_type` + `idx_events_store_created` + `idx_events_store_type_created` (línea 1094) — solapamiento potencial. Evaluar con `EXPLAIN ANALYZE`

🟢 **Redundancia en `billing_payments`:**
- `idx_billing_payments_store` puede quedar redundante con `idx_billing_payments_store_status`

---

### 2.3 RLS (Row Level Security)

✅ **Todas las tablas de negocio tienen RLS habilitado** (líneas 685–714).

🔴 **`assistant_sessions` — sin política `UPDATE`:**
- `last_activity_at` necesita actualizarse pero las políticas (líneas 989–996) no permiten `UPDATE`. Cualquier intento del cliente de actualizar la sesión **fallará silenciosamente o con error 403**. Bug funcional confirmado.

🟠 **`variant_attributes` y `variant_values` — sin política `UPDATE`:**
- Hay `SELECT`, `INSERT`, `DELETE` pero **no `UPDATE`**. Correcciones de nombres/valores desde el cliente quedan bloqueadas.

🟠 **`store_users` — sin `UPDATE`/`DELETE` en políticas:**
- Aceptar invitación, cambiar rol o eliminar miembro desde el cliente **falla** sin service role.

🟡 **`events` — sin política `SELECT`:**
- Solo hay `INSERT`. Ningún cliente puede leer eventos propios. Si hay algún dashboard que intenta mostrar historial de eventos vía anon/auth key, devuelve 0 filas. Debe ser intencional (solo service role), pero debería documentarse.

🟡 **`plans` — sin `INSERT/UPDATE/DELETE` para `authenticated`:**
- Correcto si solo superadmin lo gestiona vía servicio. A documentar.

🟡 **`billing_payments` / `billing_webhook_log` — sin políticas para `authenticated`:**
- Correcto (solo backend con service role), pero a documentar.

🟡 **`users` — sin política `SELECT` para superadmin:**
- El panel superadmin probablemente usa service role o funciones `SECURITY DEFINER`. A documentar explícitamente.

---

### 2.4 Tipos de Datos

✅ **Dinero:** Uso correcto de `INTEGER` (centavos) en lugar de `FLOAT`/`REAL`. Evita errores de redondeo. Bien diseñado.

✅ **Fechas:** Uso consistente de `TIMESTAMPTZ` para timestamps. No hay `timestamp without time zone`.

🟡 **`compare_price` en `products`:** nullable `INTEGER` sin `CHECK (compare_price > price)`. Puede almacenarse un precio de comparación menor que el precio real sin validación en BD.

🟡 **Predominio de `TEXT` sin límite:** No hay `VARCHAR(n)` en el schema. La validación de longitud queda enteramente en la capa de aplicación. Si falla la validación app, entran datos sin límite.

---

### 2.5 Constraints

🟠 **`events.type` sin CHECK:** El campo `type` es `TEXT` libre sin validación de valores permitidos. Typos o valores incorrectos pueden entrar a la tabla de auditoría sin restricción.

🟠 **`stock_items` — UNIQUE parcial problemático con `variant_id IS NULL`:**
- El UNIQUE en `(store_id, product_id, variant_id)` permite duplicados cuando `variant_id IS NULL` (NULL ≠ NULL en SQL). Pueden existir múltiples filas de stock para el mismo producto sin variante.
- Mismo problema en `wholesale_prices (store_id, product_id, variant_id, min_quantity)`.

🟡 **`expenses` — CHECK compuesto faltante:**
- Si `is_recurring = true`, `recurrence_period` debería ser `NOT NULL`. No hay CHECK compuesto que lo garantice.

🟡 **`customers` — sin UNIQUE en `(store_id, phone)` o `(store_id, email)`:**
- Duplicados de clientes posibles sin restricción en BD.

🟡 **`payments.mp_payment_id` — sin UNIQUE:**
- Un mismo pago de MP podría procesarse dos veces si llega doble webhook. Sin constraint, ambas filas entrarían. La idempotencia depende 100% de la app.

🟡 **`order_items` — sin UNIQUE en `(order_id, product_id, variant_id)`:**
- Se pueden crear líneas duplicadas para el mismo producto en un pedido.

---

### 2.6 Multi-tenancy

✅ Todas las tablas de negocio tienen `store_id`.

🟠 **FKs de `store_id` incompletas en algunas tablas:**
- `order_items.store_id`, `assistant_messages.store_id`, `savings_movements.store_id` — en el `CREATE TABLE` no tienen `REFERENCES stores(id)`. El bloque final `DO $$` (líneas 1058–1081) agrega FKs para variantes/stock/mayoreo pero **NO** para estas tres. Riesgo de inconsistencia multi-tenant por bug de aplicación.

🟡 **`product_categories.store_id` sin CHECK de coherencia:**
- No hay constraint que garantice que el `store_id` de `product_categories` coincida con el `store_id` del producto y la categoría referenciados. Un bug de app podría cruzar datos entre tiendas.

---

### 2.7 Soft Deletes

🟡 **Inconsistencia en estrategia de eliminación:**
- `products`: tiene `deleted_at` (soft delete) + `is_active`
- `categories`, `banners`: solo `is_active`, sin soft delete
- `stores`: usa campo `status = 'archived'` como borrado lógico
- Sin estandarización documentada de cuándo usar cada patrón

---

### 2.8 Desalineación TypeScript ↔ Schema SQL

🟠 **`database.ts` desactualizado respecto al schema:**
- `orders.source` — presente en SQL, **ausente** en tipo TS
- `products.stock` — presente en SQL, **ausente** en tipo TS
- `stores.billing_period`, `stores.annual_paid_until`, `stores.ai_tokens_reset_at` — en SQL, faltantes o con nombre distinto en TS
- `stores.custom_domain_txt_token` (SQL) vs `custom_domain_verification_token` (TS) — **nombre diferente**
- `plans` — varios campos de SQL no reflejados en tipos

**Acción requerida:** Re-generar tipos con `supabase gen types typescript` y revisar toda la app en busca de usos de estas columnas.

---

### 2.9 Bugs Confirmados en Schema

🔴 **RLS `assistant_sessions` sin UPDATE** — `last_activity_at` no puede actualizarse desde cliente. Las sesiones no se marcan como activas correctamente.

🟠 **`sync_store_status` trigger (líneas 122–135):** Solo en `BEFORE UPDATE`. Un INSERT con `status` y `billing_status` distintos no se sincronizaría. Los defaults iguales (`demo`/`demo`) mitigan el riesgo pero no lo eliminan.

🟠 **Columnas UNIQUE con NULL:** `stock_items` y `wholesale_prices` permiten duplicados lógicos cuando `variant_id IS NULL`.

---

### 2.10 Mejoras Sugeridas — Base de Datos

| Prioridad | Mejora |
|-----------|--------|
| 🔴 | Agregar política `UPDATE` para `assistant_sessions` (al menos `last_activity_at`) |
| 🟠 | Agregar políticas `UPDATE` para `variant_attributes` y `variant_values` |
| 🟠 | Agregar políticas `UPDATE`/`DELETE` para `store_users` |
| 🟠 | Agregar FK `order_items.store_id → stores(id)`, `assistant_messages.store_id → stores(id)`, `savings_movements.store_id → stores(id)` |
| 🟠 | Re-generar `database.ts` desde Supabase CLI y corregir desalineaciones |
| 🟠 | Índice UNIQUE parcial en `stock_items WHERE variant_id IS NULL` |
| 🟡 | Agregar `CHECK` en `events.type` con valores permitidos |
| 🟡 | Agregar `CHECK (compare_price > price OR compare_price IS NULL)` en `products` |
| 🟡 | Índices en `finance_entries(order_id)`, `finance_entries(payment_id)`, `store_invitations(expires_at)` |
| 🟡 | UNIQUE parcial en `payments(mp_payment_id) WHERE mp_payment_id IS NOT NULL` |
| 🟡 | Documentar estrategia de soft deletes (cuándo `deleted_at` vs `is_active` vs `status`) |

---

## 3. Server Actions y Validaciones

### 3.1 Consistencia de `ActionResult`

🟠 **Formato inconsistente de retorno entre módulos:**
- `billing.ts` devuelve `{ success: false, error: string }` (objeto plano)
- `superadmin.ts` devuelve la misma union sin estructura de `{ code, message }`
- `auth.ts` mezcla `ActionResult` con `redirect()` sin retorno explícito
- El resto usa `ActionResult<T>` del executor
- Las funciones `getDailySalesSummary` y `getSalesHistory` en `sales.ts` hacen `throw new Error` o retornan datos crudos **sin envolver en `ActionResult`** — el cliente no puede distinguir error de success correctamente

🟡 **Funciones que no respetan el contrato `ActionResult`:**
- `getActivePlan` en `billing.ts`
- `getOnboardingStatus` en `onboarding.ts`
- `signOut` y redirects en `auth.ts`

---

### 3.2 Bug Crítico: `changeTier` en `billing.ts`

🔴 **Bug en validación de downgrade de plan (`changeTier`):**

```typescript
// El problema: con Supabase select + count: 'exact' + head: true
// el conteo real está en `count`, no en `data`
// activeProductCount puede quedarse en 0 → saltea la validación de downgrade
```

En la función `changeTier` en `src/lib/actions/billing.ts`, el bloque que valida si la tienda puede hacer downgrade usa `{ count: 'exact', head: true }` pero lee el conteo desde `data` en lugar de `count`. Resultado: **un usuario puede hacer downgrade aunque tenga más productos activos que el nuevo plan permite**, potencialmente superando los límites del plan nuevo.

---

### 3.3 Seguridad en Actions

🟠 **`superadmin.ts` — `updateStoreStatus` sin whitelist de `status`:**
- Recibe `status` como string libre sin validación de valores permitidos
- Un superadmin podría escribir cualquier string en la columna `status`

🟠 **`auth.ts` — enumeración de cuentas en signup:**
- El mensaje "Ya existe una cuenta con ese email" en líneas 165–167 permite a atacantes confirmar qué emails están registrados

🟡 **`onboarding.ts` — `getOnboardingStoreId` ambigua:**
- Obtiene la primera tienda "aceptada" del usuario; si un usuario tuviera múltiples tiendas, el comportamiento podría ser incorrecto

🟡 **`catalog-public.ts` — `storeId` viene del cliente:**
- `loadMoreProducts(storeId)` confía en el UUID enviado por el cliente. Es aceptable para catálogo público (solo lectura, datos no sensibles), pero debe documentarse.

---

### 3.4 Validaciones Zod

🟠 **`list_stock` — validación ignorada en handler:**
- El handler acepta `low_stock_only` / `low_stock_threshold` pero su `validate` devuelve `() => true`
- Valores anómalos pueden llegar sin restricción

🟠 **`createOrder` — total no recalculado en backend:**
- El `total` del pedido es input del cliente; el handler no lo recalcula desde los ítems
- Posible discrepancia entre el total almacenado y la suma real de ítems

🟡 **Schemas de precios — posible problema de coerción:**
- Schemas de productos usan `z.number().int()` (centavos)
- Si el front envía strings, falla hasta que use `z.coerce.number()`
- `onboarding` usa `z.coerce.number()` para el primer producto — **inconsistencia**

🟡 **`assistant.ts` — schema muy permisivo:**
- `action_input: z.record(z.string(), z.unknown())` acepta entradas arbitrarias

---

### 3.5 Executor y Handlers

🟠 **`execute_assistant_action` — doble anidación de `ActionResult`:**
- El handler retorna el `ActionResult` del executor interno
- El executor externo lo envuelve en `{ success: true, data: result }`
- El cliente puede recibir **éxito que contiene un fallo interno** — error silencioso

🟡 **`get_store` handler — `select('*')`:**
- En `handlers/catalog.ts`, `get_store` trae todas las columnas incluyendo datos internos de billing, `mp_subscription_id`, tokens de MP, etc.
- El admin no necesita ver esos campos desde el cliente

🟡 **`list_banners` — accesible sin módulo `banners` habilitado:**
- `list_banners` tiene `requires: []` mientras `create_banner` requiere módulo `banners`
- Se puede listar banners aunque el módulo esté desactivado (interfaz confusa)

🟡 **Handlers no referenciados desde la app:**
- `get_store_public`, `list_products_public`, `list_categories_public` — registrados en el executor pero el catálogo usa queries directas desde `lib/db/queries/`
- `update_order` — handler existente sin acción correspondiente en `actions/orders.ts`

🟡 **Posible doble criterio para límite de tokens IA:**
- Límite en `StoreContext.limits.ai_tokens`
- Y también en `plans.ai_tokens_monthly` dentro del handler
- Dos fuentes de verdad para el mismo límite

---

### 3.6 Mejoras Sugeridas — Actions

| Prioridad | Mejora |
|-----------|--------|
| 🔴 | Corregir bug `changeTier` — leer `count` en lugar de `data` para validación de downgrade |
| 🟠 | Unificar formato de retorno `ActionResult` en `billing.ts`, `superadmin.ts`, `auth.ts` |
| 🟠 | Agregar whitelist de valores permitidos en `superadmin.ts` → `updateStoreStatus` |
| 🟠 | Recalcular total del pedido en backend en `createOrder` handler |
| 🟠 | Corregir doble anidación de `ActionResult` en `execute_assistant_action` |
| 🟡 | Unificar `z.coerce.number()` en todos los schemas de precio |
| 🟡 | Agregar validación Zod en handler `list_stock` |
| 🟡 | Deprecar o eliminar handlers no usados (`get_store_public`, etc.) |
| 🟡 | Reducir columnas en `get_store` — solo exponer las necesarias al admin |

---

## 4. Middleware, Auth y Seguridad

### 4.1 Bug Crítico: Cron sin autenticación

🔴 **`/api/cron/clean-assistant-sessions` — ejecutable sin autenticación:**

```typescript
// clean-assistant-sessions/route.ts (líneas 17-24)
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { ... }
// Si CRON_SECRET no está definido en .env → cualquiera puede ejecutar el cron
```

Vs. el comportamiento correcto en `check-billing/route.ts` (líneas 45-47):
```typescript
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) { ... }
// Deniega si falta el secret — lógica inversa y correcta
```

**Un atacante puede hacer DELETE masivo de sesiones del asistente IA sin credenciales.**

---

### 4.2 Bug: Desalineación `status` vs `billing_status`

🔴 **Tiendas archivadas por mora siguen visibles públicamente:**

- El cron `check-billing` al archivar una tienda solo actualiza `billing_status: 'archived'` (líneas 132–135)
- Pero **NO actualiza `stores.status`**
- El catálogo público filtra por `status IN ('demo', 'active', 'past_due')` — si `status` sigue en esos valores, la tienda sigue visible
- El executor del admin también lee `status` para bloquear operaciones (`executor/index.ts` líneas 78-83)
- **Tiendas con mora pueden seguir operando tanto en público como en admin**

---

### 4.3 Redirección Abierta en Callback de Auth

🟠 **`/auth/callback/route.ts` — parámetro `next` sin validar:**

```typescript
const next = requestUrl.searchParams.get('next') ?? '/admin'
// ...
return NextResponse.redirect(`${origin}${next}`) // RIESGO
```

Un valor `next=//evil.com` puede redirigir al usuario a un dominio externo después del login. Solución: validar que `next` empiece por `/` y no por `//`.

---

### 4.4 Webhook de Mercado Pago sin Validación de Timestamp

🟠 **`verify-signature.ts` — no verifica antigüedad del `ts`:**
- La firma incluye un timestamp `ts` pero no se valida que sea reciente (ej: ±5 minutos)
- Permite **replay attacks** con notificaciones antiguas interceptadas mientras el secret no rote

---

### 4.5 Email — Éxito Simulado sin API Key

🟠 **`resend.ts` — sin `RESEND_API_KEY` devuelve `success: true`:**

```typescript
// Si RESEND_API_KEY no está definido:
return { success: true } // SILENCIOSO — el mail nunca salió
```

En producción mal configurada, todos los flujos de email (bienvenida, recuperación de contraseña, invitaciones) **creerán haber enviado el mail** cuando en realidad no se envió nada.

---

### 4.6 API Routes — Análisis de Seguridad

| Ruta | Protección | Problema |
|------|-----------|----------|
| `/api/cron/clean-assistant-sessions` | Bearer opcional | 🔴 Sin secret = acceso libre |
| `/api/cron/check-billing` | Bearer obligatorio | ✅ Correcto |
| `/api/webhooks/mercadopago` | HMAC-SHA256 | 🟡 Sin validación de timestamp |
| `/api/pdf/[template]` | Rate limit 10/60s | 🟡 Sin auth, abuso de cómputo posible |
| `/api/stores/capacity` | Pública | ✅ Solo expone `{ available }` |

---

### 4.7 Next.js — Sin Security Headers

🟡 **`next.config.ts` sin cabeceras de seguridad HTTP:**
- Sin `Content-Security-Policy`
- Sin `X-Frame-Options` (clickjacking)
- Sin `X-Content-Type-Options`
- Sin `Strict-Transport-Security` (HSTS)
- Sin `Referrer-Policy`

Estas cabeceras deberían configurarse en `next.config.ts` en el bloque `headers()`.

---

### 4.8 Supabase — Configuración

✅ **Service role solo en servidor:** `service-role.ts` correctamente marcado "NUNCA exponer en cliente". Comentario explícito.

✅ **Clientes correctamente separados:** `server.ts` (SSR), `client.ts` (browser), `service-role.ts` (backend).

🟡 **Middleware usa service role tras verificar `getUser()`:** La secuencia es correcta actualmente, pero cualquier refactor que omita `getUser()` antes de usar service role sería una vulnerabilidad grave. Agregar un helper que enforque este orden.

---

### 4.9 Billing — Idempotencia

✅ **Webhook idempotente por `mp_event_id`:** Upsert + estado `processed`. Bien implementado.

🟡 **Posible condición de carrera:** Dos entregas simultáneas del mismo `mp_event_id` podrían procesarse ambas si el upsert no tiene constraint UNIQUE en BD. Confirmar que `billing_webhook_log.mp_event_id` tiene UNIQUE constraint (no verificado en schema).

---

### 4.10 Mejoras Sugeridas — Middleware/Auth/Seguridad

| Prioridad | Mejora |
|-----------|--------|
| 🔴 | Corregir `clean-assistant-sessions` — invertir condición de `cronSecret` |
| 🔴 | Al archivar tienda por mora, también actualizar `stores.status = 'archived'` en `check-billing` |
| 🟠 | Validar `next` param en `/auth/callback` — solo paths relativos sin `//` |
| 🟠 | Agregar validación de timestamp en `verify-signature.ts` (window ±5min) |
| 🟠 | Lanzar error o return `{ success: false }` cuando `RESEND_API_KEY` no está configurado en prod |
| 🟡 | Agregar security headers en `next.config.ts` (CSP, HSTS, X-Frame-Options) |
| 🟡 | Crear helper `requireServiceRole()` que enforque `getUser()` previo |
| 🟡 | Verificar UNIQUE constraint en `billing_webhook_log.mp_event_id` |
| 🟡 | Agregar `remotePatterns` adicionales en `next.config.ts` si se usan otros CDNs |

---

## 5. Componentes Admin — UX/UI

### 5.1 Bugs Funcionales Confirmados

🔴 **Búsqueda de pedidos no funciona (`OrdersPage`):**
- El `EntityToolbar` en `src/app/(admin)/admin/orders/page.tsx` tiene un campo `search` que actualiza estado local
- Pero `useOrders` **no recibe ningún filtro de texto** — `OrderFilters` en `actions/orders.ts` no incluye `search`
- **La búsqueda de pedidos en el admin no hace absolutamente nada** a nivel de datos

🟠 **`CategoryCatalogView` no llama `setStoreId`:**
- `src/app/(public)/[slug]/[category]/category-catalog-view.tsx` no sincroniza el `storeId` en el cart-store
- Si un usuario entra directamente a una URL de categoría, el carrito puede mostrar ítems de otra tienda hasta que visite el home

🟠 **`CategoryCatalogView` — badges de stock ausentes:**
- No pasa `stockModuleActive` a `ProductGrid`, a diferencia de `CatalogView`
- Los badges de stock no aparecen en vista por categoría aunque el módulo esté activo

🟠 **`StoreDetailPanel` — fechas incorrectas:**
- En `src/components/superadmin/store-detail-panel.tsx`, las etiquetas "Inicio período" y "Fin período" **usan ambas `store.current_period_end`**
- El campo `current_period_start` no se muestra correctamente

---

### 5.2 UX — Flujos con Problemas

🟠 **Sin confirmación al cancelar pedido:**
- `OrderSheet` en `src/components/admin/order-sheet.tsx` cancela el pedido sin diálogo `AlertDialog`
- Un click accidental cancela el pedido sin posibilidad de revertir

🟠 **Superadmin: ban de usuario sin confirmación:**
- `UsersTable` en `src/components/superadmin/users-table.tsx` ejecuta `banUser` directamente sin confirmación
- Acción destructiva sin guardia

🟠 **Sheets sin guardia de cambios sin guardar:**
- `ProductSheet` (~550 líneas) y `OrderSheet` se cierran con click en overlay o ESC sin verificar `form.formState.isDirty`
- El usuario puede perder trabajo sin advertencia

🟡 **`OrderSheet` — tope de 200 productos en buscador:**
- Al crear un pedido, carga `useProducts({ pageSize: 200 })` en cliente
- Catálogos con más de 200 productos: algunos no aparecen en el buscador
- Debería tener búsqueda server-side o paginación real

---

### 5.3 Superadmin — Límite Operativo

🟠 **Paginación falsa en superadmin:**
- `SuperadminStoresPage` y `SuperadminUsersPage` cargan `pageSize: 200` pero muestran el total global
- Si hay más de 200 registros, **nunca aparecen** en la tabla y la búsqueda no los encuentra
- La query en `lib/db/queries/superadmin.ts` soporta paginación real — no se usa desde la página

🟡 **`mp_subscription_id` visible en claro:**
- `StoreDetailPanel` muestra el ID de suscripción de Mercado Pago sin enmascarar
- Debería mostrarse solo los últimos 6 caracteres o con un botón "copiar"

---

### 5.4 SEO — Catálogo Público

🟡 **Páginas de producto sin Open Graph completo:**
- `src/app/(public)/[slug]/p/[id]/page.tsx` solo tiene `title` y `description`
- Sin `openGraph.images`, sin `twitter:card`, sin URL canónica
- Sharing en redes sociales sin imagen previa

🟡 **Páginas de categoría sin metadatos:**
- `src/app/(public)/[slug]/[category]/page.tsx` solo tiene `title`
- Sin descripción ni OG tags

🟡 **Sitemap sin URLs de productos individuales:**
- Limita la indexación de fichas de producto en Google

---

### 5.5 Accesibilidad

🟡 **`BannerCarousel` — sin `aria-label` en indicadores:**
- Los botones de navegación del carousel no tienen texto accesible para lectores de pantalla

🟡 **`EntityListPagination` — botones sin `aria-label`:**
- "Anterior/Siguiente" sin descripción de contexto

🟡 **`DataTable` — headers ordenables:**
- Son `<button>` sin texto explícito más allá del contenido de columna

---

### 5.6 Performance Frontend

🟡 **`ProductSheet` y `product-detail-view` — componentes grandes:**
- `ProductSheet` ~550 líneas y `product-detail-view` ~440 líneas concentran demasiada lógica
- Candidatos a extraer subcomponentes (tabs, galería, variantes) para mejorar re-renders

🟡 **Sin `Suspense` boundaries en `src/app`:**
- No se encontraron `<Suspense>` con fallback en rutas del app router
- Waterfalls de datos sin UX de carga progresiva

🟡 **Sin `next/dynamic` para componentes pesados:**
- `ProductSheet`, `OrderSheet` y sheets del admin no están diferidos
- Se cargan en bundle inicial aunque el usuario no abra ninguno

🟡 **`form.watch` extensivo en `ProductSheet`:**
- Múltiples `form.watch()` para imagen, switches, etc. provoca re-renders frecuentes en el form
- Considerar `form.watch` específico o subscripción selectiva

---

### 5.7 JSON-LD — Datos Incorrectos

🟡 **`availability` fijo en `InStock` en `product-detail-view`:**
- El JSON-LD de producto schema.org siempre marca `InStock` aunque el módulo de stock esté activo y el producto sin stock

---

### 5.8 Mejoras Sugeridas — Componentes

| Prioridad | Mejora |
|-----------|--------|
| 🔴 | Conectar búsqueda de pedidos al backend (agregar `search` a `OrderFilters` y `useOrders`) |
| 🟠 | `CategoryCatalogView`: llamar `setStoreId` y pasar `stockModuleActive` a `ProductGrid` |
| 🟠 | `OrderSheet`: agregar `AlertDialog` de confirmación antes de cancelar pedido |
| 🟠 | `UsersTable` (superadmin): agregar confirmación antes de ban |
| 🟠 | Agregar "¿Tenés cambios sin guardar?" en `ProductSheet` y `OrderSheet` al cerrar con `isDirty` |
| 🟠 | Superadmin: implementar paginación real y búsqueda server-side en listados de tiendas/usuarios |
| 🟠 | Corregir fechas en `StoreDetailPanel` — usar `current_period_start` correcto |
| 🟡 | `OrderSheet`: búsqueda de productos server-side con paginación real |
| 🟡 | Completar OG tags en páginas de producto y categoría |
| 🟡 | `BannerCarousel`, `EntityListPagination`: agregar `aria-label` a botones |
| 🟡 | Agregar `<Suspense>` con skeletons en rutas del app router |
| 🟡 | Usar `next/dynamic` para sheets y modales pesados del admin |
| 🟡 | Arreglar JSON-LD `availability` para reflejar stock real |

---

## 6. Catálogo Público — UX

*(Integrado en sección 5 — ver apartados 5.1, 5.4 y 5.8)*

---

## 7. Hooks y TanStack Query

### 7.1 Bugs de Query Key

🔴 **`useStock` — filtros fuera de la query key:**

```typescript
// use-stock.ts
queryKey: queryKeys.stock(store_id) // ← solo store_id
queryFn: () => listStock(filters)   // ← usa filtros (low_stock_only, threshold)
```

Dos instancias del hook con filtros distintos comparten la misma caché. **Una vista de stock bajo y otra de stock completo se contaminan mutuamente.**

🔴 **`useAssistantSession` — `sessionId` fuera de la query key:**

```typescript
queryKey: queryKeys.assistantSession(store_id) // ← sin sessionId
queryFn: () => getAssistantSession(sessionId)   // ← usa sessionId
```

Al cambiar de sesión, React Query puede devolver datos de la sesión anterior o no re-fetchar.

---

### 7.2 Inconsistencias de Query Keys

🟡 **Claves fuera de la factory centralizada (`query-keys.ts`):**
- `use-finance.ts` → `['finance-summary', store_id, date_from, date_to]` manual
- `use-expenses.ts` → `['expenses-summary', store_id]` manual
- `use-variants.ts` → `['variant-attributes', ...]` y `['variants', ...]` manual (sin `staleTime`/`gcTime`)
- `use-custom-domain.ts` → `['custom-domain', store_id]` con TTL inline
- `use-sales.ts` → `['sales-summary']` y `['sales-history']` como literales

Resultado: inconsistencia de invalidación, TTLs dispares, dificulta el mantenimiento.

---

### 7.3 Configuración de Caché

🟡 **`use-variants.ts` sin `staleTime`/`gcTime`:**
- Usa defaults de React Query → más re-fetches que el resto del admin

🟡 **`useAssistantSession` con `staleTime: 0`:**
- Siempre stale; puede ser intencional para chat en tiempo real pero aumenta carga

🟡 **`useDashboardStats` con polling cada 60s:**
- `refetchInterval: 60000` + `staleTime: 30s` — doble tráfico; documentar si es intencional

---

### 7.4 Desalineación de Fecha en `useDailySalesSummary`

🟡 **Posible desalineación de "día" entre cliente y servidor:**
- La query key usa `new Date().toISOString().slice(0, 10)` del navegador (UTC)
- El servidor calcula el "día actual" posiblemente en UTC también, no en UTC-3 Argentina
- Un usuario argentino a las 21:00 ya está en un "nuevo día" para el servidor (00:00 UTC) pero el cliente sigue pidiendo el día anterior

---

### 7.5 Actualizaciones Optimistas

🟢 **Ninguna mutación usa actualizaciones optimistas (`onMutate` + `setQueryData`):**
- Todo pasa por `invalidateQueries` → latencia visible en cada mutación
- Para operaciones frecuentes (POS, agregar al carrito, cambiar stock) la UX se beneficiaría de updates optimistas

---

### 7.6 Manejo de Errores en Mutaciones

🟡 **`use-billing.ts` — patrón inconsistente:**
- Trata `success: false` en `onSuccess` del resultado
- El resto de hooks lanza un error en `mutationFn` cuando `!result.success`
- `onError` genérico no recibe el mensaje del servidor en algunos casos

🟡 **`useAssistantTokens` — dependencia incompleta:**
- Devuelve `used: 0` con comentario "Se actualizará…"
- Los tokens usados no se reflejan en tiempo real

---

### 7.7 Mejoras Sugeridas — Hooks

| Prioridad | Mejora |
|-----------|--------|
| 🔴 | Agregar `filters` a la query key de `useStock` |
| 🔴 | Agregar `sessionId` a la query key de `useAssistantSession` |
| 🟠 | Migrar todas las claves manuales a la factory de `query-keys.ts` |
| 🟠 | Unificar patrón de error handling en mutaciones de billing |
| 🟡 | Agregar `staleTime`/`gcTime` en `use-variants.ts` |
| 🟡 | Arreglar cálculo de "día actual" con TZ Argentina en `useDailySalesSummary` |
| 🟡 | Considerar updates optimistas para operaciones frecuentes (stock, ítems de pedido) |

---

## 8. Tipos TypeScript

### 8.1 `any` y Tipos Permisivos

🟠 **`supabaseServiceRole as any` en TODAS las queries de DB:**
- `src/lib/db/queries/products.ts`, `stores.ts`, `categories.ts`, etc. todos hacen `const db = supabaseServiceRole as any`
- El compilador no puede verificar columnas, tipos de retorno ni joins
- Cualquier refactor silencioso en el schema pasa desapercibido en TypeScript

🟡 **Tipos permisivos en dominio:**
- `StorePublic.status: string` → debería ser `StoreStatus` union type
- `BillingInfo.billing_status: string` → debería ser unión tipada
- `BillingInfo.limits`/`modules` como `Record<...>` más laxo que en `Store`

🟡 **`modal-store.ts` — `modalData: unknown`:**
- Aceptable para modales genéricos, pero dificulta el tipado en sites de uso

---

### 8.2 Tipos Duplicados

🟡 **`ModuleName` vs `ModuleKey`:**
- `types/index.ts` define `ModuleName`
- `design-store.ts` define `ModuleKey` con conjunto similar pero no idéntico
- Dos fuentes de verdad para "módulos" en la UI

🟡 **`StoreConfig` duplicada:**
- Versión en `types/index.ts` y versión local en `whatsapp.ts`
- Pueden divergir silenciosamente

---

### 8.3 Desalineación DB Types

*(Ver también sección 2.8 — Desalineación TypeScript ↔ Schema SQL)*

🟠 **`database.ts` no tiene `orders.source`:**
- Código que usa `source` en acciones no tiene respaldo de tipos

🟠 **`stores.billing_period`, `stores.annual_paid_until` ausentes en `Database`:**
- `getBillingInfo` los selecciona en strings de query pero sin soporte de tipos TS

---

### 8.4 Mejoras Sugeridas — Tipos

| Prioridad | Mejora |
|-----------|--------|
| 🟠 | Eliminar `as any` en queries DB — usar tipos generados correctamente |
| 🟠 | Re-generar `database.ts` con Supabase CLI (`supabase gen types typescript`) |
| 🟡 | Cambiar `StorePublic.status: string` a `StoreStatus` union |
| 🟡 | Unificar `ModuleName` y `ModuleKey` en una sola fuente de verdad |
| 🟡 | Unificar `StoreConfig` en `types/index.ts` y eliminar versión local en `whatsapp.ts` |

---

## 9. DB Queries

### 9.1 `select *` Innecesarios

🟡 **Queries con `select('*')` que exponen columnas internas:**
- `listProductsPublic` y `getProductPublic` — expone columnas internas de producto al catálogo
- `listCategoriesPublic` y `getCategoryPublic` — ídem
- `getBannersPublic` — ídem
- `getPlan` — expone todos los campos del plan
- `getStoreDetail` (superadmin) — expone todos los campos de la tienda

Debería usarse selección explícita de columnas para minimizar exposición y payload.

---

### 9.2 Errores Silenciosos en Queries Públicas

🟡 **Queries que retornan `[]`/`null` sin loggear el error:**
- `listProductsPublic`, `listCategoriesPublic`, `getBannersPublic` capturan el error pero solo retornan vacío
- Si hay un error real de DB, el catálogo aparece vacío sin ningún log para debugging

---

### 9.3 `getSuperadminMetrics` — Sin Límite

🟡 **Lee todas las filas de `stores` para agregar en memoria:**
- `.select('billing_status')` sin `.limit()` ni paginación sobre toda la tabla `stores`
- En escala grande (miles de tiendas), query costosa que podría reemplazarse con agregación SQL directa

---

### 9.4 Mejoras Sugeridas — DB Queries

| Prioridad | Mejora |
|-----------|--------|
| 🟡 | Reemplazar `select('*')` por columnas explícitas en queries públicas |
| 🟡 | Agregar logging de errores en queries públicas (al menos `console.error`) |
| 🟡 | Reemplazar `getSuperadminMetrics` con agregación SQL en la base de datos |

---

## 10. Superadmin

*(Ver también sección 5.3 — Límite Operativo del Superadmin)*

---

## 11. Utilidades y Helpers

### 11.1 Formato de Moneda Duplicado e Inconsistente

🟠 **Dos implementaciones de formateo monetario:**
- `src/lib/utils/currency.ts` → `formatPrice()` con `Intl.NumberFormat('es-AR', { currency: 'ARS' })`, 2 decimales fijos
- `src/lib/utils/whatsapp.ts` → `formatMoney()` con `Math.round(cents/100).toLocaleString()`, sin decimales fijos

El mismo monto puede mostrar `$1.250,00` en el admin y `$1.250` en el mensaje de WhatsApp.

---

### 11.2 Fechas sin Zona Horaria Argentina

🟡 **`src/lib/utils/date.ts` sin `timeZone` fijado:**
- `Intl.DateTimeFormat('es-AR', ...)` sin `timeZone: 'America/Argentina/Buenos_Aires'`
- El formateo depende del TZ del sistema donde corre el código (servidor puede ser UTC)
- Una fecha mostrada como "hoy" en servidor puede ser "ayer" para el usuario en Argentina

---

### 11.3 Sin Tests Automatizados

🟡 **`vitest` en `devDependencies` pero sin archivos de test:**
- Infraestructura lista pero sin cobertura
- Las utilidades críticas (formateo, cálculos, WhatsApp) son las primeras candidatas para tests

---

### 11.4 Mejoras Sugeridas — Utilidades

| Prioridad | Mejora |
|-----------|--------|
| 🟠 | Crear un único helper `formatMoneyCents(cents)` usado en UI, WhatsApp y PDFs |
| 🟡 | Agregar `timeZone: 'America/Argentina/Buenos_Aires'` en `date.ts` |
| 🟡 | Agregar `toDate()` defensivo que valide strings inválidos antes de usar `Date` |
| 🟡 | Escribir tests unitarios para utilidades de moneda, fecha y WhatsApp |

---

## 12. Dependencias (package.json)

### 12.1 Dependencias Misclasificadas

🟡 **`@tanstack/react-query-devtools` en `dependencies`:**
- Debería estar en `devDependencies` si se importa condicionalmente
- Verifica el import condicional en `providers.tsx` o similar

🟡 **`shadcn` como dependencia runtime:**
- Solo es un CLI de generación de componentes, no un paquete de runtime
- Posible dependencia innecesaria en el bundle

---

### 12.2 Duplicación de Primitivos UI

🟡 **`@base-ui/react` + `@radix-ui/react-switch`:**
- Dos familias de primitivos UI en el proyecto
- Aumenta el bundle y la inconsistencia de comportamiento entre componentes

---

### 12.3 Infra de Tests Sin Cobertura

🟢 **`vitest` instalado pero sin tests:**
- La infraestructura está lista
- Comenzar con tests en utilidades críticas y handlers del executor

---

### 12.4 Dependencias Potencialmente Útiles

🟢 **Sugerencias:**
- `date-fns-tz` o equivalente para manejo explícito de TZ Argentina
- Considerar `@testing-library/react` si se quiere agregar tests de componentes

---

## 13. Configuración Next.js

### 13.1 Sin Security Headers

🟡 **`next.config.ts` sin cabeceras de seguridad HTTP:**

```typescript
// Agregar en next.config.ts:
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      // Content-Security-Policy según necesidades
    ]
  }]
}
```

---

### 13.2 `remotePatterns` Limitados

🟡 **Solo `res.cloudinary.com` en `remotePatterns`:**
- Si en algún flujo se usa otro CDN o URL de imagen, `next/image` fallará silenciosamente o mostrará error

---

## 14. Performance General

### 14.1 Resumen de Problemas de Performance

| Área | Problema | Impacto |
|------|---------|---------|
| DB pública | `select *` en queries públicas | Payload innecesariamente grande |
| DB superadmin | `getSuperadminMetrics` sin límite | O(n) en tabla `stores` |
| Frontend | Sin `Suspense` boundaries | Waterfalls visibles para el usuario |
| Frontend | Sin `next/dynamic` para sheets pesados | Bundle inicial más grande |
| Frontend | `useProducts({ pageSize: 200 })` en OrderSheet | 200 productos en memoria del cliente |
| Hooks | `staleTime: 0` en sesión asistente | Re-fetches innecesarios |
| Hooks | Polling 60s en dashboard | Tráfico constante aunque no sea necesario |
| Backend | Categorías sin paginación en catálogo | Max 48 productos sin "cargar más" |

---

## 15. Priorización de Mejoras

### 🔴 Crítico — Arreglar Inmediatamente

| # | Problema | Archivo |
|---|---------|---------|
| 1 | Cron `clean-assistant-sessions` sin auth cuando `CRON_SECRET` no está definido | `api/cron/clean-assistant-sessions/route.ts` |
| 2 | `billing_status: archived` no actualiza `stores.status` → tiendas morosas siguen activas | `api/cron/check-billing/route.ts` |
| 3 | Bug `changeTier`: validación de downgrade siempre saltea (lee `data` en lugar de `count`) | `lib/actions/billing.ts` |
| 4 | RLS `assistant_sessions` sin `UPDATE` → `last_activity_at` nunca se actualiza | `schema.sql` (migración) |
| 5 | `useStock` — filtros no en query key → caché contaminada entre vistas | `lib/hooks/use-stock.ts` |
| 6 | `useAssistantSession` — `sessionId` no en query key → sesiones mezcladas | `lib/hooks/use-assistant.ts` |

### 🟠 Alto — Sprint Próximo

| # | Problema | Archivo |
|---|---------|---------|
| 7 | Búsqueda de pedidos no funciona en admin | `app/(admin)/admin/orders/page.tsx` + `actions/orders.ts` |
| 8 | `CategoryCatalogView` no llama `setStoreId` — carrito potencialmente de otra tienda | `app/(public)/[slug]/[category]/category-catalog-view.tsx` |
| 9 | Redirección abierta en `/auth/callback` por `next` param sin validar | `app/auth/callback/route.ts` |
| 10 | `execute_assistant_action` — doble anidación de `ActionResult` (éxito que envuelve fallo) | `executor/handlers/assistant.ts` |
| 11 | `sendEmail` devuelve `success: true` sin API key en prod | `lib/email/resend.ts` |
| 12 | Desalineación `database.ts` con `schema.sql` (regenerar tipos) | `lib/types/database.ts` |
| 13 | Cancelar pedido sin confirmación (OrderSheet) | `components/admin/order-sheet.tsx` |
| 14 | Ban de usuario sin confirmación (superadmin) | `components/superadmin/users-table.tsx` |
| 15 | Superadmin: paginación real en listados de tiendas/usuarios | `app/(superadmin)/superadmin/stores/page.tsx` |
| 16 | RLS: agregar `UPDATE` en `variant_attributes`, `variant_values`, `store_users` | `schema.sql` (migración) |
| 17 | UNIQUE parcial en `stock_items` y `wholesale_prices` cuando `variant_id IS NULL` | `schema.sql` (migración) |
| 18 | `superadmin.updateStoreStatus` sin whitelist de valores | `lib/actions/superadmin.ts` |

### 🟡 Medio — Deuda Técnica

| # | Problema | Archivo |
|---|---------|---------|
| 19 | Formato monetario duplicado (`currency.ts` vs `whatsapp.ts`) | `lib/utils/` |
| 20 | Fechas sin TZ Argentina en `date.ts` | `lib/utils/date.ts` |
| 21 | `select *` en queries públicas de DB | `lib/db/queries/*.ts` |
| 22 | `supabaseServiceRole as any` en todas las queries | `lib/db/queries/*.ts` |
| 23 | Query keys manuales fuera de factory `query-keys.ts` | `lib/hooks/` |
| 24 | `staleTime`/`gcTime` faltantes en `use-variants.ts` | `lib/hooks/use-variants.ts` |
| 25 | `events.type` sin CHECK constraint en BD | `schema.sql` (migración) |
| 26 | `compare_price` sin CHECK respecto a `price` | `schema.sql` (migración) |
| 27 | Índices faltantes: `finance_entries(order_id)`, `store_invitations(expires_at)` | `schema.sql` (migración) |
| 28 | `StoreDetailPanel` — fechas de período incorrectas | `components/superadmin/store-detail-panel.tsx` |
| 29 | Sin `Suspense` boundaries en App Router | `app/` |
| 30 | Sin `next/dynamic` para sheets/modales pesados | `components/admin/` |
| 31 | OG tags incompletos en páginas de producto y categoría | `app/(public)/[slug]/p/[id]/page.tsx` |
| 32 | Agregar security headers en `next.config.ts` | `next.config.ts` |
| 33 | `CategoryCatalogView` sin "cargar más" para categorías con +48 productos | `app/(public)/[slug]/[category]/` |
| 34 | JSON-LD `availability` siempre `InStock` sin verificar stock real | `app/(public)/[slug]/p/[id]/product-detail-view.tsx` |
| 35 | Soft deletes inconsistentes (solo productos tienen `deleted_at`) | Decisión de arquitectura |
| 36 | `ModuleName` vs `ModuleKey` — dos fuentes de verdad | `lib/types/` |
| 37 | Webhook MP sin validación de antigüedad del timestamp | `lib/billing/verify-signature.ts` |

### 🟢 Bajo / Mejoras de Calidad

| # | Mejora |
|---|--------|
| 38 | Agregar tests unitarios para utilidades críticas (moneda, fecha, WhatsApp) |
| 39 | Actualizar optimista en mutaciones frecuentes (POS, stock) |
| 40 | Enmascarar `mp_subscription_id` en panel superadmin |
| 41 | Accesibilidad: `aria-label` en `BannerCarousel`, `EntityListPagination` |
| 42 | `@tanstack/react-query-devtools` mover a `devDependencies` |
| 43 | Deprecar handlers no usados: `get_store_public`, `list_products_public`, `list_categories_public` |
| 44 | Sitemap con URLs de productos individuales |
| 45 | FAB de carrito visible aunque vacío (o enlace en header) para mejor descubrimiento |
| 46 | `getSuperadminMetrics` — reemplazar con agregación SQL |
| 47 | Documentar decisión de `events` solo con `service_role` (sin política SELECT) |

---

## 1. Resumen Ejecutivo

**KitDigital.ar** es un SaaS multitenant bien estructurado con un stack moderno y coherente. La arquitectura de executor/handlers, el uso de RLS en Supabase y la separación de responsabilidades entre server actions y componentes son puntos fuertes. Sin embargo, la auditoría encontró **6 problemas críticos** que requieren atención inmediata, **12 problemas de alta severidad** y numerosas mejoras de calidad.

### Hallazgos más importantes

**Seguridad:**
- El cron de limpieza de sesiones puede ejecutarse sin autenticación si `CRON_SECRET` no está configurado
- Tiendas con morosidad (`billing_status: archived`) pueden seguir activas y visibles por desalineación con `stores.status`
- Redirección abierta post-login permite redirigir a dominios externos
- RLS de `assistant_sessions` sin `UPDATE` bloquea el tracking de actividad

**Bugs Funcionales:**
- La búsqueda de pedidos en el admin no funciona en absoluto
- `changeTier` en billing tiene un bug que permite downgrade sin validar el conteo de productos activos
- Query keys incorrectas en `useStock` y `useAssistantSession` causan contaminación de caché
- `CategoryCatalogView` no sincroniza el carrito correctamente

**Deuda Técnica:**
- `database.ts` desalineado del `schema.sql` real (columnas `orders.source`, `stores.billing_period`, etc.)
- `supabaseServiceRole as any` en todas las queries de DB elimina la seguridad de tipos
- Formato de moneda duplicado e inconsistente entre módulos
- Fechas sin zona horaria Argentina fijada

**Total de hallazgos:** 47 mejoras identificadas — 6 críticas, 11 altas, 20 medias, 10 bajas.

---
*Fin de auditoría — 25 de abril de 2026*


