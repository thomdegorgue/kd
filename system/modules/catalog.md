# Module: catalog

## Purpose

El módulo catalog es el núcleo del sistema. Representa la tienda pública visible para el cliente final.

Gestiona la identidad y configuración visual de la tienda, y sirve como contenedor de todo lo que se muestra al público: nombre, logo, colores, información de contacto, WhatsApp, y la disposición general del catálogo.

Este módulo es parte del CORE y está activo en todas las tiendas sin excepción. No puede desactivarse.

## Dependencies

- Ninguno. Es el módulo base del sistema.
- Todos los módulos que tienen presencia en la vitrina pública dependen de catalog para existir en el contexto de una tienda resuelta.

## Data Impact

### Entities owned
- `store` — catalog es el propietario de la configuración pública de la tienda (nombre, slug, logo, colores, WhatsApp, estado de la vitrina)

### Fields
- `store.name` — nombre público de la tienda
- `store.slug` — identificador único en URL (`{slug}.kitdigital.ar`)
- `store.logo_url` — URL de la imagen del logo (Cloudinary)
- `store.cover_url` — URL de la imagen de portada de la vitrina
- `store.whatsapp` — número de WhatsApp del negocio (formato internacional)
- `store.description` — descripción corta del negocio
- `store.config` (JSONB) — configuración visual: color primario, color de fondo, fuente, disposición de productos
- `store.status` — estado del lifecycle de la tienda
- `store.modules` (JSONB) — módulos activos de la tienda
- `store.limits` (JSONB) — límites del plan activo

### Relationships
- Una `store` tiene muchos `products` (vía módulo products)
- Una `store` tiene muchos `store_users` (usuarios con acceso)
- Una `store` tiene una `subscription` activa

### External reads
- Ninguno. catalog no necesita leer de otros módulos para operar.

## Actions

Todas las actions siguen el contrato de `/system/core/action-contract.md`.

### `get_store`
- **Actor:** user, superadmin, system
- **requires:** []
- **permissions:** owner, admin, collaborator, superadmin
- **input:** `{ store_id }`
- **output:** objeto `store` completo
- **errors:** `NOT_FOUND`, `UNAUTHORIZED`

### `update_store`
- **Actor:** user, superadmin
- **requires:** []
- **permissions:** owner, admin, superadmin
- **input:** `{ name?, slug?, description?, whatsapp?, logo_url?, cover_url?, config? }`
- **output:** `store` actualizada
- **errors:** `INVALID_INPUT` (slug duplicado o inválido), `UNAUTHORIZED`, `STORE_INACTIVE`
- **nota:** el `slug` es único a nivel sistema; si se cambia, la URL pública cambia

### `update_store_config`
- **Actor:** user, superadmin
- **requires:** []
- **permissions:** owner, admin, superadmin
- **input:** `{ config: { primary_color?, background_color?, font?, layout? } }`
- **output:** `store` con config actualizada
- **errors:** `INVALID_INPUT`, `UNAUTHORIZED`

### `enable_module`
- **Actor:** user, superadmin
- **requires:** [] (la validación de dependencias entre módulos es interna)
- **permissions:** owner, superadmin
- **input:** `{ module_name }`
- **output:** `store.modules` actualizado
- **errors:** `INVALID_INPUT` (módulo no existe), `UNAUTHORIZED`, `CONFLICT` (dependencia no activa)

### `disable_module`
- **Actor:** user, superadmin
- **requires:** []
- **permissions:** owner, superadmin
- **input:** `{ module_name }`
- **output:** `store.modules` actualizado
- **errors:** `INVALID_INPUT`, `UNAUTHORIZED`, `CONFLICT` (otro módulo activo depende de este)

### `get_store_public`
- **Actor:** system (acceso público sin autenticación)
- **requires:** []
- **permissions:** system
- **input:** `{ slug }` o `{ custom_domain }`
- **output:** datos públicos de la tienda (name, logo, config, whatsapp, status)
- **errors:** `NOT_FOUND`, `STORE_INACTIVE` (si archived o suspended)

## UI Components

- `StoreHeader` — nombre, logo y descripción de la tienda en la vitrina
- `StoreCover` — imagen de portada
- `StoreConfigPanel` — panel de configuración de apariencia (color, logo, nombre)
- `ModuleToggle` — switch de activación/desactivación de módulo
- `ModuleList` — listado de módulos con estado activo/inactivo
- `StoreStatusBadge` — indicador visual del estado actual de la tienda

## Constraints

- `slug` es único a nivel de sistema (no solo por tienda). No puede contener caracteres especiales ni espacios. Solo letras, números y guiones.
- `store.status` solo puede tener los valores definidos en `domain-language.md`: `demo`, `active`, `past_due`, `suspended`, `archived`.
- `whatsapp` debe ser un número válido en formato internacional (ej: `5491112345678`).
- No se puede desactivar un módulo si otro módulo activo depende de él (el sistema verifica el grafo de dependencias antes de desactivar).
- No se puede activar un módulo si sus dependencias requeridas no están activas.
- La tienda en estado `archived` o `suspended` no puede actualizarse desde el panel (solo superadmin).
- `store.config` solo puede contener claves definidas en el contrato de configuración; claves desconocidas se ignoran.

## Edge Cases

- **Cambio de slug con dominio custom activo:** si la tienda tiene `custom_domain` activo y se cambia el slug, la URL por subdominio cambia pero el dominio custom no se ve afectado.
- **Módulo con dependencias en cascada:** desactivar `orders` cuando `payments` está activo debe bloquearse con error `CONFLICT`, especificando qué módulo activo depende del que se intenta desactivar.
- **Tienda demo intentando activar módulos de pago:** en estado `demo` solo se pueden activar los módulos del CORE. Los módulos de pago y facturación requieren estado `active`.
- **Logo o cover con URL inválida:** si `logo_url` o `cover_url` llegan con una URL que no es de Cloudinary del tenant, se rechaza con `INVALID_INPUT`.
- **Slug ya tomado:** al intentar cambiar el slug a uno que ya usa otra tienda, se devuelve `CONFLICT` con mensaje claro.

## Future Extensions

- Soporte para múltiples idiomas en nombre y descripción.
- Configuración de horarios de atención visibles en la vitrina.
- Temas visuales predefinidos (preset de config) seleccionables desde el panel.
- Modo mantenimiento: ocultar vitrina temporalmente sin cambiar el status de la tienda.
