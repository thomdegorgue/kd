# Module: payments

## Purpose

Permite al dueño registrar y gestionar el estado de cobro de los pedidos.

No es una pasarela de pago al cliente final. Es una herramienta interna para que el dueño marque pedidos como pagados, parcialmente pagados o pendientes de pago. Provee visibilidad sobre qué pedidos ya fueron cobrados.

## Dependencies

- `catalog` — los pagos pertenecen a una tienda
- `orders` — un pago siempre está asociado a un pedido

## Data Impact

### Entities owned
- `payment` — el módulo payments es el único que escribe en la tabla `payments`

### Fields
- `payment.id` — UUID
- `payment.store_id` — UUID
- `payment.order_id` — UUID, referencia a `orders.id`
- `payment.amount` — monto cobrado en centavos/unidad monetaria
- `payment.status` — `pending`, `approved`, `rejected`, `refunded`
- `payment.method` — texto libre o enum: `cash`, `transfer`, `card`, `mp`, `other`
- `payment.mp_payment_id` — ID de Mercado Pago (nullable; solo si se usa MP para confirmar)
- `payment.notes` — observaciones del dueño
- `payment.paid_at` — timestamp del pago confirmado (nullable hasta que se aprueba)
- `payment.created_at`, `payment.updated_at`

### Relationships
- Un `payment` pertenece a un `order`
- Un `payment` pertenece a una `store`
- Un `order` puede tener múltiples `payments` (pagos parciales o en cuotas)

### External reads
- `orders.total` — para validar que el monto pagado no supera el total del pedido al registrar (lectura directa controlada)

## Actions

### `create_payment`
- **Actor:** user
- **requires:** [`payments`, `orders`]
- **permissions:** owner, admin
- **input:** `{ order_id, amount, method, notes?, paid_at? }`
- **output:** `payment` creado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND` (order inválido), `INVALID_INPUT` (amount <= 0), `UNAUTHORIZED`

### `update_payment_status`
- **Actor:** user, system
- **requires:** [`payments`]
- **permissions:** owner, admin, system
- **input:** `{ payment_id, status, mp_payment_id? }`
- **output:** `payment` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `CONFLICT` (transición inválida), `UNAUTHORIZED`

### `delete_payment`
- **Actor:** user
- **requires:** [`payments`]
- **permissions:** owner, admin
- **input:** `{ payment_id }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `CONFLICT` (pago en estado `approved` no puede eliminarse), `UNAUTHORIZED`

### `list_payments`
- **Actor:** user
- **requires:** [`payments`]
- **permissions:** owner, admin, collaborator
- **input:** `{ order_id?, status?, date_from?, date_to?, page?, limit? }`
- **output:** `{ items: payment[], total }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

### `get_order_payment_summary`
- **Actor:** user
- **requires:** [`payments`, `orders`]
- **permissions:** owner, admin, collaborator
- **input:** `{ order_id }`
- **output:** `{ total_order: number, total_paid: number, balance: number, payments: payment[] }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

## UI Components

- `PaymentStatusBadge` — badge de estado del pago en la vista de pedido
- `PaymentForm` — formulario para registrar un pago manual
- `PaymentSummary` — resumen de pagos de un pedido (total, pagado, saldo)
- `PaymentList` — listado de pagos de un pedido o de la tienda

## Constraints

- Un pago en estado `approved` no puede eliminarse. Solo puede marcarse como `refunded`.
- Transiciones de estado válidas:
  - `pending` → `approved`, `rejected`
  - `approved` → `refunded`
  - `rejected` → (terminal)
  - `refunded` → (terminal)
- Un pedido puede tener pagos parciales. La suma de `approved` puede ser menor que el total del pedido.
- `amount` debe ser > 0.
- Requiere módulo `orders` activo además de `payments`.

## Edge Cases

- **Pago que supera el total del pedido:** el sistema lo permite con un warning (puede haber propinas o ajustes). No bloquea la operación.
- **Múltiples pagos parciales en el mismo pedido:** válido. Se suman los `approved` para calcular el saldo pendiente.
- **Webhook de Mercado Pago:** cuando se recibe un webhook de MP confirmando un pago, el `system` actor ejecuta `update_payment_status` para marcar como `approved`. Ver `/system/billing/webhooks.md` para el caso del billing de KitDigital; este caso es el pago del cliente final a la tienda si se integrara MP directamente — fuera del scope actual pero el campo `mp_payment_id` lo soporta.

## Future Extensions

- Integración de QR de Mercado Pago para que el cliente pague directamente.
- Vista de conciliación de pagos vs pedidos.
- Recordatorio automático de cobros pendientes.
