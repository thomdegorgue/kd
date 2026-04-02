# Module: finance

## Purpose

Permite al dueño registrar ingresos y egresos básicos de su negocio para tener visibilidad del flujo de caja.

No es contabilidad avanzada ni un sistema de facturación. Es un registro simple de movimientos de caja con categorías básicas y resumen por período.

## Dependencies

- `catalog` — finance pertenece a una tienda
- `payments` — los pagos aprobados pueden generarse automáticamente como entradas de ingreso en finance
- `orders` — referencia opcional para vincular un movimiento a un pedido

## Data Impact

### Entities owned
- `finance_entry` — registro de movimiento de caja (ingreso o egreso)

### Fields
- `finance_entry.id` — UUID
- `finance_entry.store_id` — UUID
- `finance_entry.type` — `income` | `expense`
- `finance_entry.amount` — monto positivo
- `finance_entry.category` — categoría del movimiento (texto libre o enum: `sales`, `supplies`, `rent`, `other`)
- `finance_entry.description` — descripción del movimiento
- `finance_entry.order_id` — UUID nullable, vínculo opcional a un pedido
- `finance_entry.payment_id` — UUID nullable, vínculo opcional a un pago
- `finance_entry.date` — fecha del movimiento (tipo date, no timestamp)
- `finance_entry.created_at`, `finance_entry.updated_at`

### Relationships
- Un `finance_entry` pertenece a una `store`
- Un `finance_entry` puede estar vinculado a un `order` (referencia opcional)
- Un `finance_entry` puede estar vinculado a un `payment` (referencia opcional)

### External reads
- `payments.amount`, `payments.status` — al crear una entrada de ingreso desde un pago aprobado (lectura directa controlada)

## Actions

### `create_finance_entry`
- **Actor:** user
- **requires:** [`finance`]
- **permissions:** owner, admin
- **input:** `{ type, amount, category, description?, order_id?, payment_id?, date }`
- **output:** `finance_entry` creado
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT`, `NOT_FOUND` (order o payment inválido), `UNAUTHORIZED`

### `update_finance_entry`
- **Actor:** user
- **requires:** [`finance`]
- **permissions:** owner, admin
- **input:** `{ entry_id, amount?, category?, description?, date? }`
- **output:** `finance_entry` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `delete_finance_entry`
- **Actor:** user
- **requires:** [`finance`]
- **permissions:** owner, admin
- **input:** `{ entry_id }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `list_finance_entries`
- **Actor:** user
- **requires:** [`finance`]
- **permissions:** owner, admin
- **input:** `{ type?, category?, date_from?, date_to?, page?, limit? }`
- **output:** `{ items: finance_entry[], total }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

### `get_finance_summary`
- **Actor:** user
- **requires:** [`finance`]
- **permissions:** owner, admin
- **input:** `{ date_from, date_to }`
- **output:** `{ total_income, total_expenses, balance, by_category: [...] }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

## UI Components

- `FinanceEntryForm` — formulario de creación de movimiento
- `FinanceEntryList` — listado de movimientos con filtros
- `FinanceSummaryCard` — tarjeta con resumen de período (ingresos, egresos, balance)
- `FinanceCategoryBadge` — badge de categoría del movimiento
- `FinanceChart` — gráfico simple de ingresos vs egresos por período

## Constraints

- `amount` debe ser > 0. El `type` define si es ingreso o egreso.
- `date` es obligatorio. No puede ser una fecha futura (solo registro histórico o del día).
- Las categorías de gastos están definidas en el módulo `expenses` si está activo; si no, son texto libre.
- Requiere módulo `payments` y `orders` activos solo para lecturas opcionales; puede funcionar de forma completamente manual.

## Edge Cases

- **Pago aprobado sin entrada en finance:** el sistema no crea automáticamente una entrada de finance cuando se aprueba un pago. El dueño la carga manualmente o usa una integración futura.
- **Eliminar un pedido con finance_entry asociada:** la `finance_entry` conserva el `order_id` aunque el pedido esté cancelado. El vínculo es referencial, no de dependencia.

## Future Extensions

- Creación automática de `finance_entry` al aprobar un `payment`.
- Exportar resumen a PDF o CSV.
- Proyección de flujo de caja simple.
- Integración con módulo `savings_account`.
