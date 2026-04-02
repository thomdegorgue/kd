# Module: product_page

## Purpose

Habilita una página de detalle dedicada por producto en la vitrina pública.

Sin este módulo, los productos solo se muestran en la grilla del catálogo. Con el módulo activo, cada producto tiene su propia URL con descripción extendida, galería de imágenes, y más información para el cliente.

## Dependencies

- `catalog` — product_page pertenece a una tienda resuelta
- `products` — extiende la visualización de cada producto con una página propia

## Data Impact

### Entities owned
- No crea tablas propias. Agrega campos extendidos en `product.metadata` (JSONB bajo key `page`).

### Fields
- `product.metadata.page` (JSONB):
  - `extended_description` — descripción larga con formato rich text (markdown)
  - `additional_images` — array de URLs de imágenes adicionales (Cloudinary)
  - `specs` — array de `{ label, value }` para especificaciones técnicas
  - `faq` — array de `{ question, answer }` para preguntas frecuentes
  - `seo_title` — título SEO de la página del producto
  - `seo_description` — descripción SEO

### Relationships
- Extiende `product.metadata`; no tiene tabla propia.

### External reads
- `products` — lee los datos base del producto (nombre, precio, imagen_url) para construir la página completa

## Actions

### `update_product_page`
- **Actor:** user, ai
- **requires:** [`product_page`]
- **permissions:** owner, admin, ai
- **input:** `{ product_id, extended_description?, additional_images?, specs?, faq?, seo_title?, seo_description? }`
- **output:** `product.metadata.page` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND` (product inválido), `INVALID_INPUT`, `UNAUTHORIZED`

### `get_product_page`
- **Actor:** user, system
- **requires:** [`product_page`]
- **permissions:** owner, admin, system
- **input:** `{ product_id }`
- **output:** datos base del producto + `metadata.page`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`

## UI Components

- `ProductPageView` — vista pública de la página de producto (imagen grande, descripción, specs, FAQ)
- `ProductImageGallery` — galería de imágenes adicionales con lightbox
- `ProductSpecsTable` — tabla de especificaciones técnicas
- `ProductFAQ` — acordeón de preguntas frecuentes
- `ProductPageForm` — formulario de edición de la página del producto en el panel

## Constraints

- `additional_images` máximo 10 imágenes adicionales por producto.
- `specs` máximo 20 ítems de especificaciones.
- `faq` máximo 15 preguntas.
- `extended_description` máximo 10.000 caracteres.
- Si el módulo está inactivo, los productos no tienen URL propia; los links a producto redirigen al catálogo general.

## Edge Cases

- **Producto sin page configurada con módulo activo:** muestra la página de producto con solo los datos base (nombre, precio, descripción corta, imagen principal). Es una degradación elegante.
- **SEO title vacío:** se usa el nombre del producto como fallback para el `<title>` de la página.
- **Imagen adicional inválida:** se valida que sea URL de Cloudinary del tenant antes de guardar.

## Future Extensions

- Videos de producto.
- Reseñas y calificaciones de clientes.
- Productos relacionados o sugeridos.
- Compartir página de producto en redes.
