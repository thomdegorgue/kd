# Module: orders

## Purpose

Gestiona el ciclo de vida de los pedidos recibidos por la tienda.

Un pedido es una solicitud de compra que el dueño registra y gestiona. Puede originarse desde el carrito de WhatsApp (el dueño lo carga manualmente o se crea automáticamente) o ser cargado directamente por el dueño desde el panel.

El módulo permite al dueño ver, actualizar el estado, y hacer seguimiento de cada pedido.

## Dependencies

- `catalog` — los pedidos pertenecen a una tienda
- `products` — un pedido referencia productos de la tienda
- `cart` — el origen principal de pedidos es el carrito WhatsApp (opcional: si está activo, puede crear el order automáticamente)

## Data Impact

### Entities owned
- `order` — el módulo orders es el único que escribe en la tabla `orders`
- `order_items` — ítems de cada pedido; propiedad de orders

### Fields
- `order.id` — UUID, clave primaria
- `order.store_id` — UUID
- `order.customer_id` — UUID, referencia a `customers.id` (opcional; se crea el customer si no existe)
- `order.status` — estado del pedido: `pending`, `confirmed`, `preparing`, `delivered`, `cancelled`
- `order.total` — total calculado en centavos/unidad monetaria
- `order.notes` — notas del cliente o del dueño
- `order.metadata` (JSONB) — extensiones: costo de envío, datos del método de pago, etc.
- `order.created_at`, `order.updated_at`
- `order_item.id` — UUID
- `order_item.order_id` — UUID
- `order_item.store_id` — UUID
- `order_item.product_id` — UUID
- `order_item.variant_id` — UUID (nullable; si módulo variants activo)
- `order_item.quantity` — entero positivo
- `order_item.unit_price` — precio unitario al momento del pedido (snapshot, no referencia dinámica)
- `order_item.product_name` — snapshot del nombre al momento del pedido

### Relationships
- Un `order` pertenece a una `store`
- Un `order` tiene muchos `order_items`
- Un `order` pertenece a un `customer` (puede existir sin customer si se carga sin datos del comprador)
- Un `order_item` referencia un `product` (snapshot de precio y nombre)
- Un `order` puede tener `payments` asociados (módulo payments)

### External reads
- `products.price`, `products.name` — para snapshot al crear order_items (lectura directa controlada)
- `customers` — para buscar o crear customer por teléfono antes de crear el order

## Actions

### `create_order`
- **Actor:** user, system
- **requires:** [`orders`]
- **permissions:** owner, admin, system
- **input:** `{ items: [{ product_id, quantity, unit_price, product_name, variant_id? }], customer_id?, customer_phone?, customer_name?, notes?, metadata? }`
- **output:** `order` creado con `order_items`
- **errors:** `MODULE_INACTIVE`, `LIMIT_EXCEEDED` (max_orders), `INVALID_INPUT`, `NOT_FOUND` (product inválido), `STORE_INACTIVE`, `UNAUTHORIZED`
- **nota:** si se pasa `customer_phone` sin `customer_id`, el sistema busca el customer por teléfono o crea uno nuevo.

### `update_order_status`
- **Actor:** user
- **requires:** [`orders`]
- **permissions:** owner, admin
- **input:** `{ order_id, status }`
- **output:** `order` con status actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `CONFLICT` (transición de estado inválida), `UNAUTHORIZED`

### `update_order`
- **Actor:** user
- **requires:** [`orders`]
- **permissions:** owner, admin
- **input:** `{ order_id, notes?, metadata? }`
- **output:** `order` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `cancel_order`
- **Actor:** user
- **requires:** [`orders`]
- **permissions:** owner, admin
- **input:** `{ order_id, reason? }`
- **output:** `order` con status `cancelled`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `CONFLICT` (pedido ya en `delivered` no puede cancelarse), `UNAUTHORIZED`

### `get_order`
- **Actor:** user
- **requires:** [`orders`]
- **permissions:** owner, admin, collaborator
- **input:** `{ order_id }`
- **output:** `order` con `order_items` y `customer`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `list_orders`
- **Actor:** user
- **requires:** [`orders`]
- **permissions:** owner, admin, collaborator
- **input:** `{ status?, customer_id?, date_from?, date_to?, page?, limit? }`
- **output:** `{ items: order[], total, page, limit }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

## UI Components

- `OrderList` — listado de pedidos con filtros de estado y fecha
- `OrderCard` — tarjeta de pedido con resumen y acciones rápidas
- `OrderDetail` — vista detallada del pedido con ítems, cliente y estado
- `OrderStatusStepper` — indicador visual del estado del pedido
- `OrderStatusSelect` — selector de estado con validación de transiciones
- `OrderItemList` — lista de productos del pedido con cantidades y precios

## Constraints

- Transiciones de estado válidas:
  - `pending` → `confirmed`, `cancelled`
  - `confirmed` → `preparing`, `cancelled`
  - `preparing` → `delivered`, `cancelled`
  - `delivered` → (terminal, sin más transiciones)
  - `cancelled` → (terminal, sin más transiciones)
- `unit_price` es un snapshot: se guarda el precio al momento del pedido. Cambios futuros de precio no afectan pedidos existentes.
- `product_name` también es un snapshot. Si el producto se renombra, el pedido conserva el nombre original.
- `max_orders` aplica sobre pedidos creados en el período activo (mes calendario). El límite se verifica al crear.
- Un pedido con `delivered` o `cancelled` no puede modificarse en sus ítems ni en su status.
- Módulo `orders` requerido activo para cualquier acción de este módulo (excepto lectura del superadmin).

## Edge Cases

- **Pedido con producto eliminado:** los `order_items` conservan snapshot de nombre y precio. El `product_id` puede quedar huérfano si el producto fue eliminado físicamente (no aplica con soft delete).
- **Límite de `max_orders` alcanzado a mitad de mes:** el dueño ve un error al intentar crear un nuevo pedido. Puede actualizar su plan para aumentar el límite.
- **Crear order sin customer:** válido para pedidos cargados manualmente sin datos del comprador. El campo `customer_id` queda null.
- **Módulo `payments` activo:** al crear o actualizar un order, puede haber pagos asociados. La conciliación entre order y payment es responsabilidad del módulo payments; orders solo provee el `order_id`.
- **Módulo `stock` activo:** al confirmar un pedido, el módulo stock debe ser notificado para descontar unidades. Esta interacción es via action pública del módulo stock (`process_stock_deduction`).

## Future Extensions

- Notificaciones automáticas al cliente cuando cambia el estado del pedido.
- Pedidos recurrentes (mismo pedido replicable).
- Exportar historial de pedidos a CSV.
- Vista de cocina/preparación para negocios de gastronomía.
