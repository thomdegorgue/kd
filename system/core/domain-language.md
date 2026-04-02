# Domain Language — KitDigital.AR

## Propósito

Este archivo es el árbitro de nomenclatura del sistema.
Toda entidad, action, evento, campo y estado usa exactamente los nombres definidos aquí.
No se aceptan sinónimos, traducciones ni variantes.
Si un nombre no está definido aquí, se agrega antes de usarlo.

→ Regla de enforcement en: `/system/constraints/global-rules.md`

---

## Entidades Core

| Nombre canónico | Plural | Descripción |
|----------------|--------|-------------|
| `store` | `stores` | Un negocio registrado en el sistema. Unidad raíz de todo. |
| `user` | `users` | Una persona con cuenta en el sistema. |
| `store_user` | `store_users` | Relación entre un usuario y una tienda, con rol. |
| `product` | `products` | Un artículo que la tienda ofrece a la venta. |
| `category` | `categories` | Agrupación de productos dentro de una tienda. |
| `order` | `orders` | Una solicitud de compra generada desde el carrito. |
| `customer` | `customers` | Una persona que generó un pedido en la tienda. Sin cuenta propia. |
| `payment` | `payments` | Registro de un pago procesado o confirmado. |
| `event` | `events` | Registro inmutable de algo que ocurrió en el sistema. |
| `banner` | `banners` | Imagen promocional en la vitrina pública. |
| `shipping_method` | `shipping_methods` | Opción de envío configurada por la tienda. |
| `variant` | `variants` | Combinación de atributos de un producto (talle, color, etc.). |
| `task` | `tasks` | Acción pendiente de seguimiento interno de la tienda. |
| `expense` | `expenses` | Egreso registrado en el módulo de finanzas. |
| `finance_entry` | `finance_entries` | Movimiento de caja (ingreso o egreso) registrado en finanzas. |
| `savings_account` | `savings_accounts` | Cuenta de ahorro virtual de la tienda. |

---

## Entidades de Sistema (no pertenecen a una tienda)

| Nombre canónico | Plural | Descripción |
|----------------|--------|-------------|
| `plan` | `plans` | Conjunto de límites y módulos disponibles. Definido por KitDigital. |
| `subscription` | `subscriptions` | Suscripción activa de una tienda a un plan. |

---

## Roles de Usuario

| Nombre canónico | Descripción |
|----------------|-------------|
| `owner` | Dueño principal de la tienda. Acceso total sobre ella. |
| `admin` | Administrador delegado. Casi igual que owner salvo billing. |
| `collaborator` | Acceso operativo limitado (productos, pedidos). Sin configuración. |
| `superadmin` | Rol global. Acceso a todo el sistema. No pertenece a ninguna tienda. |

---

## Estados de Tienda (store.status)

| Estado | Descripción |
|--------|-------------|
| `demo` | Período de prueba gratuito de 15 días. Límites reducidos. |
| `active` | Tienda activa con pago al día. Acceso completo. |
| `past_due` | Pago vencido. Acceso limitado. Sin operaciones críticas nuevas. |
| `suspended` | Bloqueada manualmente por superadmin. Sin acceso. |
| `archived` | Fuera del sistema activo. Solo accesible vía `/archived`. |

---

## Estados de Pedido (order.status)

| Estado | Descripción |
|--------|-------------|
| `pending` | Pedido recibido, sin confirmar. |
| `confirmed` | Confirmado por el dueño. |
| `preparing` | En preparación. |
| `delivered` | Entregado al cliente. |
| `cancelled` | Cancelado. Estado terminal. |

---

## Estados de Pago (payment.status)

| Estado | Descripción |
|--------|-------------|
| `pending` | Pago registrado, sin confirmar. |
| `approved` | Pago confirmado exitosamente. |
| `rejected` | Pago rechazado por el procesador. |
| `refunded` | Pago reembolsado. |

---

## Convenciones de Naming

### Entidades y campos
- **snake_case** para todos los nombres de entidades, campos y relaciones.
- **Singular** para entidades (`product`, no `products`).
- **Plural** para colecciones, arrays y referencias de tabla.
- Los campos de referencia a otra entidad usan el nombre de la entidad + `_id`: `store_id`, `product_id`, `order_id`.
- El campo identificador primario de cada entidad es siempre `id`.
- Los campos de fecha usan sufijo `_at` para timestamps (`created_at`, `updated_at`, `deleted_at`) y `_date` para fechas sin hora (`trial_ends_date`).
- Los campos booleanos usan el prefijo `is_` o `has_` según corresponda: `is_active`, `has_custom_domain`.

### Actions
- **snake_case** obligatorio.
- Formato: `{verbo}_{entidad}` — siempre verbo primero.
- Verbos canónicos: `create`, `update`, `delete`, `get`, `list`, `enable`, `disable`, `archive`, `restore`, `send`, `process`, `validate`, `generate`, `assign`.
- Ejemplos válidos: `create_product`, `update_order`, `list_products`, `enable_module`, `archive_store`.
- Ejemplos inválidos: `productCreate`, `newProduct`, `getProductsList`.

### Tipos de action (tipología)
| Tipo | Patrón | Descripción |
|------|--------|-------------|
| Creación | `create_{entidad}` | Crea una nueva instancia de la entidad |
| Actualización | `update_{entidad}` | Modifica campos de una instancia existente |
| Eliminación | `delete_{entidad}` | Elimina lógica o físicamente una instancia |
| Lectura unitaria | `get_{entidad}` | Obtiene una instancia por ID |
| Listado | `list_{entidades}` | Obtiene colección, siempre en plural |
| Habilitación | `enable_{cosa}` | Activa un módulo, función o estado |
| Deshabilitación | `disable_{cosa}` | Desactiva un módulo, función o estado |
| Archivado | `archive_{entidad}` | Mueve a estado archivado |
| Restauración | `restore_{entidad}` | Revierte un archivado |
| Procesamiento | `process_{cosa}` | Ejecuta un flujo con efectos de negocio (pago, envío) |
| Envío | `send_{cosa}` | Envía algo externo (notificación, mensaje) |
| Generación | `generate_{cosa}` | Produce contenido o datos derivados (IA, reportes) |

### Eventos
- **snake_case** obligatorio.
- Formato: `{entidad}_{verbo_pasado}`.
- El verbo es siempre en **pasado**: `created`, `updated`, `deleted`, `enabled`, `disabled`, `archived`, `approved`, `rejected`, `sent`, `processed`.
- Ejemplos válidos: `product_created`, `order_updated`, `payment_approved`, `module_enabled`.
- Ejemplos inválidos: `create_product`, `productCreated`, `product_create`.

### Módulos (identificadores internos)
- **snake_case** obligatorio.
- Nombres canónicos de módulos para `store.modules`:

| Identificador | Módulo |
|--------------|--------|
| `catalog` | Catálogo base |
| `cart` | Carrito WhatsApp |
| `products` | Gestión de productos (CRUD) |
| `categories` | Categorías |
| `orders` | Pedidos |
| `stock` | Control de stock |
| `payments` | Registro de pagos |
| `variants` | Variantes de producto |
| `wholesale` | Precios mayoristas |
| `shipping` | Métodos de envío |
| `finance` | Finanzas básicas |
| `banners` | Banners en vitrina |
| `social` | Redes sociales |
| `product_page` | Página de producto extendida |
| `multiuser` | Múltiples usuarios por tienda |
| `custom_domain` | Dominio propio |
| `tasks` | Tareas internas |
| `savings_account` | Cuenta de ahorro virtual |
| `expenses` | Registro de egresos |
| `assistant` | Asistente IA |

---

## Nombres Prohibidos

Los siguientes nombres NO se usan en ningún archivo del sistema:

| Prohibido | Usar en su lugar |
|-----------|----------------|
| `shop` | `store` |
| `tenant` | `store` |
| `item` | `product` |
| `buyer` | `customer` |
| `pedido` | `order` |
| `tienda` | `store` |
| `producto` | `product` |
| `precio` | `price` |
| `id_product` / `product_id_x` | `product_id` |
| `storeID` / `StoreId` | `store_id` |
| `actionCreate` / `createAction` | `create_{entidad}` |

---

## Campos Universales Obligatorios

Toda entidad que pertenece a una tienda tiene obligatoriamente:

```
id          — UUID, clave primaria
store_id    — UUID, referencia a stores.id
created_at  — timestamp con timezone
updated_at  — timestamp con timezone
```

Las entidades de sistema (no pertenecen a tienda) tienen `id`, `created_at`, `updated_at` pero NO `store_id`.
