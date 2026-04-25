# Módulos del Sistema

---

## Grupos de Módulos

Los módulos se agrupan lógicamente para la landing page, el panel de billing y el onboarding. Esta agrupación es canónica — todo componente que liste módulos debe respetarla.

| Grupo | Tier | Módulos |
|-------|------|---------|
| Catálogo y Ventas | base | `catalog`, `products`, `categories`, `cart`, `orders`, `product_page`, `banners`, `social` |
| Operaciones | base | `stock`, `shipping`, `payments` |
| Dominio | base | `custom_domain` |
| Equipo | pro | `multiuser`, `tasks` |
| Comercial | pro | `variants`, `wholesale` |
| Finanzas | pro | `finance`, `expenses`, `savings_account` |
| IA | pro* | `assistant` |

> **\*IA — Plan Anual:** el módulo `assistant` es el único módulo pro **excluido** del plan anual. Siempre es add-on mensual, independientemente del billing_period.

**Totales:** 12 módulos base · 8 módulos pro (7 incluidos en anual + 1 solo mensual)

---

Este archivo debe contener la especificación completa de los 20 módulos. Por cada módulo incluir:

- **ID canónico**
- **Descripción** (1-2 líneas)
- **Dependencias** (de qué módulos depende)
- **Tablas que posee** (ownership)
- **Actions** (nombre, actor, requires, permissions, input resumido, output resumido, errores)
- **Componentes UI** (listado)
- **Restricciones**
- **Edge cases relevantes**

Los 20 módulos con su especificación completa son:

---

### Módulos CORE (siempre activos, no desactivables)

---

## 1. `catalog`

**Descripción:** Configuración pública de la tienda (nombre, logo, colores, WhatsApp, módulos activos). Es la raíz de todo — todos los demás módulos dependen de él.
**Depende de:** ninguno (raíz)
**Tablas que posee:** `stores` (campos de config pública: name, slug, logo_url, cover_url, whatsapp, description, config, modules)
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `get_store` | user | owner, admin, collaborator | — | — | `{ store_id }` | Store completo | NOT_FOUND |
| `get_store_public` | system | — | — | — | `{ slug }` | Store público (sin billing info) | NOT_FOUND |
| `update_store` | user | owner, admin | — | — | `{ name?, description?, whatsapp?, logo_url?, cover_url? }` | Store actualizado | INVALID_INPUT |
| `update_store_config` | user | owner, admin | — | — | `{ config: Partial<StoreConfig> }` | Store actualizado | INVALID_INPUT |
| `enable_module` | user | owner | — | — | `{ module: ModuleName }` | `{ modules }` actualizado | MODULE_INACTIVE, UNAUTHORIZED |
| `disable_module` | user | owner | — | — | `{ module: ModuleName }` | `{ modules }` actualizado | UNAUTHORIZED, CONFLICT (si módulo tiene datos activos) |

### Componentes UI
- `StoreSettingsForm` — formulario de configuración general de la tienda
- `ModuleToggleList` — lista de módulos con toggle enable/disable
- `StoreHeader` — header público del catálogo (logo, nombre, WhatsApp)
- `StoreCover` — imagen de portada del catálogo

### Restricciones
- No se puede desactivar un módulo CORE.
- `slug` es inmutable después de la creación.
- `whatsapp` debe estar en formato internacional sin `+` (ej: `5491123456789`).

### Edge cases
- `disable_module` sobre un módulo con datos activos (ej: productos con stock) debe advertir pero no bloquear — los datos permanecen, solo el módulo queda inaccesible.
- `get_store_public` bypasea RLS (usa service role) para rendir el catálogo sin autenticación.

---

## 2. `products`

**Descripción:** CRUD completo de productos. Es el catálogo central de la tienda.
**Depende de:** `catalog`
**Tablas que posee:** `products`
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_product` | user | owner, admin | — | max_products | `{ name, price, description?, image_url?, is_active?, is_featured?, sort_order? }` | Product creado | LIMIT_EXCEEDED, INVALID_INPUT |
| `update_product` | user | owner, admin | — | — | `{ id, name?, price?, description?, image_url?, is_active?, is_featured?, sort_order? }` | Product actualizado | NOT_FOUND, INVALID_INPUT |
| `delete_product` | user | owner, admin | — | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `get_product` | user | owner, admin, collaborator | — | — | `{ id }` | Product | NOT_FOUND |
| `list_products` | user | owner, admin, collaborator | — | — | `{ filters?, page?, pageSize? }` | `{ items, total }` | — |
| `list_products_public` | system | — | — | — | `{ store_id, category_id?, search? }` | Productos activos públicos | — |
| `reorder_products` | user | owner, admin | — | — | `{ ids: UUID[] }` | `{ updated: true }` | NOT_FOUND |

### Componentes UI
- `ProductList` — lista admin con DataTable, filtros, export CSV
- `ProductForm` — formulario crear/editar (con ImageUploader, ModuleGate para variants)
- `ProductCard` — card pública del catálogo
- `ProductGrid` — grid de cards del catálogo
- `ProductDetail` — página de detalle de producto (si módulo product_page activo)

### Restricciones
- `price` en centavos (entero). Nunca decimales en DB.
- Soft delete: `deleted_at` timestamp, nunca DELETE físico.
- `list_products_public` filtra `is_active = true AND deleted_at IS NULL`.

### Edge cases
- Al alcanzar `max_products`, bloquear `create_product` con `LIMIT_EXCEEDED`. Mostrar `PlanUpgradePrompt`.
- Productos con variantes activas no se pueden eliminar directamente — el módulo `variants` gestiona la restricción.

---

## 3. `categories`

**Descripción:** Agrupación de productos en categorías. Soporta drag-and-drop para reordenar.
**Depende de:** `catalog`
**Tablas que posee:** `categories`, `product_categories`
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_category` | user | owner, admin | — | — | `{ name, description?, image_url?, is_active? }` | Category creada | INVALID_INPUT |
| `update_category` | user | owner, admin | — | — | `{ id, name?, description?, image_url?, is_active? }` | Category actualizada | NOT_FOUND |
| `delete_category` | user | owner, admin | — | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_categories` | user | owner, admin, collaborator | — | — | `{}` | Category[] | — |
| `list_categories_public` | system | — | — | — | `{ store_id }` | Categorías activas | — |
| `reorder_categories` | user | owner, admin | — | — | `{ ids: UUID[] }` | `{ updated: true }` | NOT_FOUND |
| `assign_product_category` | user | owner, admin | — | — | `{ product_id, category_id }` | `{ assigned: true }` | NOT_FOUND |
| `remove_product_category` | user | owner, admin | — | — | `{ product_id, category_id }` | `{ removed: true }` | NOT_FOUND |

### Componentes UI
- `CategoryList` — lista admin con drag-and-drop reorder
- `CategoryForm` — formulario crear/editar
- `CategoryFilter` — filtro horizontal en catálogo público

### Restricciones
- Un producto puede pertenecer a múltiples categorías.
- Eliminar una categoría no elimina los productos, solo las asignaciones en `product_categories`.

### Edge cases
- Si se elimina la categoría activa en el filtro del catálogo, resetear el filtro a "Todos".

---

## 4. `cart`

**Descripción:** Carrito de compras 100% client-side. No tiene persistencia en DB. El cierre de venta es por WhatsApp.
**Depende de:** `catalog`, `products`
**Tablas que posee:** ninguna (estado en Zustand + localStorage)
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `generate_whatsapp_message` | system | — | — | — | `{ items, store_config, shipping_method?, customer_name?, customer_notes? }` | `{ message_text, whatsapp_url }` | INVALID_INPUT |
| `validate_cart_items` | system | — | — | — | `{ items: CartItem[], store_id }` | `{ valid_items, invalid_items }` | — |

### Componentes UI
- `CartDrawer` — drawer lateral con ítems del carrito
- `CartButton` — botón flotante con badge de cantidad
- `CartItem` — fila de ítem (nombre, cantidad, precio, variante)
- `WhatsAppCheckoutButton` — botón "Enviar pedido por WhatsApp"

### Restricciones
- Estado en Zustand, persistido en localStorage. Se reinicia al confirmar pedido.
- `validate_cart_items` verifica que los productos siguen activos y existen (puede haber cambios desde que se agregaron).
- No hay lógica de descuento ni cupones en el carrito.

### Edge cases
- Producto dado de baja entre que se agrega al carrito y se intenta comprar → `validate_cart_items` lo marca como inválido y lo saca del carrito con toast de advertencia.
- Si `shipping` está activo, el carrito muestra el selector de método de envío y lo incluye en el mensaje de WhatsApp.

---

## 5. `orders`

**Descripción:** Gestión de pedidos recibidos vía WhatsApp. El dueño los registra manualmente en el panel.
**Depende de:** `catalog`, `products`, `categories`
**Tablas que posee:** `orders`, `order_items`, `customers`
**Siempre activo:** sí

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_order` | user | owner, admin, collaborator | — | max_orders/mes | `{ items: [{product_id, variant_id?, quantity, unit_price, product_name}], customer?: {name, phone, email}, notes?, total }` | Order creado | LIMIT_EXCEEDED, INVALID_INPUT, NOT_FOUND |
| `update_order_status` | user | owner, admin, collaborator | — | — | `{ id, status }` | Order actualizado | NOT_FOUND, CONFLICT (transición inválida) |
| `update_order` | user | owner, admin | — | — | `{ id, notes? }` | Order actualizado | NOT_FOUND |
| `get_order` | user | owner, admin, collaborator | — | — | `{ id }` | Order + items + customer | NOT_FOUND |
| `list_orders` | user | owner, admin, collaborator | — | — | `{ status?, page?, pageSize?, date_from?, date_to? }` | `{ items, total }` | — |
| `cancel_order` | user | owner, admin | — | — | `{ id, reason? }` | Order actualizado | NOT_FOUND, CONFLICT |

### Componentes UI
- `OrderList` — lista admin con DataTable, filtros por estado y fecha
- `OrderForm` — formulario crear pedido (búsqueda de productos precargados, búsqueda de clientes)
- `OrderDetail` — detalle de pedido con timeline de estados
- `OrderStatusBadge` — badge de color por estado
- `PDFDownloadButton` — genera comprobante PDF

### Restricciones
- `order_items` son snapshots: `product_name` y `unit_price` se copian al momento de crear el pedido. Cambios posteriores en el producto no afectan pedidos existentes.
- `max_orders` se cuenta por mes calendario (no rolling 30 días).
- Transiciones válidas de estado: `pending → confirmed → preparing → delivered`. Cualquier estado no terminal → `cancelled`.
- No hay optimistic update en crear pedido. La validación server es necesaria.

### Edge cases
- Si `stock` está activo: `create_order` invoca `process_stock_deduction` dentro de la misma transacción. Si no hay stock suficiente, el pedido no se crea.
- Si `payments` está activo: el pedido muestra estado de pago y permite registrar cobros.

---

### Módulos Activables

---

## 6. `stock`

**Descripción:** Control de inventario por producto y variante.
**Depende de:** `products`
**Tablas que posee:** `stock_items`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `update_stock` | user | owner, admin, collaborator | stock | — | `{ product_id, variant_id?, quantity, track_stock?, low_stock_threshold? }` | stock_item actualizado | NOT_FOUND, INVALID_INPUT |
| `get_stock` | user | owner, admin, collaborator | stock | — | `{ product_id, variant_id? }` | stock_item | NOT_FOUND |
| `list_stock` | user | owner, admin, collaborator | stock | — | `{ low_stock_only? }` | stock_item[] | — |
| `process_stock_deduction` | system | — | stock | — | `{ items: [{product_id, variant_id?, quantity}], store_id }` | `{ deducted: true }` | CONFLICT (sin stock suficiente) |

### Componentes UI
- `StockList` — lista de items con nivel de stock, alertas de bajo stock
- `StockEditForm` — formulario inline de actualización
- `StockBadge` — indicador visual de stock en ProductList

### Restricciones
- Si `track_stock = false` para un item, `process_stock_deduction` lo ignora (producto sin control de stock).
- `quantity >= 0` enforceado en DB.

### Edge cases
- Al llegar a 0: emite evento `stock_depleted`. Mostrar alerta en dashboard.
- Si el módulo se desactiva, los `stock_items` permanecen en DB pero no se consultan ni deducen.

---

## 7. `payments`

**Descripción:** Registro manual de cobros del dueño a sus clientes. No involucra pasarela de pago.
**Depende de:** `orders`
**Tablas que posee:** `payments`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_payment` | user | owner, admin, collaborator | payments | — | `{ order_id, amount, method, notes?, mp_payment_id? }` | Payment creado | NOT_FOUND, INVALID_INPUT |
| `update_payment_status` | user | owner, admin | payments | — | `{ id, status }` | Payment actualizado | NOT_FOUND, CONFLICT |
| `list_payments` | user | owner, admin, collaborator | payments | — | `{ order_id?, status?, page?, pageSize? }` | `{ items, total }` | — |
| `get_payment` | user | owner, admin, collaborator | payments | — | `{ id }` | Payment | NOT_FOUND |

### Componentes UI
- `PaymentList` — lista de pagos con filtros
- `PaymentForm` — formulario registrar cobro
- `PaymentStatusBadge` — badge de estado de pago
- `PaymentMethodIcon` — ícono de método (efectivo, transferencia, etc.)

### Restricciones
- `method` enum: `cash`, `transfer`, `card`, `mp`, `other`.
- Un pedido puede tener múltiples pagos parciales (cuotas, señas).
- Distinto de `billing_payments` (que es el cobro de KitDigital al dueño).

### Edge cases
- Pago en exceso (suma de pagos > total del pedido): permitido, mostrar saldo a favor en UI.

---

## 8. `variants`

**Descripción:** Variantes de producto (talle, color, etc.). Un producto puede tener múltiples variantes, cada una con precio y SKU propios.
**Depende de:** `products`
**Tablas que posee:** `variants`, `variant_attributes`, `variant_values`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_variant_attribute` | user | owner, admin | variants | — | `{ product_id, name }` | variant_attribute creado | NOT_FOUND, INVALID_INPUT |
| `list_variant_attributes` | user | owner, admin, collaborator | variants | — | `{ product_id }` | variant_attribute[] | NOT_FOUND |
| `create_variant` | user | owner, admin | variants | — | `{ product_id, values: [{attribute_id, value}], price?, sku?, is_active? }` | variant creado | NOT_FOUND, INVALID_INPUT |
| `update_variant` | user | owner, admin | variants | — | `{ id, price?, sku?, is_active? }` | variant actualizado | NOT_FOUND |
| `delete_variant` | user | owner, admin | variants | — | `{ id }` | `{ deleted: true }` | NOT_FOUND, CONFLICT |
| `list_variants` | user | owner, admin, collaborator | variants | — | `{ product_id }` | variant[] con values | NOT_FOUND |

### Componentes UI
- `VariantManager` — UI de gestión de atributos y variantes por producto
- `VariantSelector` — selector en catálogo público (dropdown o botones por atributo)

### Restricciones
- Si un producto tiene variantes activas, el carrito requiere seleccionar variante antes de agregar.
- `delete_variant` falla si la variante tiene pedidos asociados.

### Edge cases
- Variante sin precio explícito → hereda el precio del producto padre.

---

## 9. `wholesale`

**Descripción:** Precios mayoristas por producto. Permite definir precios alternativos para clientes especiales.
**Depende de:** `products`
**Tablas que posee:** `wholesale_prices`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `set_wholesale_price` | user | owner, admin | wholesale | — | `{ product_id, price, min_quantity? }` | wholesale_price upserted | NOT_FOUND, INVALID_INPUT |
| `get_wholesale_price` | user | owner, admin, collaborator | wholesale | — | `{ product_id }` | wholesale_price | NOT_FOUND |
| `list_wholesale_prices` | user | owner, admin, collaborator | wholesale | — | `{}` | wholesale_price[] | — |

### Componentes UI
- `WholesalePriceForm` — formulario inline en ProductForm
- `WholesalePriceList` — lista de precios mayoristas exportable a CSV

### Restricciones
- Un precio mayorista por producto. Sin diferenciación por cliente (MVP).
- El precio mayorista no se muestra en el catálogo público.

### Edge cases
- Si el módulo se desactiva, los precios en DB persisten. Al reactivarlo, los datos están disponibles.

---

## 10. `shipping`

**Descripción:** Métodos de envío y seguimiento de envíos internos. El dueño configura métodos de envío (se muestran en el carrito) y puede crear envíos con link de seguimiento público para sus clientes.
**Depende de:** `catalog`, `orders`
**Tablas que posee:** `shipping_methods`, `shipments`
**Siempre activo:** no

### Actions — Métodos de envío

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_shipping_method` | user | owner, admin | shipping | — | `{ name, price, description?, is_active? }` | shipping_method creado | INVALID_INPUT |
| `update_shipping_method` | user | owner, admin | shipping | — | `{ id, name?, price?, description?, is_active? }` | shipping_method actualizado | NOT_FOUND |
| `delete_shipping_method` | user | owner, admin | shipping | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_shipping_methods` | user/system | todos | shipping | — | `{ store_id?, active_only? }` | shipping_method[] | — |

### Actions — Envíos con seguimiento

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_shipment` | user | owner, admin, collaborator | shipping | — | `{ order_id, shipping_method_id?, recipient_name?, recipient_phone?, notes? }` | shipment creado con `tracking_code` | NOT_FOUND, CONFLICT (pedido cancelado) |
| `update_shipment_status` | user | owner, admin, collaborator | shipping | — | `{ id, status }` | shipment actualizado | NOT_FOUND, CONFLICT (transición inválida) |
| `get_shipment` | user | owner, admin, collaborator | shipping | — | `{ id }` | shipment | NOT_FOUND |
| `get_shipment_public` | system | — | shipping | — | `{ tracking_code }` | shipment público (status, timeline, nombre tienda) | NOT_FOUND |
| `list_shipments` | user | owner, admin, collaborator | shipping | — | `{ order_id?, status?, page?, pageSize? }` | `{ items, total }` | — |

### Transiciones de estado de envío

| Estado | Descripción |
|--------|-------------|
| `preparing` | Envío creado, se está preparando el paquete. |
| `in_transit` | Paquete despachado, en camino al destinatario. |
| `delivered` | Entregado al destinatario. Estado terminal. |
| `cancelled` | Envío cancelado. Estado terminal. |

Transiciones válidas: `preparing → in_transit → delivered`. Cualquier estado no terminal → `cancelled`.
Al cambiar a `in_transit` se llena `shipped_at`. Al cambiar a `delivered` se llena `delivered_at`.

### Componentes UI
- `ShippingMethodList` — lista admin con toggle activo/inactivo
- `ShippingMethodForm` — formulario crear/editar
- `ShippingSelector` — selector en CartDrawer público
- `ShipmentList` — lista de envíos en panel admin con filtros por estado
- `ShipmentForm` — formulario rápido de creación (botón "Crear envío" en detalle de pedido)
- `ShipmentStatusBadge` — badge de estado con color
- `ShipmentTimeline` — timeline visual de estados (admin y público)
- `ShipmentTrackingLink` — botón para copiar link de seguimiento al portapapeles
- `TrackingPage` — landing pública de seguimiento (`/(public)/tracking/[code]`)

### Restricciones
- `price` de shipping_method en centavos. Puede ser 0 (envío gratis).
- El cart module incluye el shipping seleccionado en el mensaje de WhatsApp.
- `tracking_code` se genera automáticamente al crear: formato `KD-` + 6 caracteres alfanuméricos en mayúscula. Es único a nivel global.
- Un pedido puede tener múltiples envíos (envío parcial o re-envío).

### Edge cases
- Si no hay métodos activos y el módulo está activo, el carrito no muestra selector de envío (lo ignora silenciosamente).
- `get_shipment_public` bypasea RLS (service role). Solo expone datos mínimos: estado, timestamps de transiciones, nombre de la tienda. No expone notas internas ni datos del pedido.
- Si el módulo se desactiva, los envíos existentes permanecen en DB pero no se consultan. Los links de tracking públicos dejan de funcionar (retornan NOT_FOUND).
- Si el mensaje de WhatsApp incluye un envío con tracking, se agrega automáticamente el link de seguimiento.

---

## 11. `finance`

**Descripción:** Flujo de caja básico. Registra ingresos y egresos para ver la situación financiera de la tienda.
**Depende de:** `catalog`
**Tablas que posee:** `finance_entries`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_finance_entry` | user | owner, admin | finance | — | `{ type, amount, category, description?, order_id?, payment_id?, date? }` | finance_entry creada | INVALID_INPUT |
| `update_finance_entry` | user | owner, admin | finance | — | `{ id, amount?, category?, description? }` | finance_entry actualizada | NOT_FOUND |
| `delete_finance_entry` | user | owner, admin | finance | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_finance_entries` | user | owner, admin | finance | — | `{ type?, date_from?, date_to?, page?, pageSize? }` | `{ items, total }` | — |
| `get_finance_summary` | user | owner, admin | finance | — | `{ date_from, date_to }` | `{ income, expenses, net }` | — |

### Componentes UI
- `FinanceEntryList` — lista con DataTable y filtros de fecha/tipo
- `FinanceEntryForm` — formulario crear/editar entrada
- `FinanceSummaryCard` — tarjeta de resumen ingreso/egreso/neto
- `FinanceChart` — gráfico de barras mensual

### Restricciones
- `type` enum: `income`, `expense`.
- `amount > 0` siempre. El tipo determina si suma o resta.

### Edge cases
- Si `payments` está activo, los pagos confirmados pueden generar `finance_entries` automáticamente (integración opcional, configurable por el dueño).

---

## 12. `expenses`

**Descripción:** Egresos detallados con categorías específicas. Complementa `finance` con granularidad en los gastos.
**Depende de:** `catalog`, `finance`
**Tablas que posee:** `expenses`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_expense` | user | owner, admin | expenses | — | `{ amount, category, description, date?, receipt_url? }` | expense creado | INVALID_INPUT |
| `update_expense` | user | owner, admin | expenses | — | `{ id, amount?, category?, description?, receipt_url? }` | expense actualizado | NOT_FOUND |
| `delete_expense` | user | owner, admin | expenses | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_expenses` | user | owner, admin | expenses | — | `{ category?, date_from?, date_to?, page?, pageSize? }` | `{ items, total }` | — |
| `get_expenses_summary` | user | owner, admin | expenses | — | `{ date_from, date_to }` | `{ by_category, total }` | — |

### Componentes UI
- `ExpenseList` — lista con DataTable y filtros
- `ExpenseForm` — formulario con ImageUploader para comprobante
- `ExpenseSummaryChart` — gráfico de torta por categoría

### Restricciones
- `category` enum: `supplies`, `rent`, `services`, `marketing`, `equipment`, `salary`, `other`.
- `receipt_url` imagen opcional (via Cloudinary).

### Edge cases
- `get_expenses_summary` puede ser costoso para rangos grandes → cachear en Redis con TTL 2min e invalidar en cada mutación.

---

## 13. `savings_account`

**Descripción:** Cuentas de ahorro virtuales. El dueño puede organizar fondos por propósito (emergencias, inversión, impuestos).
**Depende de:** `catalog`
**Tablas que posee:** `savings_accounts`, `savings_movements`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_savings_account` | user | owner, admin | savings_account | — | `{ name, description?, target_amount? }` | savings_account creada | INVALID_INPUT |
| `update_savings_account` | user | owner, admin | savings_account | — | `{ id, name?, description?, target_amount? }` | savings_account actualizada | NOT_FOUND |
| `create_savings_movement` | user | owner, admin | savings_account | — | `{ account_id, type, amount, description? }` | savings_movement creado | NOT_FOUND, CONFLICT (retiro mayor al saldo) |
| `list_savings_accounts` | user | owner, admin | savings_account | — | `{}` | savings_account[] con saldo | — |
| `list_savings_movements` | user | owner, admin | savings_account | — | `{ account_id, page?, pageSize? }` | `{ items, total }` | NOT_FOUND |

### Componentes UI
- `SavingsAccountList` — lista de cuentas con saldo y progreso hacia meta
- `SavingsMovementForm` — formulario depósito/retiro
- `SavingsProgressBar` — barra de progreso hacia target_amount

### Restricciones
- `type` de movimiento: `deposit`, `withdrawal`.
- El saldo de una cuenta no puede ser negativo.

### Edge cases
- Saldo calculado en runtime (suma de movimientos), no almacenado en columna. Cachear si hay muchos movimientos.

---

## 14. `banners`

**Descripción:** Carrusel de imágenes promocionales en la portada del catálogo.
**Depende de:** `catalog`
**Tablas que posee:** `banners`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_banner` | user | owner, admin | banners | 10 activos | `{ image_url, title?, subtitle?, link_url?, is_active? }` | banner creado | LIMIT_EXCEEDED (>10 activos), INVALID_INPUT |
| `update_banner` | user | owner, admin | banners | — | `{ id, title?, subtitle?, link_url?, is_active? }` | banner actualizado | NOT_FOUND |
| `delete_banner` | user | owner, admin | banners | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_banners` | user/system | todos | banners | — | `{ active_only? }` | banner[] | — |
| `reorder_banners` | user | owner, admin | banners | — | `{ ids: UUID[] }` | `{ updated: true }` | NOT_FOUND |

### Componentes UI
- `BannerCarousel` — carrusel en catálogo público (autoplay, swipe)
- `BannerList` — lista admin con drag-and-drop reorder
- `BannerForm` — formulario con ImageUploader

### Restricciones
- Máximo 10 banners activos simultáneos.

### Edge cases
- Sin banners activos → el carrusel no se renderiza (no deja espacio vacío).

---

## 15. `social`

**Descripción:** Links de redes sociales en el footer del catálogo.
**Depende de:** `catalog`
**Tablas que posee:** ninguna (datos en `stores.config.social_links`)
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `update_social_links` | user | owner, admin | social | — | `{ social_links: { instagram?, facebook?, tiktok?, twitter?, youtube?, linkedin? } }` | config actualizado | INVALID_INPUT |
| `get_social_links` | user/system | todos | social | — | `{ store_id }` | social_links | — |

### Componentes UI
- `SocialLinksForm` — formulario con campos por red social
- `SocialLinksFooter` — íconos con links en el footer del catálogo

### Restricciones
- Los links deben ser URLs válidas.
- Si un campo es vacío, no se muestra el ícono correspondiente.

### Edge cases
- `get_social_links` es parte de `get_store_public` — no es una llamada separada en el catálogo.

---

## 16. `product_page`

**Descripción:** Metadata extendida para la página de detalle de producto (descripción larga, especificaciones, galería).
**Depende de:** `products`
**Tablas que posee:** ninguna (datos en `products.metadata.page`)
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `update_product_page` | user | owner, admin | product_page | — | `{ product_id, long_description?, specs?: Record<string,string>, gallery_urls?: string[] }` | product actualizado | NOT_FOUND, INVALID_INPUT |
| `get_product_page` | user/system | todos | product_page | — | `{ product_id }` | `{ long_description, specs, gallery_urls }` | NOT_FOUND |

### Componentes UI
- `ProductPageEditor` — editor de descripción larga (rich text simple) + especificaciones key-value + galería
- `ProductDetailPage` — página pública `/[slug]/p/[id]` con metadata extendida

### Restricciones
- Si el módulo está inactivo, la ruta `/[slug]/p/[id]` redirige al catálogo.
- `gallery_urls` máximo 10 imágenes.

### Edge cases
- Si `product_page` no tiene datos para un producto, la página de detalle muestra la descripción estándar del producto.

---

## 17. `multiuser`

**Descripción:** Múltiples usuarios por tienda con roles diferenciados (owner, admin, collaborator).
**Depende de:** `catalog`
**Tablas que posee:** `store_users` (excepto el registro inicial del owner), `store_invitations`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `invite_store_user` | user | owner, admin | multiuser | — | `{ email, role }` | `{ invited: true, invitation_id }` | CONFLICT (ya existe), INVALID_INPUT |
| `accept_invitation` | user | — | multiuser | — | `{ token }` | `{ accepted: true }` | NOT_FOUND (token expirado/inválido) |
| `cancel_invitation` | user | owner, admin | multiuser | — | `{ invitation_id }` | `{ cancelled: true }` | NOT_FOUND |
| `update_store_user_role` | user | owner | multiuser | — | `{ user_id, role }` | store_user actualizado | NOT_FOUND, UNAUTHORIZED (no puede cambiar owner) |
| `remove_store_user` | user | owner, admin | multiuser | — | `{ user_id }` | `{ removed: true }` | NOT_FOUND, UNAUTHORIZED (no puede remover owner) |
| `list_store_users` | user | owner, admin | multiuser | — | `{}` | store_user[] con user info + invitaciones pendientes | — |

### Flujo de invitación

1. `invite_store_user` crea un registro en `store_invitations` con token único y envía email vía Resend.
2. El invitado recibe un link: `{APP_URL}/invite/{token}`.
3. Si el invitado ya tiene cuenta → `accept_invitation` verifica token, crea `store_user`, marca `accepted_at`.
4. Si no tiene cuenta → se registra en Supabase Auth y luego acepta la invitación en el mismo flujo.
5. Invitaciones expiran en 72 horas (`expires_at`). Un token expirado retorna `NOT_FOUND`.

### Componentes UI
- `StoreUserList` — lista de usuarios con roles y estado de invitación
- `InviteUserForm` — formulario de invitación por email
- `PendingInvitationList` — lista de invitaciones pendientes con opción de cancelar
- `RoleSelect` — selector de rol en inline edit

### Restricciones
- Invitaciones expiran en 72 horas.
- El `owner` no puede ser removido ni degradado por ningún otro usuario.
- Solo el `owner` puede cambiar roles. El `admin` solo puede invitar y remover collaborators.
- Un email solo puede tener una invitación activa por tienda (`UNIQUE(store_id, email)`).

### Edge cases
- Si el usuario invitado no tiene cuenta, se le envía email de registro + aceptación combinado.
- Si el plan baja y ya no incluye `multiuser`, los usuarios existentes mantienen acceso hasta fin de período.
- `cancel_invitation` elimina el registro de `store_invitations`. No afecta `store_users` existentes.

---

## 18. `custom_domain`

**Descripción:** Permite al dueño usar su propio dominio (ej: `micatalogo.com`) en lugar del subdominio de KitDigital.
**Depende de:** `catalog`
**Tablas que posee:** ninguna (campos en `stores`: `custom_domain`, `custom_domain_verified`, `custom_domain_verified_at`)
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `set_custom_domain` | user | owner | custom_domain | — | `{ domain }` | `{ domain, verification_token }` | INVALID_INPUT, CONFLICT (dominio en uso) |
| `verify_custom_domain` | user | owner | custom_domain | — | `{ domain }` | `{ verified: true/false }` | NOT_FOUND |
| `remove_custom_domain` | user | owner | custom_domain | — | `{}` | `{ removed: true }` | — |
| `get_custom_domain_status` | user | owner, admin | custom_domain | — | `{}` | `{ domain, verified, verified_at }` | — |

### Componentes UI
- `CustomDomainForm` — formulario con instrucciones paso a paso para configurar DNS
- `CustomDomainStatus` — badge de estado (pendiente, verificado, error)

### Restricciones
- Verificación por registro `TXT` en DNS con token único generado por KitDigital.
- El middleware tiene en cuenta `custom_domain` para resolver la tienda (prioridad: `custom_domain` > `subdominio`).
- Un dominio custom solo puede apuntar a una tienda.

### Edge cases
- Si la verificación falla por propagación DNS: mostrar estado "pendiente" y permitir reintentar.

---

## 19. `tasks`

**Descripción:** Lista de tareas internas para el dueño y su equipo. Seguimiento simple de pendientes del negocio.
**Depende de:** `catalog`
**Tablas que posee:** `tasks`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `create_task` | user | owner, admin, collaborator | tasks | — | `{ title, description?, due_date?, assigned_to? }` | task creada | INVALID_INPUT |
| `update_task` | user | owner, admin, collaborator | tasks | — | `{ id, title?, description?, due_date?, assigned_to?, status? }` | task actualizada | NOT_FOUND |
| `complete_task` | user | owner, admin, collaborator | tasks | — | `{ id }` | task actualizada | NOT_FOUND |
| `delete_task` | user | owner, admin | tasks | — | `{ id }` | `{ deleted: true }` | NOT_FOUND |
| `list_tasks` | user | owner, admin, collaborator | tasks | — | `{ status?, assigned_to?, page?, pageSize? }` | `{ items, total }` | — |

### Componentes UI
- `TaskList` — lista con filtros por estado y asignado
- `TaskForm` — formulario crear/editar
- `TaskStatusToggle` — toggle completada/pendiente (con optimistic update)

### Restricciones
- `status` enum: `pending`, `in_progress`, `done`, `cancelled` (alineado con `schema.sql`).
- `assigned_to` es un `user_id` de `store_users`.

### Edge cases
- Optimistic update en `complete_task`: actualización inmediata en UI, rollback si falla.

---

## 20. `assistant`

**Descripción:** Asistente IA integrado en el panel del dueño. Propone acciones de negocio en lenguaje natural; el dueño confirma y el executor las ejecuta.
**Depende de:** `catalog`
**Tablas que posee:** `assistant_sessions`, `assistant_messages`
**Siempre activo:** no

### Actions

| Action | Actor | Permisos | Requiere módulo | Límite | Input | Output | Errores |
|--------|-------|----------|-----------------|--------|-------|--------|---------|
| `get_assistant_session` | user | owner, admin, collaborator | assistant | — | `{ session_id? }` | session (nueva o existente) | — |
| `send_assistant_message` | user | owner, admin, collaborator | assistant | ai_tokens | `{ session_id, content }` | `{ message, proposed_actions? }` | LIMIT_EXCEEDED (tokens), EXTERNAL_ERROR |
| `execute_assistant_action` | ai | — | assistant | — | `{ session_id, action_name, action_input }` | ActionResult del executor | cualquier error del executor |

### Componentes UI
- `AssistantChat` — panel de chat con historial de mensajes
- `AssistantActionCard` — card de acción propuesta con botones "Confirmar" / "Ignorar"
- `AssistantTokenCounter` — indicador de tokens usados / disponibles

### Restricciones
- El assistant **propone** acciones en formato JSON; el usuario confirma.
- La ejecución de acciones pasa por el executor con `actor_type: 'ai'`.
- `ai_tokens` se descuenta por tokens de input + output de OpenAI.
- TTL de sesión: 24 horas. Después se archiva y se abre sesión nueva.
- Modelo: `gpt-4o-mini`.

### Edge cases
- Si se agotan los `ai_tokens`: bloquear `send_assistant_message` con `LIMIT_EXCEEDED`. Mostrar `PlanUpgradePrompt`.
- El cron de limpieza archiva sesiones expiradas y libera memoria de contexto.

### Tabla: Clasificación de Módulos

| Módulo          | Tipo | Costo mensual |
|-----------------|------|---------------|
| catalog         | core | incluido en precio base |
| products        | core | incluido en precio base |
| categories      | core | incluido en precio base |
| cart            | core | incluido en precio base |
| orders          | core | incluido en precio base |
| stock           | base | incluido en precio base |
| payments        | base | incluido en precio base |
| banners         | base | incluido en precio base |
| social          | base | incluido en precio base |
| product_page    | base | incluido en precio base |
| shipping        | base | incluido en precio base |
| variants        | pro  | $5,000 ARS/mes |
| wholesale       | pro  | $5,000 ARS/mes |
| finance         | pro  | $5,000 ARS/mes |
| expenses        | pro  | $5,000 ARS/mes |
| savings_account | pro  | $5,000 ARS/mes |
| multiuser       | pro  | $5,000 ARS/mes |
| custom_domain   | pro  | $5,000 ARS/mes |
| tasks           | pro  | $5,000 ARS/mes |
| assistant       | pro  | $5,000 ARS/mes |

**`core`:** siempre activos, no desactivables. Incluidos en el precio base.  
**`base`:** activos por defecto con cualquier suscripción activa o trial. Incluidos en el precio base.  
**`pro`:** desactivados por defecto. El dueño los activa individualmente desde el panel. Cada uno agrega `plans.pro_module_price` al ticket mensual.
