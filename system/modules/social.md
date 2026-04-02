# Module: social

## Purpose

Permite vincular las redes sociales del negocio a la vitrina pública.

El cliente puede acceder desde la tienda a Instagram, Facebook, TikTok u otras redes configuradas por el dueño. Los links aparecen en el footer o header de la vitrina.

## Dependencies

- `catalog` — social pertenece a una tienda resuelta

## Data Impact

### Entities owned
- No crea tablas propias. Escribe en `store.config` (JSONB bajo key `social_links`).

### Fields
- `store.config.social_links` (JSONB) — objeto con las redes configuradas:
  ```json
  {
    "instagram": "https://instagram.com/...",
    "facebook": "https://facebook.com/...",
    "tiktok": "https://tiktok.com/...",
    "twitter": "https://x.com/...",
    "youtube": "https://youtube.com/..."
  }
  ```

### Relationships
- Extiende `store.config`; no tiene tabla propia.

### External reads
- `store.config` — lectura de los links actuales para mostrar en la vitrina (via catalog)

## Actions

### `update_social_links`
- **Actor:** user, ai
- **requires:** [`social`]
- **permissions:** owner, admin, ai
- **input:** `{ instagram?, facebook?, tiktok?, twitter?, youtube? }` — cualquier campo puede ser string URL o null para eliminarlo
- **output:** `store.config.social_links` actualizado
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT` (URL inválida), `UNAUTHORIZED`

### `get_social_links`
- **Actor:** user, system
- **requires:** [`social`]
- **permissions:** owner, admin, system
- **input:** `{}`
- **output:** `{ social_links: { instagram?, facebook?, ... } }`
- **errors:** `MODULE_INACTIVE`

## UI Components

- `SocialLinksForm` — formulario con campos por red social
- `SocialLinksBar` — barra de iconos de redes sociales en la vitrina
- `SocialIcon` — ícono individual de red social con link

## Constraints

- Cada URL debe ser una URL válida (formato `https://`).
- Pasar `null` para una red elimina ese link de la vitrina.
- Solo las redes con URL configurada aparecen en la vitrina.
- No hay límite de redes configuradas dentro de las disponibles en el sistema.

## Edge Cases

- **URL inválida al guardar:** se valida en input. Si la URL no comienza con `https://`, se rechaza con `INVALID_INPUT`.
- **Módulo desactivado con links configurados:** los datos se conservan en `store.config`. Al reactivar, los links están disponibles de nuevo.

## Future Extensions

- Redes adicionales: Pinterest, WhatsApp Business (diferente del WhatsApp de pedidos), Telegram.
- Contador de seguidores visible en la vitrina (via API de cada red).
- Links a publicaciones destacadas.
