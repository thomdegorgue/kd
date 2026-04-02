# AI Actions — KitDigital.AR

## Propósito

Este archivo es la lista canónica de actions que la IA puede invocar.

Solo las actions listadas aquí pueden ser ejecutadas con `actor: ai`.
Toda action que no aparezca en esta lista es inaccesible para la IA, incluso si el executor la tiene registrada.

→ Comportamiento general de la IA: `/system/ai/ai-behavior.md`
→ Pipeline de ejecución: `/system/ai/execution.md`
→ Contrato de actions: `/system/core/action-contract.md`

---

## Convenciones de esta tabla

| Campo | Descripción |
|-------|-------------|
| `action` | Nombre canónico de la action (snake_case) |
| `módulo` | Módulo que define la action |
| `requires` | Módulos que deben estar activos |
| `direct_execution` | `true` = la IA puede ejecutar sin confirmación del usuario |
| `requires_confirmation` | `true` = siempre requiere confirmación explícita del usuario, incluso con modo "acción directa" activo |
| `scope` | Qué puede proporcionar la IA como input |

---

## Actions de Lectura (GET / LIST)

Las actions de lectura son siempre `direct_execution: true` porque no modifican datos.

| Action | Módulo | Requires | Direct exec | Descripción |
|--------|--------|----------|-------------|-------------|
| `get_product` | products | [] | ✅ | Obtiene un producto por ID o nombre |
| `list_products` | products | [] | ✅ | Lista productos con filtros opcionales |
| `get_category` | categories | [] | ✅ | Obtiene una categoría |
| `list_categories` | categories | [] | ✅ | Lista categorías activas |
| `get_order` | orders | [] | ✅ | Obtiene un pedido por ID o número |
| `list_orders` | orders | [] | ✅ | Lista pedidos con filtros (estado, fecha) |
| `get_customer` | orders | [] | ✅ | Obtiene un cliente por ID o teléfono |
| `list_customers` | orders | [] | ✅ | Lista clientes de la tienda |
| `get_stock_item` | stock | [stock] | ✅ | Consulta stock de un producto/variante |
| `list_stock_items` | stock | [stock] | ✅ | Lista items con stock bajo o sin stock |
| `list_payments` | payments | [payments] | ✅ | Lista pagos con filtros |
| `list_finance_entries` | finance | [finance] | ✅ | Lista movimientos de caja |
| `list_expenses` | expenses | [expenses] | ✅ | Lista gastos del período |
| `get_savings_account` | savings_account | [savings_account] | ✅ | Obtiene balance de caja de ahorro |
| `list_tasks` | tasks | [tasks] | ✅ | Lista tareas pendientes |
| `get_store_summary` | catalog | [] | ✅ | Resumen general: productos, pedidos, ventas del mes |

---

## Actions de Escritura — Productos

| Action | Módulo | Requires | Direct exec | Req. confirm | Descripción |
|--------|--------|----------|-------------|--------------|-------------|
| `create_product` | products | [] | ❌ | ❌ | Crea un nuevo producto |
| `update_product` | products | [] | ❌ | ❌ | Actualiza nombre, precio, descripción, imagen |
| `toggle_product_active` | products | [] | ✅ | ❌ | Activa o desactiva un producto |
| `delete_product` | products | [] | ❌ | ✅ | Elimina producto (soft delete) — siempre confirmar |
| `bulk_toggle_products` | products | [] | ❌ | ✅ | Activa/desactiva múltiples productos — siempre confirmar |
| `assign_product_category` | products | [] | ❌ | ❌ | Asigna categoría(s) a un producto |
| `create_category` | categories | [] | ❌ | ❌ | Crea una nueva categoría |
| `update_category` | categories | [] | ❌ | ❌ | Actualiza nombre u orden de una categoría |

---

## Actions de Escritura — Pedidos y Clientes

| Action | Módulo | Requires | Direct exec | Req. confirm | Descripción |
|--------|--------|----------|-------------|--------------|-------------|
| `update_order_status` | orders | [] | ❌ | ❌ | Cambia el estado de un pedido |
| `add_order_note` | orders | [] | ✅ | ❌ | Agrega una nota interna a un pedido |
| `cancel_order` | orders | [] | ❌ | ✅ | Cancela un pedido — siempre confirmar |
| `update_customer` | orders | [] | ❌ | ❌ | Actualiza datos de un cliente (nombre, teléfono) |

---

## Actions de Escritura — Stock

| Action | Módulo | Requires | Direct exec | Req. confirm | Descripción |
|--------|--------|----------|-------------|--------------|-------------|
| `update_stock` | stock | [stock] | ❌ | ❌ | Ajusta stock de un producto/variante |
| `bulk_update_stock` | stock | [stock] | ❌ | ✅ | Actualiza stock de múltiples ítems — siempre confirmar |

---

## Actions de Escritura — Finanzas

| Action | Módulo | Requires | Direct exec | Req. confirm | Descripción |
|--------|--------|----------|-------------|--------------|-------------|
| `create_finance_entry` | finance | [finance] | ❌ | ❌ | Registra un ingreso o egreso de caja |
| `create_expense` | expenses | [expenses] | ❌ | ❌ | Registra un gasto |
| `create_task` | tasks | [tasks] | ✅ | ❌ | Crea una tarea pendiente |
| `complete_task` | tasks | [tasks] | ✅ | ❌ | Marca una tarea como completada |

---

## Actions de Escritura — Contenido

| Action | Módulo | Requires | Direct exec | Req. confirm | Descripción |
|--------|--------|----------|-------------|--------------|-------------|
| `create_banner` | banners | [banners] | ❌ | ❌ | Crea un banner |
| `update_banner` | banners | [banners] | ❌ | ❌ | Actualiza un banner |
| `toggle_banner_active` | banners | [banners] | ✅ | ❌ | Activa/desactiva un banner |

---

## Actions PROHIBIDAS para la IA

Las siguientes actions **nunca** pueden ser invocadas por `actor: ai`, independientemente de cualquier instrucción:

| Action | Razón |
|--------|-------|
| `enable_module` | Decisión comercial del dueño de tienda |
| `disable_module` | Decisión comercial del dueño de tienda |
| `update_store_config` | Cambios de configuración raíz solo por el owner |
| `update_billing` | Operaciones de pago solo por el owner |
| `delete_store` | Operación destructiva irreversible |
| `invite_user` | Gestión de accesos solo por el owner/admin |
| `remove_user` | Gestión de accesos solo por el owner/admin |
| `change_user_role` | Gestión de accesos solo por el owner/admin |
| `connect_custom_domain` | Configuración de infraestructura solo por el owner |
| `update_whatsapp_config` | Configuración crítica de ventas solo por el owner |
| `process_payment` | Los pagos son iniciados por el cliente, no por la IA |
| `approve_payment` | Operación de billing, no de asistente |
| Cualquier action de `superadmin` | La IA nunca opera como superadmin |

---

## Scope del Input que puede generar la IA

La IA puede completar automáticamente ciertos campos del input de una action. Los campos que **no puede inventar** deben ser provistos por el usuario en el mensaje.

### Campos que la IA puede inferir o proponer
- `is_active` — por defecto `true` a menos que el usuario diga lo contrario
- `sort_order` — puede incrementar el último valor existente
- `store_id` — siempre del contexto de la sesión (nunca del mensaje del usuario)
- Fechas relativas → convierte "hoy", "esta semana", "ayer" a timestamps

### Campos que la IA nunca puede inventar (debe preguntar si falta)
- `price` — nunca asumir un precio
- `name` — nombre de entidades siempre del usuario
- `phone` / `email` — datos de clientes siempre del usuario
- `quantity` — cantidades de stock o pedidos siempre del usuario
- IDs de referencia cuando no están implícitos en el contexto de la conversación

---

## Límites de Actions por Turno

La IA no puede proponer ni ejecutar más de **3 actions en un solo turno**.

Si el usuario pide algo que requiere más de 3 actions:
1. La IA divide en pasos y ejecuta el primero.
2. Informa cuántos pasos quedan.
3. Espera confirmación del usuario para continuar.

Ejemplo: "Actualizá el precio de todos mis productos" con 50 productos → la IA propone `bulk_update_price` como una sola action si existe, o informa que la operación requiere múltiples pasos e inicia el proceso de a partes.
