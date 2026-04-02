# Module: expenses

## Purpose

Permite al dueño registrar los egresos del negocio de forma categorizada.

Complementa al módulo `finance` con un registro específico de gastos con más detalle: proveedor, categoría de gasto, recurrencia y adjunto opcional. Mientras `finance` registra el flujo de caja de forma plana, `expenses` es el registro detallado de lo que sale.

## Dependencies

- `catalog` — expenses pertenece a una tienda
- `finance` — un expense puede crear automáticamente una `finance_entry` de tipo `expense`

## Data Impact

### Entities owned
- `expense` — el módulo expenses es el único que escribe en la tabla `expenses`

### Fields
- `expense.id` — UUID
- `expense.store_id` — UUID
- `expense.amount` — monto del gasto
- `expense.category` — categoría: `supplies`, `rent`, `services`, `marketing`, `equipment`, `salary`, `other`
- `expense.description` — descripción del gasto
- `expense.supplier` — proveedor o destinatario del gasto (texto libre, opcional)
- `expense.date` — fecha del gasto
- `expense.is_recurring` — boolean; si es un gasto recurrente (mensual, etc.)
- `expense.recurrence_period` — `monthly` | `weekly` | `annual` nullable (solo si `is_recurring: true`)
- `expense.receipt_url` — URL de comprobante (Cloudinary, opcional)
- `expense.finance_entry_id` — UUID nullable, vínculo a finance_entry creada
- `expense.created_at`, `expense.updated_at`

### Relationships
- Un `expense` pertenece a una `store`
- Un `expense` puede tener una `finance_entry` asociada

### External reads
- Ninguno.

## Actions

### `create_expense`
- **Actor:** user
- **requires:** [`expenses`]
- **permissions:** owner, admin
- **input:** `{ amount, category, description, date, supplier?, is_recurring?, recurrence_period?, receipt_url?, create_finance_entry? }`
- **output:** `expense` creado (y `finance_entry` si `create_finance_entry: true` y módulo `finance` activo)
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT`, `UNAUTHORIZED`

### `update_expense`
- **Actor:** user
- **requires:** [`expenses`]
- **permissions:** owner, admin
- **input:** `{ expense_id, amount?, category?, description?, date?, supplier?, is_recurring?, recurrence_period?, receipt_url? }`
- **output:** `expense` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `delete_expense`
- **Actor:** user
- **requires:** [`expenses`]
- **permissions:** owner, admin
- **input:** `{ expense_id }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `list_expenses`
- **Actor:** user
- **requires:** [`expenses`]
- **permissions:** owner, admin
- **input:** `{ category?, date_from?, date_to?, is_recurring?, page?, limit? }`
- **output:** `{ items: expense[], total }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

### `get_expenses_summary`
- **Actor:** user
- **requires:** [`expenses`]
- **permissions:** owner, admin
- **input:** `{ date_from, date_to }`
- **output:** `{ total, by_category: [...] }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

## UI Components

- `ExpenseForm` — formulario de creación con categoría y recurrencia
- `ExpenseList` — listado con filtros y total del período
- `ExpenseCategoryBadge` — badge por categoría con color
- `ExpenseSummaryCard` — resumen de egresos del período
- `RecurringExpenseBadge` — indicador visual de gasto recurrente

## Constraints

- `amount` debe ser > 0.
- `category` debe ser uno de los valores definidos del enum.
- `recurrence_period` solo es válido si `is_recurring: true`.
- `receipt_url` debe ser URL de Cloudinary del tenant si se provee.
- `create_finance_entry` solo tiene efecto si el módulo `finance` está activo.

## Edge Cases

- **Módulo `finance` inactivo al crear expense con `create_finance_entry: true`:** se crea el expense sin finance_entry. No hay error; se ignora el flag.
- **Gasto recurrente:** el sistema no genera automáticamente gastos recurrentes. El dueño los crea manualmente cada período o en el futuro habrá automatización.

## Future Extensions

- Generación automática de gastos recurrentes en la fecha de cada período.
- OCR de recibos para autocompletar el formulario.
- Alertas de gastos inusuales (mayor que el promedio histórico).
