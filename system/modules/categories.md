# Module: categories

## Purpose

Gestiona la organización de productos en grupos lógicos dentro de una tienda.

Las categorías permiten al cliente navegar la vitrina de forma estructurada. El dueño las crea, nombra y ordena. Los productos se asignan a categorías para aparecer organizados en el catálogo.

Este módulo es parte del CORE.

## Dependencies

- `catalog` — las categorías pertenecen a una tienda resuelta
- `products` — los productos se asignan a categorías (pero categories no escribe en products; la asignación vive en la tabla de relación)

## Data Impact

### Entities owned
- `category` — entidad principal; categories es el único módulo que escribe en la tabla `categories`
- `product_categories` — tabla de relación N:M entre products y categories; ownership compartido con products para lecturas, pero categories gestiona la integridad de la relación desde su lado

### Fields
- `category.id` — UUID, clave primaria
- `category.store_id` — UUID, referencia a `stores.id`
- `category.name` — nombre visible de la categoría (requerido)
- `category.description` — descripción opcional
- `category.image_url` — imagen representativa opcional (Cloudinary)
- `category.is_active` — si la categoría está visible en la vitrina (default: true)
- `category.sort_order` — orden de aparición en la vitrina
- `category.created_at`, `category.updated_at`

### Relationships
- Una `category` pertenece a una `store`
- Una `category` tiene muchos `products` vía `product_categories`
- Un `product` puede pertenecer a muchas `categories`

### External reads
- `products` — para contar cuántos productos tiene una categoría (lectura directa controlada sobre `product_categories`)

## Actions

### `create_category`
- **Actor:** user, ai
- **requires:** []
- **permissions:** owner, admin, ai
- **input:** `{ name, description?, image_url?, is_active?, sort_order? }`
- **output:** `category` creada
- **errors:** `INVALID_INPUT`, `STORE_INACTIVE`, `UNAUTHORIZED`

### `update_category`
- **Actor:** user, ai
- **requires:** []
- **permissions:** owner, admin, ai
- **input:** `{ category_id, name?, description?, image_url?, is_active?, sort_order? }`
- **output:** `category` actualizada
- **errors:** `NOT_FOUND`, `INVALID_INPUT`, `UNAUTHORIZED`

### `delete_category`
- **Actor:** user
- **requires:** []
- **permissions:** owner, admin
- **input:** `{ category_id }`
- **output:** `{ success: true, data: { id } }`
- **errors:** `NOT_FOUND`, `UNAUTHORIZED`
- **nota:** al eliminar una categoría, los productos asignados a ella quedan sin esa categoría (se desvinculan). No se eliminan los productos.

### `list_categories`
- **Actor:** user, system
- **requires:** []
- **permissions:** owner, admin, collaborator, superadmin, system
- **input:** `{ is_active? }`
- **output:** `{ items: category[] }`
- **errors:** `UNAUTHORIZED`

### `list_categories_public`
- **Actor:** system (público)
- **requires:** []
- **permissions:** system
- **input:** `{ store_id }`
- **output:** `{ items: category[] }` solo categorías con `is_active: true` y al menos un producto activo
- **errors:** `NOT_FOUND`, `STORE_INACTIVE`

### `reorder_categories`
- **Actor:** user
- **requires:** []
- **permissions:** owner, admin
- **input:** `{ ordered_ids: UUID[] }`
- **output:** `{ success: true }`
- **errors:** `INVALID_INPUT`, `UNAUTHORIZED`

## UI Components

- `CategoryList` — listado de categorías con drag-and-drop para reordenar
- `CategoryForm` — formulario de creación y edición
- `CategoryCard` — tarjeta visual en la vitrina pública
- `CategoryFilter` — componente de filtro horizontal/vertical en la vitrina
- `CategoryBadge` — badge pequeño para mostrar la categoría de un producto

## Constraints

- `name` es obligatorio, mínimo 1 carácter, máximo 100.
- No hay límite de cantidad de categorías por tienda en el plan base.
- Una categoría eliminada no puede recuperarse. Los productos se desvinculan pero no se eliminan.
- Una categoría con `is_active: false` no aparece en la vitrina ni en el filtro público.
- En la vitrina pública solo se muestran categorías con al menos un producto activo.

## Edge Cases

- **Eliminar categoría usada en el carrito activo de un cliente:** el carrito es client-side; si el cliente tiene filtro activo por esa categoría, simplemente desaparece en su próxima actualización. No hay inconsistencia en backend.
- **Categoría sin productos:** válida en el panel de gestión. No aparece en la vitrina pública.
- **Reordenar con IDs incompletos:** si `ordered_ids` no incluye todas las categorías, solo se actualizan las indicadas; las demás conservan su `sort_order` actual.
- **Dos categorías con el mismo nombre:** permitido. No hay restricción de unicidad en el nombre (a diferencia del slug de tienda).

## Future Extensions

- Jerarquía de categorías (subcategorías).
- Imagen de portada por categoría visible en la vitrina como sección.
- Categorías destacadas con mayor visibilidad en la portada.
