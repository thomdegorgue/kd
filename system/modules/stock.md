# Module: stock

## Purpose

Habilita el control de inventario por producto.

El dueño define una cantidad disponible para cada producto. El sistema descuenta stock cuando se registra una venta o se confirma un pedido. Cuando el stock llega a cero, el producto se marca automáticamente como sin disponibilidad en la vitrina.

## Dependencies

- `catalog` — stock pertenece a una tienda
- `products` — el stock se aplica sobre productos existentes

## Data Impact

### Entities owned
- `stock_item` — registro de stock por producto (o por variant si módulo variants activo)

### Fields
- `stock_item.id` — UUID
- `stock_item.store_id` — UUID
- `stock_item.product_id` — UUID, referencia a `products.id`
- `stock_item.variant_id` — UUID, nullable (si módulo variants activo)
- `stock_item.quantity` — entero >= 0, cantidad disponible
- `stock_item.low_stock_threshold` — entero, cantidad a partir de la cual se considera stock bajo (default: 0)
- `stock_item.track_stock` — boolean; si false, no se descuenta ni se verifica stock para este producto
- `stock_item.created_at`, `stock_item.updated_at`

### Relationships
- Un `stock_item` pertenece a un `product`
- Un `stock_item` puede pertenecer a un `variant` (si módulo variants activo)
- Un `stock_item` pertenece a una `store`

### External reads
- `products.is_active` — para verificar que el producto existe y está activo antes de crear el stock_item
- `order_items` — cuando se confirma un pedido, se leen los ítems para saber cuánto descontar (lectura directa controlada; el trigger viene del módulo orders via action pública)

## Actions

### `create_stock_item`
- **Actor:** user
- **requires:** [`stock`]
- **permissions:** owner, admin
- **input:** `{ product_id, quantity, low_stock_threshold?, track_stock?, variant_id? }`
- **output:** `stock_item` creado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND` (product inválido), `CONFLICT` (ya existe stock_item para ese product_id/variant_id), `UNAUTHORIZED`

### `update_stock`
- **Actor:** user
- **requires:** [`stock`]
- **permissions:** owner, admin
- **input:** `{ stock_item_id, quantity, low_stock_threshold?, track_stock? }`
- **output:** `stock_item` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `INVALID_INPUT` (quantity < 0), `UNAUTHORIZED`

### `process_stock_deduction`
- **Actor:** system (invocado por módulo orders al confirmar pedido)
- **requires:** [`stock`]
- **permissions:** system
- **input:** `{ store_id, items: [{ product_id, variant_id?, quantity }] }`
- **output:** `{ success: true, deductions: [...], out_of_stock: [...] }`
- **errors:** `MODULE_INACTIVE`, `CONFLICT` (stock insuficiente en modo estricto)
- **nota:** esta es la action pública que el módulo orders invoca. Si `track_stock: false` para un ítem, se omite la deducción de ese ítem.

### `get_stock`
- **Actor:** user
- **requires:** [`stock`]
- **permissions:** owner, admin, collaborator
- **input:** `{ product_id, variant_id? }`
- **output:** `stock_item`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `list_stock`
- **Actor:** user
- **requires:** [`stock`]
- **permissions:** owner, admin, collaborator
- **input:** `{ low_stock_only? }`
- **output:** `{ items: stock_item[] }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

### `restore_stock`
- **Actor:** user
- **requires:** [`stock`]
- **permissions:** owner, admin
- **input:** `{ stock_item_id, quantity_to_add }`
- **output:** `stock_item` actualizado con nuevo quantity
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `INVALID_INPUT`, `UNAUTHORIZED`

## UI Components

- `StockBadge` — badge en la ProductCard del panel mostrando cantidad disponible
- `StockInput` — campo para actualizar cantidad de stock
- `LowStockAlert` — alerta cuando el stock está por debajo del umbral
- `StockList` — listado de todos los productos con su stock actual
- `OutOfStockBadge` — indicador visual de "sin stock" en la vitrina

## Constraints

- `quantity` no puede ser negativo. Si una deducción dejaría el stock en negativo, se devuelve `CONFLICT` (en modo estricto).
- `track_stock: false` permite vender el producto aunque no haya stock registrado (modo sin control).
- Cuando `quantity` llega a 0 y `track_stock: true`, el producto se muestra como "sin disponibilidad" en la vitrina.
- Solo puede existir un `stock_item` por `(product_id, variant_id)` por tienda.
- Si el módulo `variants` no está activo, `variant_id` siempre es null en los stock_items.

## Edge Cases

- **Desactivar módulo `stock` con datos existentes:** los `stock_items` se conservan en la DB. Si se reactiva, el stock previo sigue disponible.
- **Pedido confirmado con `stock` en 0 (modo laxo):** si la tienda tiene `stock` activo pero el sistema no está configurado como "estricto", el pedido se confirma y el stock queda en negativo. El dueño recibe alerta de stock negativo.
- **Módulo `variants` activo:** si un producto tiene variantes, el stock se gestiona por variant, no por producto base. `list_stock` devuelve una fila por variant.
- **Reactivar producto sin stock:** si un producto tiene `is_active: false` por falta de stock y el dueño restaura stock, el sistema no activa el producto automáticamente. El dueño lo activa manualmente.

## Future Extensions

- Modo estricto vs. laxo configurable por tienda.
- Alertas automáticas de stock bajo por email o notificación.
- Historial de movimientos de stock.
- Stock por lote o por vencimiento.
