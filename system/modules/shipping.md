# Module: shipping

## Purpose

Permite configurar métodos de envío para los pedidos de la tienda.

El dueño define las opciones disponibles: retiro en local, envío a domicilio, correo postal, etc. Cada opción puede tener un costo. El cliente selecciona el método en el carrito, y el costo de envío se suma al total del mensaje de WhatsApp.

## Dependencies

- `catalog` — shipping pertenece a una tienda
- `cart` — el carrito lee los métodos de envío disponibles para incluir el costo en el total
- `orders` — un pedido puede tener un método de envío asociado en su metadata

## Data Impact

### Entities owned
- `shipping_method` — el módulo shipping es el único que escribe en la tabla `shipping_methods`

### Fields
- `shipping_method.id` — UUID
- `shipping_method.store_id` — UUID
- `shipping_method.name` — nombre visible (ej: "Retiro en local", "Envío a domicilio")
- `shipping_method.description` — descripción opcional (tiempo estimado, zonas, etc.)
- `shipping_method.price` — costo en centavos/unidad monetaria (0 si es gratis)
- `shipping_method.is_active` — si está disponible para los clientes
- `shipping_method.sort_order` — orden de aparición en el selector
- `shipping_method.created_at`, `shipping_method.updated_at`

### Relationships
- Un `shipping_method` pertenece a una `store`
- Un `order` puede referenciar un `shipping_method` vía `order.metadata.shipping_method_id`

### External reads
- Ninguno.

## Actions

### `create_shipping_method`
- **Actor:** user
- **requires:** [`shipping`]
- **permissions:** owner, admin
- **input:** `{ name, price, description?, is_active?, sort_order? }`
- **output:** `shipping_method` creado
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT`, `UNAUTHORIZED`

### `update_shipping_method`
- **Actor:** user
- **requires:** [`shipping`]
- **permissions:** owner, admin
- **input:** `{ shipping_method_id, name?, price?, description?, is_active?, sort_order? }`
- **output:** `shipping_method` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `INVALID_INPUT`, `UNAUTHORIZED`

### `delete_shipping_method`
- **Actor:** user
- **requires:** [`shipping`]
- **permissions:** owner, admin
- **input:** `{ shipping_method_id }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `list_shipping_methods`
- **Actor:** user, system
- **requires:** [`shipping`]
- **permissions:** owner, admin, collaborator, system
- **input:** `{ is_active? }`
- **output:** `{ items: shipping_method[] }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

## UI Components

- `ShippingMethodForm` — formulario de creación y edición
- `ShippingMethodList` — listado con ordenamiento en el panel de gestión
- `ShippingSelector` — selector en el carrito del cliente (radio buttons o lista)
- `ShippingCostBadge` — indicador del costo de envío seleccionado en el resumen del carrito

## Constraints

- `price` >= 0. El valor 0 es envío gratuito.
- Un método con `is_active: false` no aparece en el carrito del cliente.
- No hay límite de cantidad de métodos de envío por tienda.
- El costo de envío se suma al total calculado en `generate_whatsapp_message`; no es un campo del pedido por sí mismo sino parte del mensaje.

## Edge Cases

- **Ningún método de envío activo:** el selector no aparece en el carrito. El mensaje de WhatsApp no incluye costo de envío.
- **Solo un método activo:** el selector puede simplificarse en la UI a mostrar el único método sin interacción.
- **Cambio de precio de método después de armar carrito:** el precio se toma al momento de `generate_whatsapp_message`, no cuando el cliente seleccionó el método.

## Future Extensions

- Envío con precio variable por zona (código postal).
- Integración con correos (OCA, Andreani) para calcular precio en tiempo real.
- Envío gratis a partir de cierto monto de compra.
