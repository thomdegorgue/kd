# Module: custom_domain

## Purpose

Permite que la tienda sea accesible desde un dominio propio del dueño en lugar del subdominio por defecto.

Sin este módulo, la tienda usa `{slug}.kitdigital.ar`. Con el módulo activo, el dueño puede configurar su propio dominio (ej: `mitienda.com`) y la vitrina es accesible desde ahí.

## Dependencies

- `catalog` — custom_domain pertenece a una tienda resuelta

## Data Impact

### Entities owned
- No crea tablas propias. Agrega campos en `store` directamente.

### Fields
- `store.custom_domain` — string, dominio configurado (ej: `mitienda.com`)
- `store.custom_domain_verified` — boolean, si el dominio fue verificado con DNS
- `store.custom_domain_verified_at` — timestamp de verificación

### Relationships
- Extiende `store`; no tiene tabla propia.

### External reads
- Ninguno.

## Actions

### `set_custom_domain`
- **Actor:** user
- **requires:** [`custom_domain`]
- **permissions:** owner
- **input:** `{ domain }` — dominio sin protocolo (ej: `mitienda.com`)
- **output:** `{ domain, verification_token, dns_instructions }`
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT` (formato de dominio inválido), `CONFLICT` (dominio ya en uso por otra tienda), `UNAUTHORIZED`
- **nota:** el dominio queda en estado pendiente de verificación. Se genera un token para que el dueño configure un registro TXT en su DNS.

### `verify_custom_domain`
- **Actor:** system (cron o trigger manual)
- **requires:** [`custom_domain`]
- **permissions:** system, owner
- **input:** `{ store_id }`
- **output:** `{ verified: boolean, domain }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`
- **nota:** el sistema consulta el DNS del dominio para verificar que el registro TXT está configurado correctamente. Si verifica, actualiza `custom_domain_verified: true`.

### `remove_custom_domain`
- **Actor:** user
- **requires:** [`custom_domain`]
- **permissions:** owner
- **input:** `{}`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`
- **nota:** elimina el dominio custom. La tienda vuelve a ser accesible solo por subdominio.

### `get_custom_domain_status`
- **Actor:** user
- **requires:** [`custom_domain`]
- **permissions:** owner, admin
- **input:** `{}`
- **output:** `{ domain, verified, verified_at, dns_instructions }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

## UI Components

- `CustomDomainForm` — campo para ingresar el dominio propio
- `DomainVerificationStatus` — indicador de estado de verificación (pendiente, verificado, error)
- `DnsInstructions` — instrucciones paso a paso para configurar el DNS

## Constraints

- El dominio debe ser único a nivel sistema: dos tiendas no pueden usar el mismo dominio.
- El dominio configurado no puede ser un subdominio de `kitdigital.ar`.
- La verificación DNS puede tardar hasta 48 horas por propagación. El sistema reintenta automáticamente cada hora.
- Si el módulo se desactiva con un dominio configurado, el dominio deja de funcionar pero los datos se conservan.
- Solo el `owner` puede configurar o remover el dominio custom.

## Edge Cases

- **Dominio ya verificado en otra tienda:** devuelve `CONFLICT` al intentar configurarlo.
- **DNS mal configurado después de verificar:** si el TXT es eliminado después de la verificación, el dominio sigue funcionando hasta que Vercel invalide el certificado. El sistema puede detectarlo con re-verificaciones periódicas.
- **Tienda archivada con dominio custom:** el dominio deja de ser accesible. El certificado SSL puede expirar.

## Future Extensions

- Verificación automática sin TXT via CNAME.
- Panel de estado del certificado SSL.
- Redireccionamiento del dominio www al dominio principal.
