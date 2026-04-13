# Dominio — Lenguaje Canónico y Reglas Globales

Este archivo es el diccionario y la constitución del sistema. Todo nombre, toda regla, todo estado definido aquí es ley.

---

## Entidades del Sistema

| Entidad | Tabla | Descripción |
|---------|-------|-------------|
| `store` | `stores` | Un negocio registrado. Unidad raíz de todo. |
| `user` | `users` | Persona con cuenta en el sistema. |
| `store_user` | `store_users` | Relación usuario↔tienda con rol. |
| `store_invitation` | `store_invitations` | Invitación pendiente a unirse a una tienda (token, email, rol, expiración). |
| `plan` | `plans` | Conjunto de límites y módulos. Definido por KitDigital. |
| `product` | `products` | Artículo que la tienda ofrece. |
| `category` | `categories` | Agrupación de productos. |
| `customer` | `customers` | Persona que generó un pedido. Sin cuenta propia. |
| `order` | `orders` | Solicitud de compra. |
| `order_item` | `order_items` | Línea de un pedido (snapshot de producto). |
| `payment` | `payments` | Registro de un cobro del dueño a su cliente. |
| `banner` | `banners` | Imagen promocional en la vitrina. |
| `variant` | `variants` | Combinación de atributos de producto (talle, color). |
| `variant_attribute` | `variant_attributes` | Tipo de atributo ("Talle", "Color"). |
| `variant_value` | `variant_values` | Valor concreto ("M", "Rojo"). |
| `stock_item` | `stock_items` | Control de inventario por producto/variante. |
| `wholesale_price` | `wholesale_prices` | Precio mayorista. |
| `shipping_method` | `shipping_methods` | Opción de envío configurada. |
| `shipment` | `shipments` | Envío con seguimiento asociado a un pedido. |
| `finance_entry` | `finance_entries` | Movimiento de caja (ingreso o egreso). |
| `expense` | `expenses` | Egreso detallado con categoría. |
| `savings_account` | `savings_accounts` | Cuenta de ahorro virtual. |
| `savings_movement` | `savings_movements` | Depósito o retiro de ahorro. |
| `task` | `tasks` | Tarea interna de seguimiento. |
| `assistant_session` | `assistant_sessions` | Sesión de chat con el asistente IA. |
| `assistant_message` | `assistant_messages` | Mensaje individual en una sesión. |
| `event` | `events` | Registro inmutable de algo que ocurrió. |
| `billing_payment` | `billing_payments` | Cobro de MP a una tienda (billing KitDigital). |

---

## Nombres Prohibidos

| Prohibido | Usar en su lugar |
|-----------|----------------|
| `shop`, `tenant` | `store` |
| `item` | `product` |
| `buyer` | `customer` |
| `pedido`, `tienda`, `producto`, `precio` | Nombres en inglés |
| `storeID`, `StoreId` | `store_id` |
| `actionCreate` | `create_{entidad}` |

---

## Convenciones de Naming

- **Tablas y campos:** `snake_case` siempre.
- **Entidades:** singular en código, plural en tablas.
- **Referencias:** `{entidad}_id` (ej: `store_id`, `product_id`).
- **Timestamps:** sufijo `_at` (ej: `created_at`).
- **Fechas sin hora:** sufijo `_date` o tipo DATE.
- **Booleanos:** prefijo `is_` o `has_`.
- **Actions:** `{verbo}_{entidad}` en snake_case. Verbos: `create`, `update`, `delete`, `get`, `list`, `enable`, `disable`, `archive`, `process`, `send`, `generate`.
- **Eventos:** `{entidad}_{verbo_pasado}` (ej: `product_created`, `order_status_updated`).

---

## Estados de Tienda (store.status / store.billing_status)

Ambos campos siempre tienen el mismo valor. `billing_status` es el canónico para billing. `status` para el executor y RLS.

| Estado | Descripción | Operaciones permitidas |
|--------|-------------|----------------------|
| `demo` | Trial de 14 días. Límites reducidos. | CORE + módulos base. Sin billing. |
| `active` | Suscripción al día. | Todo. |
| `past_due` | Pago vencido. | Solo lecturas. No creates ni writes. |
| `suspended` | Bloqueada por superadmin. | Ninguna. |
| `archived` | Fuera del sistema activo. Datos conservados 90 días. | Ninguna. |

Transiciones válidas:
- `demo` → `active` (primer pago confirmado)
- `active` → `past_due` (pago fallido)
- `active` → `suspended` (superadmin)
- `past_due` → `active` (pago regularizado)
- `past_due` → `archived` (30 días sin pagar)
- `past_due` → `suspended` (superadmin)
- `suspended` → `active` (superadmin)
- `archived` → `active` (reactivación con pago)

---

## Estados de Pedido (order.status)

| Estado | Descripción |
|--------|-------------|
| `pending` | Recibido, sin confirmar. |
| `confirmed` | Confirmado por el dueño. |
| `preparing` | En preparación. |
| `delivered` | Entregado al cliente. |
| `cancelled` | Cancelado. Estado terminal. |

Transiciones válidas: `pending → confirmed → preparing → delivered`. Cualquier estado no terminal → `cancelled`.

---

## Estados de Pago (payment.status)

| Estado | Descripción |
|--------|-------------|
| `pending` | Registrado, sin confirmar. |
| `approved` | Confirmado. |
| `rejected` | Rechazado. |
| `refunded` | Reembolsado. |

---

## Estados de Envío (shipment.status)

| Estado | Descripción |
|--------|-------------|
| `preparing` | Envío creado, preparando paquete. |
| `in_transit` | Despachado, en camino. |
| `delivered` | Entregado. Estado terminal. |
| `cancelled` | Cancelado. Estado terminal. |

Transiciones válidas: `preparing → in_transit → delivered`. Cualquier estado no terminal → `cancelled`.

---

## Errores Canónicos del Executor

| Código | Cuándo se usa |
|--------|--------------|
| `MODULE_INACTIVE` | El módulo requerido no está activo. |
| `LIMIT_EXCEEDED` | Se alcanzó el límite del plan. |
| `NOT_FOUND` | La entidad no existe o no pertenece a esta tienda. |
| `UNAUTHORIZED` | El actor no tiene permiso. |
| `INVALID_INPUT` | El input no cumple validaciones. |
| `STORE_INACTIVE` | La tienda no permite esta operación en su estado actual. |
| `CONFLICT` | Estado inconsistente con la operación. |
| `EXTERNAL_ERROR` | Error de servicio externo (MP, Cloudinary, OpenAI). |
| `SYSTEM_ERROR` | Error interno no clasificado. |

---

## Reglas Globales

1. **Todo tiene store_id.** Toda entidad de dominio tiene `store_id: UUID` obligatorio e inmutable. Excepciones: `users`, `plans`.
2. **Toda query filtra por store_id.** Sin excepción salvo operaciones explícitas de superadmin.
3. **Toda action valida módulos.** El executor verifica `store.modules[modulo] === true` antes de ejecutar.
4. **Toda action valida límites del plan.** Si aplica, el executor verifica antes de ejecutar.
5. **Naming es ley.** Todo nombre respeta las convenciones de este archivo.
6. **La IA no ejecuta directamente.** Genera JSON; el executor valida y ejecuta.
7. **No hay lógica duplicada.** Una regla existe en un solo lugar.
8. **Los módulos no cruzan ownership.** Un módulo solo escribe en sus propias tablas.
9. **El lifecycle de tienda es sagrado.** Solo las transiciones definidas son válidas.
10. **El superadmin tiene control total.** Puede auditar, modificar o bloquear cualquier cosa.
11. **Los eventos son inmutables.** No se modifican ni eliminan.
12. **Mobile-first siempre.** Todo se diseña primero para móvil.
13. **JSONB es para extensiones, no para lógica.** Campos como `config`, `modules`, `metadata` son extensiones. La lógica crítica tiene columnas propias.
14. **Una sola base de datos.** Aislamiento por `store_id`, no por infraestructura.
15. **Escalar a 10.000 tiendas.** Toda decisión de diseño debe funcionar a esa escala.
16. **Simplicidad sobre complejidad.** Si lo simple resuelve el problema, se usa lo simple.

---

## Anti-Patrones (prohibidos)

- Lógica de negocio fuera de módulos o en el frontend.
- Actions sin validar módulo activo o límites del plan.
- IA ejecutando acciones directamente sin executor.
- Queries sin filtrar por `store_id`.
- Tablas o campos no declarados en el schema.
- Un módulo escribiendo en tablas de otro módulo.
- Componentes UI duplicados.
- Romper el lifecycle de tienda.
- IDs hardcodeados en código.
- Modificar eventos ya registrados.
- Implementar código sin especificación previa en `/system`.
- Usar JSONB para lógica crítica.

---

## Campos Universales Obligatorios

Toda entidad de dominio (con store_id):
```
id          UUID DEFAULT gen_random_uuid()
store_id    UUID NOT NULL
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Entidades inmutables (events, order_items, assistant_messages, billing_payments, store_invitations): no tienen `updated_at`.

**Excepción documentada — `events.store_id` nullable:**
La tabla `events` declara `store_id` como nullable. Esto es intencional y cubre dos casos:
1. Eventos globales de sistema (`actor_type = 'system'`) que no están asociados a ninguna tienda.
2. Eventos de superadmin que afectan al sistema sin contexto de tienda (ej: `plan_created`).
Todo evento generado por un `user` o `ai` **debe** tener `store_id NOT NULL`. Esta invariante se valida en el executor (paso 8), no en el schema.

---

## Eventos del Sistema

Cada action exitosa emite un evento. Formato del evento:

```
{ id, store_id, type, actor_type, actor_id, data, created_at }
```

Catálogo de eventos:

| Evento | Trigger | Módulo |
|--------|---------|--------|
| `store_created` | `create_store` | core |
| `store_updated` | `update_store` | catalog |
| `store_status_changed` | transición de lifecycle | billing/superadmin |
| `module_enabled` | `enable_module` | catalog |
| `module_disabled` | `disable_module` | catalog |
| `product_created` | `create_product` | products |
| `product_updated` | `update_product` | products |
| `product_deleted` | `delete_product` | products |
| `order_created` | `create_order` | orders |
| `order_status_updated` | `update_order_status` | orders |
| `order_cancelled` | `cancel_order` | orders |
| `payment_created` | `create_payment` | payments |
| `payment_approved` | status → approved | payments |
| `payment_rejected` | status → rejected | payments |
| `payment_refunded` | status → refunded | payments |
| `stock_updated` | `update_stock` | stock |
| `stock_depleted` | quantity llega a 0 | stock |
| `shipment_created` | `create_shipment` | shipping |
| `shipment_status_updated` | `update_shipment_status` | shipping |
| `subscription_created` | primer pago | billing |
| `subscription_renewed` | cobro recurrente exitoso | billing |
| `subscription_payment_failed` | cobro fallido | billing |
| `billing_retry_queue_alert` | cola de reintentos de webhooks MP supera umbral | billing |
| `store_user_invited` | `invite_store_user` | multiuser |
| `store_user_role_updated` | `update_store_user_role` | multiuser |
| `store_user_removed` | `remove_store_user` | multiuser |
| `assistant_action_executed` | IA ejecuta action via executor | assistant |
| `store_impersonated` | superadmin inicia impersonation | superadmin |
| `invitation_cancelled` | `cancel_invitation` | multiuser |

Reglas de eventos:
- Inmutables. No se editan ni eliminan.
- Se persisten en la misma transacción que la operación.
- Si el evento no se puede persistir, la transacción entera falla.
- `actor_type` siempre se registra (`user`, `superadmin`, `system`, `ai`).
