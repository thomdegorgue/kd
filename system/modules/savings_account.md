# Module: savings_account

## Purpose

Permite al dueño gestionar una cuenta de ahorro virtual dentro de la tienda.

Es una herramienta de disciplina financiera simple: el dueño puede apartar dinero de sus ingresos en una "cuenta" virtual, definir metas y hacer seguimiento de su progreso de ahorro.

## Dependencies

- `catalog` — savings_account pertenece a una tienda
- `finance` — los movimientos de ahorro pueden vincularse a entradas de finance
- `payments` — puede originar un ahorro desde un pago aprobado

## Data Impact

### Entities owned
- `savings_account` — cuenta de ahorro virtual de la tienda
- `savings_movement` — movimiento de depósito o retiro en la cuenta

### Fields
- `savings_account.id` — UUID
- `savings_account.store_id` — UUID
- `savings_account.name` — nombre de la cuenta (ej: "Fondo para equipamiento")
- `savings_account.balance` — saldo actual (calculado o actualizado por movimientos)
- `savings_account.goal_amount` — meta de ahorro opcional
- `savings_account.is_active` — boolean
- `savings_account.created_at`, `savings_account.updated_at`
- `savings_movement.id` — UUID
- `savings_movement.store_id` — UUID
- `savings_movement.savings_account_id` — UUID
- `savings_movement.type` — `deposit` | `withdrawal`
- `savings_movement.amount` — monto positivo
- `savings_movement.description` — descripción opcional
- `savings_movement.finance_entry_id` — UUID nullable, vínculo a finance_entry
- `savings_movement.created_at`

### Relationships
- Una `savings_account` pertenece a una `store`
- Un `savings_movement` pertenece a una `savings_account`
- Un `savings_movement` puede vincularse a una `finance_entry`

### External reads
- `finance_entries` — para referenciar entradas de finance al crear movimientos vinculados (lectura directa controlada)

## Actions

### `create_savings_account`
- **Actor:** user
- **requires:** [`savings_account`]
- **permissions:** owner, admin
- **input:** `{ name, goal_amount? }`
- **output:** `savings_account` creada
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT`, `UNAUTHORIZED`

### `deposit_savings`
- **Actor:** user
- **requires:** [`savings_account`]
- **permissions:** owner, admin
- **input:** `{ savings_account_id, amount, description?, finance_entry_id? }`
- **output:** `savings_movement` creado, `savings_account.balance` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `INVALID_INPUT`, `UNAUTHORIZED`

### `withdraw_savings`
- **Actor:** user
- **requires:** [`savings_account`]
- **permissions:** owner, admin
- **input:** `{ savings_account_id, amount, description? }`
- **output:** `savings_movement` creado, balance actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `INVALID_INPUT` (amount > balance), `UNAUTHORIZED`

### `list_savings_movements`
- **Actor:** user
- **requires:** [`savings_account`]
- **permissions:** owner, admin
- **input:** `{ savings_account_id, date_from?, date_to? }`
- **output:** `{ items: savings_movement[], balance }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

## UI Components

- `SavingsAccountCard` — tarjeta con nombre, balance y progreso hacia la meta
- `SavingsMovementForm` — formulario de depósito o retiro
- `SavingsProgressBar` — barra de progreso hacia la meta
- `SavingsMovementList` — historial de movimientos

## Constraints

- No se puede retirar más del balance disponible.
- `amount` debe ser > 0.
- Una tienda puede tener múltiples cuentas de ahorro.
- El `balance` se actualiza sincrónicamente en cada movimiento (no calculado en queries).

## Edge Cases

- **Retiro que deja el balance en 0:** válido.
- **Meta no configurada:** la cuenta funciona sin meta. No hay barra de progreso en la UI.

## Future Extensions

- Transferencia entre cuentas de ahorro.
- Ahorro automático: porcentaje de cada venta que va a la cuenta.
- Integración con billeteras digitales reales (futura, mucho más complejo).
