# Module: banners

## Purpose

Habilita la gestión de banners visuales en la vitrina pública de la tienda.

El dueño puede cargar imágenes para destacar promociones, novedades o productos específicos. Los banners aparecen en la portada de la vitrina como un carousel o sección destacada.

## Dependencies

- `catalog` — banners pertenecen a una tienda resuelta

## Data Impact

### Entities owned
- `banner` — el módulo banners es el único que escribe en la tabla `banners`

### Fields
- `banner.id` — UUID
- `banner.store_id` — UUID
- `banner.image_url` — URL de la imagen (Cloudinary, path `kitdigital/{store_id}/banners/*`)
- `banner.title` — texto superpuesto opcional
- `banner.subtitle` — subtexto opcional
- `banner.link_url` — URL de destino al hacer click (opcional; puede ser link interno a categoría o producto)
- `banner.is_active` — si el banner está visible
- `banner.sort_order` — orden de aparición en el carousel
- `banner.created_at`, `banner.updated_at`

### Relationships
- Un `banner` pertenece a una `store`

### External reads
- Ninguno.

## Actions

### `create_banner`
- **Actor:** user
- **requires:** [`banners`]
- **permissions:** owner, admin
- **input:** `{ image_url, title?, subtitle?, link_url?, is_active?, sort_order? }`
- **output:** `banner` creado
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT`, `UNAUTHORIZED`

### `update_banner`
- **Actor:** user
- **requires:** [`banners`]
- **permissions:** owner, admin
- **input:** `{ banner_id, image_url?, title?, subtitle?, link_url?, is_active?, sort_order? }`
- **output:** `banner` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `delete_banner`
- **Actor:** user
- **requires:** [`banners`]
- **permissions:** owner, admin
- **input:** `{ banner_id }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `list_banners`
- **Actor:** user, system
- **requires:** [`banners`]
- **permissions:** owner, admin, system
- **input:** `{ is_active? }`
- **output:** `{ items: banner[] }`
- **errors:** `MODULE_INACTIVE`

### `reorder_banners`
- **Actor:** user
- **requires:** [`banners`]
- **permissions:** owner, admin
- **input:** `{ ordered_ids: UUID[] }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

## UI Components

- `BannerCarousel` — carousel de banners en la portada de la vitrina
- `BannerForm` — formulario de creación y edición con upload de imagen
- `BannerList` — listado de banners con drag-and-drop para reordenar
- `BannerPreview` — vista previa del banner antes de publicar

## Constraints

- `image_url` debe ser URL de Cloudinary del path `kitdigital/{store_id}/banners/*`.
- Máximo 10 banners activos por tienda (límite operativo para no degradar la vitrina).
- Un banner con `is_active: false` no aparece en la vitrina.
- Si no hay banners activos, la sección de banners no aparece en la vitrina.

## Edge Cases

- **Banner con link a producto eliminado:** el `link_url` es texto libre; si apunta a un producto que ya no existe, el cliente verá un 404. Responsabilidad del dueño mantener los links actualizados.
- **Imagen demasiado pesada:** el control de tamaño de archivo se hace en el cliente antes de subir. Cloudinary también aplica transformaciones.

## Future Extensions

- Banners con fecha de inicio y fin de vigencia (programación).
- Banners por categoría (aparecer solo cuando el cliente navega esa categoría).
- Video corto como banner.
