# Module: variants

## Purpose

Permite que un producto tenga múltiples variantes definidas por atributos como talle, color, tamaño, sabor u otros.

Cada variante puede tener su propio precio y su propio stock (si el módulo `stock` está activo). El cliente selecciona la variante antes de agregar al carrito.

## Dependencies

- `catalog` — variantes pertenecen a una tienda
- `products` — las variantes extienden un producto existente
- `stock` — si activo, el stock se gestiona por variant en lugar de por producto base

## Data Impact

### Entities owned
- `variant` — el módulo variants es el único que escribe en la tabla `variants`
- `variant_attribute` — define los atributos posibles (ej: "Talle", "Color")
- `variant_value` — valores de cada atributo por variante (ej: "M", "Rojo")

### Fields
- `variant.id` — UUID
- `variant.store_id` — UUID
- `variant.product_id` — UUID, referencia a `products.id`
- `variant.price` — precio propio de la variante (nullable; si null, usa el precio del producto base)
- `variant.sku` — código interno opcional
- `variant.is_active` — si la variante está disponible
- `variant.sort_order` — orden de aparición
- `variant.created_at`, `variant.updated_at`
- `variant_attribute.id`, `variant_attribute.store_id`, `variant_attribute.product_id`, `variant_attribute.name` (ej: "Talle")
- `variant_value.id`, `variant_value.variant_id`, `variant_value.attribute_id`, `variant_value.value` (ej: "M")

### Relationships
- Un `variant` pertenece a un `product`
- Un `variant` tiene muchos `variant_values`
- Cada `variant_value` referencia un `variant_attribute`
- Un `variant` puede tener un `stock_item` (módulo stock)

### External reads
- `products.price` — precio base del producto para usar como fallback cuando `variant.price` es null

## Actions

### `create_variant`
- **Actor:** user, ai
- **requires:** [`variants`]
- **permissions:** owner, admin, ai
- **input:** `{ product_id, price?, sku?, is_active?, attributes: [{ name, value }] }`
- **output:** `variant` creado con `variant_values`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND` (product inválido), `INVALID_INPUT`, `UNAUTHORIZED`

### `update_variant`
- **Actor:** user
- **requires:** [`variants`]
- **permissions:** owner, admin
- **input:** `{ variant_id, price?, sku?, is_active?, sort_order? }`
- **output:** `variant` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `delete_variant`
- **Actor:** user
- **requires:** [`variants`]
- **permissions:** owner, admin
- **input:** `{ variant_id }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `CONFLICT` (variante con pedidos activos), `UNAUTHORIZED`

### `list_variants`
- **Actor:** user, system
- **requires:** [`variants`]
- **permissions:** owner, admin, collaborator, system
- **input:** `{ product_id, is_active? }`
- **output:** `{ items: variant[] }` con atributos incluidos
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

## UI Components

- `VariantSelector` — selector de variante en la vitrina (botones o dropdown por atributo)
- `VariantForm` — formulario para crear/editar una variante
- `VariantList` — listado de variantes de un producto en el panel
- `VariantMatrix` — vista matricial de atributos y variantes resultantes

## Constraints

- Cada combinación de atributos dentro de un producto debe ser única.
- Si `variant.price` es null, el precio del producto base se usa como precio de la variante.
- Si el módulo `stock` está activo, el stock se gestiona por variant individual. El stock del producto base (`product_id` sin `variant_id`) se ignora.
- Una variante con `is_active: false` no aparece en el selector de la vitrina.
- No se puede eliminar una variante que tenga pedidos en estado activo.

## Edge Cases

- **Producto base con variantes activas:** el precio del producto base se convierte en fallback; no se muestra directamente en la vitrina si hay variantes activas.
- **Deshabilitar módulo `variants` con variantes existentes:** los datos se conservan. Los `order_items` anteriores que referencian `variant_id` mantienen su integridad. Los nuevos pedidos no pueden seleccionar variante.
- **Módulo `stock` activo:** si una variante tiene stock en 0 y `track_stock: true`, esa variante aparece como no disponible en el selector.

## Future Extensions

- Generación automática de variantes desde una matriz de atributos (ej: 3 talles × 4 colores = 12 variantes).
- Imagen específica por variante.
- Precio por combinación de atributos (no solo por variante plana).
