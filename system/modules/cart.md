# Module: cart

## Purpose

Gestiona la experiencia del carrito de compras del cliente final en la vitrina pública.

El carrito no procesa pagos. Su única función es permitir al cliente seleccionar productos, armar su pedido, y derivarlo a WhatsApp con un mensaje preformateado que incluye el detalle completo.

El carrito es stateless en el backend: vive enteramente en el cliente (sessionStorage o localStorage). El backend solo participa en la generación del mensaje final y, si el módulo `orders` está activo, en el registro opcional del pedido.

Este módulo es parte del CORE.

## Dependencies

- `catalog` — necesita la tienda resuelta para generar el link de WhatsApp correcto
- `products` — lee productos activos para validar que los ítems del carrito existen y tienen precio vigente

## Data Impact

### Entities owned
- El carrito NO persiste en la base de datos. Es responsabilidad del cliente.
- Si el módulo `orders` está activo, al confirmar el carrito se crea un `order` — pero ese dato pertenece al módulo `orders`, no a cart.

### Fields
- Ningún campo propio en la DB. El estado del carrito vive en el cliente.

### Relationships
- Lee `products` para obtener nombre, precio e imagen al momento de generar el mensaje
- Lee `shipping_methods` si el módulo `shipping` está activo (para incluir costo de envío)
- Interactúa con `orders` al confirmar (si módulo activo)

### External reads
- `products.name`, `products.price`, `products.image_url` — al generar el mensaje de WhatsApp
- `store.whatsapp` — número destino del mensaje
- `shipping_methods` — si módulo `shipping` activo, para calcular costo de envío (lectura directa controlada)

## Actions

### `generate_whatsapp_message`
- **Actor:** system (llamado desde el frontend público sin autenticación)
- **requires:** []
- **permissions:** system
- **input:** `{ store_id, items: [{ product_id, quantity, variant_id? }], shipping_method_id?, customer_name?, customer_notes? }`
- **output:** `{ whatsapp_url: string, message_text: string, total: number }`
- **errors:** `NOT_FOUND` (product_id inválido o inactivo), `INVALID_INPUT` (quantity <= 0), `STORE_INACTIVE`
- **nota:** esta action valida que todos los product_ids existen y están activos en la tienda. Calcula el total con precios vigentes. Si hay módulo `shipping` activo y se pasa `shipping_method_id`, incluye el costo de envío.

### `validate_cart_items`
- **Actor:** system
- **requires:** []
- **permissions:** system
- **input:** `{ store_id, items: [{ product_id, quantity, variant_id? }] }`
- **output:** `{ valid_items: [...], invalid_items: [...], warnings: [...] }`
- **errors:** `STORE_INACTIVE`
- **nota:** valida disponibilidad de stock si módulo `stock` activo, verifica precios actuales, detecta productos desactivados. Devuelve advertencias sin bloquear (ej: "precio cambió").

## UI Components

- `CartDrawer` — panel lateral deslizable con el carrito (Sheet)
- `CartItem` — ítem individual en el carrito con cantidad, precio y controles
- `CartSummary` — resumen total del carrito
- `CartButton` — botón flotante con badge de cantidad (presente en toda la vitrina)
- `WhatsAppCheckoutButton` — botón final que abre WhatsApp con el mensaje generado
- `CartEmpty` — estado vacío del carrito
- `ShippingSelector` — selector de método de envío (si módulo shipping activo)

## Constraints

- El carrito no se persiste en la base de datos. Si el cliente cierra el navegador, pierde el carrito.
- `quantity` mínima por ítem: 1. No se permiten cantidades decimales.
- El precio usado en el total es el precio vigente al momento de generar el mensaje de WhatsApp, no el precio al momento de agregar al carrito.
- Si un producto se desactiva mientras el cliente tiene el carrito abierto, `validate_cart_items` lo marca como inválido.
- El módulo `cart` no valida el stock disponible a menos que el módulo `stock` esté activo.
- El número de `whatsapp` de la tienda debe estar configurado; si no lo está, el botón de checkout queda deshabilitado con mensaje de aviso.

## Edge Cases

- **Producto sin precio (price: 0):** válido. Se incluye en el mensaje como "Precio: Consultar" o "Gratuito" según config.
- **Carrito con producto que cambió de precio:** `validate_cart_items` detecta el cambio y devuelve un `warning`. La UI muestra una notificación al cliente. El total se recalcula con el precio nuevo.
- **Cliente en móvil sin WhatsApp instalado:** el `whatsapp_url` usa el esquema `https://wa.me/...` que funciona en web y en app. Si no tiene WhatsApp, el navegador muestra el mensaje de instalación (comportamiento del SO, no del sistema).
- **Módulo `orders` activo:** al confirmar el carrito (generar URL de WhatsApp), opcionalmente se registra un `order` en estado `pending` automáticamente. Esto es una action de `orders`, invocada desde el frontend después de `generate_whatsapp_message`.
- **Variantes activas:** si el módulo `variants` está activo, el ítem puede tener `variant_id`. El precio y stock del variant prevalecen sobre los del producto base.

## Future Extensions

- Opción de guardar el carrito en cuenta si el cliente tiene sesión.
- Carrito compartible por URL.
- Checkout propio con pago online (futura fase, decisión DEC-003 revisable).
- Confirmación automática del pedido sin intervención del dueño.
