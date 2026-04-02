# Module: wholesale

## Purpose

Permite definir una lista de precios diferenciada para clientes mayoristas.

El dueño configura un precio mayorista por producto. Los clientes mayoristas acceden a una sección especial de la vitrina con precios diferenciados, protegida por una clave de acceso o URL especial.

## Dependencies

- `catalog` — wholesale pertenece a una tienda
- `products` — los precios mayoristas se definen sobre productos existentes

## Data Impact

### Entities owned
- `wholesale_price` — precio mayorista por producto (o por variant si módulo variants activo)

### Fields
- `wholesale_price.id` — UUID
- `wholesale_price.store_id` — UUID
- `wholesale_price.product_id` — UUID
- `wholesale_price.variant_id` — UUID nullable
- `wholesale_price.price` — precio mayorista (debe ser <= precio minorista por convención, pero no forzado)
- `wholesale_price.min_quantity` — cantidad mínima para acceder al precio mayorista (default: 1)
- `wholesale_price.created_at`, `wholesale_price.updated_at`
- `store.config.wholesale_access_key` — clave de acceso mayorista (en JSONB de config)
- `store.config.wholesale_enabled` — boolean, si la sección mayorista está visible

### Relationships
- Un `wholesale_price` pertenece a un `product`
- Un `wholesale_price` pertenece a una `store`

### External reads
- `products.price` — precio minorista base para mostrar comparativa en el panel

## Actions

### `set_wholesale_price`
- **Actor:** user
- **requires:** [`wholesale`]
- **permissions:** owner, admin
- **input:** `{ product_id, price, min_quantity?, variant_id? }`
- **output:** `wholesale_price` creado o actualizado (upsert por product_id/variant_id)
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND` (product inválido), `INVALID_INPUT` (price < 0), `UNAUTHORIZED`

### `delete_wholesale_price`
- **Actor:** user
- **requires:** [`wholesale`]
- **permissions:** owner, admin
- **input:** `{ product_id, variant_id? }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `list_wholesale_prices`
- **Actor:** user
- **requires:** [`wholesale`]
- **permissions:** owner, admin
- **input:** `{}`
- **output:** `{ items: wholesale_price[] }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

### `update_wholesale_config`
- **Actor:** user
- **requires:** [`wholesale`]
- **permissions:** owner, admin
- **input:** `{ access_key?, enabled? }`
- **output:** `store.config` actualizado
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

### `get_wholesale_catalog_public`
- **Actor:** system (con clave de acceso válida)
- **requires:** [`wholesale`]
- **permissions:** system
- **input:** `{ store_id, access_key }`
- **output:** `{ items: product[] }` con `wholesale_price` incluido
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED` (clave inválida), `STORE_INACTIVE`

## UI Components

- `WholesalePriceInput` — campo de precio mayorista en la vista de edición de producto
- `WholesalePriceList` — listado de productos con precios mayoristas
- `WholesaleAccessGate` — pantalla de ingreso de clave de acceso mayorista
- `WholesaleProductCard` — variante de ProductCard con precio mayorista destacado
- `WholesaleConfigPanel` — panel para configurar clave y visibilidad

## Constraints

- La clave de acceso debe tener mínimo 4 caracteres.
- Si `wholesale_enabled: false`, la sección mayorista no es accesible aunque exista clave.
- `min_quantity` mínimo: 1.
- Un producto puede tener un solo `wholesale_price` por `(product_id, variant_id)`.

## Edge Cases

- **Producto sin precio mayorista en la vista mayorista:** se muestra con su precio minorista normal.
- **Clave vacía:** si la tienda no configuró clave, la sección mayorista está deshabilitada.
- **Cambio de clave con clientes activos:** el cambio es inmediato. Los clientes que tengan la URL activa con la clave anterior pierden acceso hasta tener la nueva.

## Future Extensions

- Clientes mayoristas con cuenta propia (login) en lugar de clave compartida.
- Descuentos por volumen (precio escalonado según cantidad).
- Listas de precios múltiples (distribuidores, revendedores, etc.).
