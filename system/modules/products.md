# Module: products

## Purpose

Gestiona el ciclo de vida completo de los productos de una tienda: creación, edición, publicación, ocultamiento y eliminación.

Un producto es la unidad central del catálogo. Todo lo que la tienda ofrece a la venta es un producto. Este módulo define qué datos tiene un producto, cómo se gestiona desde el panel del dueño, y qué acciones están disponibles sobre él.

Este módulo es parte del CORE y está activo en todas las tiendas.

## Dependencies

- `catalog` — un producto siempre pertenece a una tienda resuelta por catalog

## Data Impact

### Entities owned
- `product` — entidad principal del módulo; el módulo products es el único que escribe en la tabla `products`

### Fields
- `product.id` — UUID, clave primaria
- `product.store_id` — UUID, referencia a `stores.id`
- `product.name` — nombre del producto (requerido)
- `product.description` — descripción larga (opcional)
- `product.price` — precio base en centavos o unidad monetaria local (requerido, >= 0)
- `product.image_url` — URL principal de imagen (Cloudinary)
- `product.is_active` — si el producto está visible en la vitrina (default: true)
- `product.is_featured` — si aparece destacado en la vitrina (default: false)
- `product.sort_order` — orden de aparición en la vitrina (entero)
- `product.metadata` (JSONB) — extensiones de otros módulos (stock, variants, wholesale)
- `product.created_at` — timestamp de creación
- `product.updated_at` — timestamp de última modificación

### Relationships
- Un `product` pertenece a una `store` (via `store_id`)
- Un `product` puede pertenecer a una o muchas `categories` (relación N:M via tabla `product_categories`)
- Un `product` puede tener muchos `variants` (módulo variants)
- Un `product` puede tener stock asociado (módulo stock)
- Un `product` puede tener precio mayorista (módulo wholesale)

### External reads
- `categories` — para validar que `category_id` pertenece a la misma tienda al asignar categorías

## Actions

### `create_product`
- **Actor:** user, ai
- **requires:** []
- **permissions:** owner, admin, ai
- **input:** `{ name, price, description?, image_url?, category_ids?, is_active?, is_featured?, sort_order? }`
- **output:** `product` creado completo
- **errors:** `LIMIT_EXCEEDED` (max_products), `NOT_FOUND` (category_id inválida), `INVALID_INPUT`, `STORE_INACTIVE`, `UNAUTHORIZED`

### `update_product`
- **Actor:** user, ai
- **requires:** []
- **permissions:** owner, admin, ai
- **input:** `{ product_id, name?, price?, description?, image_url?, is_active?, is_featured?, sort_order? }`
- **output:** `product` actualizado
- **errors:** `NOT_FOUND`, `INVALID_INPUT`, `UNAUTHORIZED`, `STORE_INACTIVE`

### `delete_product`
- **Actor:** user
- **requires:** []
- **permissions:** owner, admin
- **input:** `{ product_id }`
- **output:** `{ success: true, data: { id } }`
- **errors:** `NOT_FOUND`, `UNAUTHORIZED`, `CONFLICT` (producto con pedidos activos asociados)
- **nota:** eliminación lógica; el producto se marca como inactivo y se oculta. No se elimina físicamente si tiene historial de pedidos.

### `get_product`
- **Actor:** user, system
- **requires:** []
- **permissions:** owner, admin, collaborator, superadmin, system
- **input:** `{ product_id }`
- **output:** `product` completo
- **errors:** `NOT_FOUND`, `UNAUTHORIZED`

### `list_products`
- **Actor:** user, system
- **requires:** []
- **permissions:** owner, admin, collaborator, superadmin, system
- **input:** `{ is_active?, category_id?, page?, limit?, sort? }`
- **output:** `{ items: product[], total, page, limit }`
- **errors:** `UNAUTHORIZED`

### `list_products_public`
- **Actor:** system (público sin autenticación)
- **requires:** []
- **permissions:** system
- **input:** `{ store_id, category_id?, is_featured?, page?, limit? }`
- **output:** `{ items: product[], total }` (solo productos con `is_active: true`)
- **errors:** `NOT_FOUND` (store no existe), `STORE_INACTIVE`

### `assign_product_categories`
- **Actor:** user
- **requires:** []
- **permissions:** owner, admin
- **input:** `{ product_id, category_ids: UUID[] }`
- **output:** `product` con categorías actualizadas
- **errors:** `NOT_FOUND` (product o categoría inválida), `UNAUTHORIZED`

### `reorder_products`
- **Actor:** user
- **requires:** []
- **permissions:** owner, admin
- **input:** `{ ordered_ids: UUID[] }` — lista de product_ids en el orden deseado
- **output:** `{ success: true }`
- **errors:** `INVALID_INPUT`, `UNAUTHORIZED`

## UI Components

- `ProductCard` — tarjeta de producto para la vitrina pública (imagen, nombre, precio, botón agregar)
- `ProductCardAdmin` — versión del panel de gestión con acciones (editar, ocultar, eliminar)
- `ProductForm` — formulario de creación y edición de producto
- `ProductList` — listado de productos con filtros y ordenamiento
- `ProductImageUpload` — componente de upload de imagen a Cloudinary
- `ProductStatusToggle` — switch rápido activo/inactivo
- `ProductFeaturedToggle` — switch de producto destacado

## Constraints

- `price` debe ser >= 0. El valor 0 es válido (producto gratuito o consultar precio).
- `name` es obligatorio, mínimo 1 carácter, máximo 200.
- `description` máximo 2000 caracteres.
- El límite `max_products` aplica sobre productos con `is_active: true`. Los productos inactivos no cuentan contra el límite.
- Una tienda en estado `past_due` no puede crear nuevos productos. Solo puede editar los existentes.
- Una tienda en `demo` tiene `max_products: 10` como límite por defecto.
- `image_url` debe ser una URL de Cloudinary del path `kitdigital/{store_id}/products/*`.
- Un producto con `is_active: false` no aparece en la vitrina pública ni en el carrito.

## Edge Cases

- **Producto con pedidos activos siendo eliminado:** si el producto tiene pedidos en estado `pending` o `confirmed`, la eliminación devuelve `CONFLICT`. El dueño debe cancelar los pedidos primero o esperar a que se completen.
- **Actualizar precio con carrito activo de cliente:** el carrito es del lado del cliente (sessionStorage/localStorage); el precio se toma al momento de armar el mensaje de WhatsApp, no al agregar al carrito. No hay inconsistencia de precio en backend.
- **Límite alcanzado con productos inactivos:** si `max_products` está en 10 y hay 8 activos y 5 inactivos, crear uno nuevo cuenta contra los 8 activos y lo permite. Reactivar uno inactivo puede bloquearse si sumaría 9 activos (dentro del límite).
- **category_ids vacío al asignar:** si se llama `assign_product_categories` con `category_ids: []`, se desvinculan todas las categorías del producto (operación válida).
- **Producto sin imagen:** válido. La UI muestra un placeholder.

## Future Extensions

- Múltiples imágenes por producto (galería).
- Importación masiva de productos via CSV.
- Duplicar producto como punto de partida para uno nuevo.
- Productos digitales (con archivo adjunto para descarga).
