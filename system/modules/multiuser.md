# Module: multiuser

## Purpose

Permite que múltiples usuarios tengan acceso a la misma tienda con roles diferenciados.

Sin este módulo, la tienda tiene un solo usuario con acceso completo (el owner). Con el módulo activo, el owner puede invitar colaboradores y asignarles roles con diferentes niveles de acceso.

## Dependencies

- `catalog` — multiuser pertenece a una tienda resuelta

## Data Impact

### Entities owned
- `store_user` — relación entre un usuario y una tienda con su rol; multiuser gestiona la creación y modificación de estas relaciones (excepto el owner inicial, que se crea al crear la tienda)

### Fields
- `store_user.id` — UUID
- `store_user.store_id` — UUID
- `store_user.user_id` — UUID
- `store_user.role` — `owner` | `admin` | `collaborator`
- `store_user.invited_by` — UUID del user que invitó (nullable)
- `store_user.invited_at` — timestamp de la invitación
- `store_user.accepted_at` — timestamp de aceptación (nullable hasta aceptar)
- `store_user.created_at`, `store_user.updated_at`

### Relationships
- Un `store_user` pertenece a una `store` y a un `user`
- Un `store` puede tener muchos `store_users`

### External reads
- `users.email` — para enviar invitaciones por email

## Actions

### `invite_store_user`
- **Actor:** user
- **requires:** [`multiuser`]
- **permissions:** owner, admin
- **input:** `{ email, role }` — role puede ser `admin` o `collaborator`; no se puede invitar como `owner`
- **output:** `store_user` con estado de invitación pendiente
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT` (email inválido, role inválido), `CONFLICT` (usuario ya tiene acceso a esta tienda), `UNAUTHORIZED`

### `update_store_user_role`
- **Actor:** user
- **requires:** [`multiuser`]
- **permissions:** owner
- **input:** `{ store_user_id, role }`
- **output:** `store_user` actualizado
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `CONFLICT` (no se puede cambiar el rol del owner), `UNAUTHORIZED`

### `remove_store_user`
- **Actor:** user
- **requires:** [`multiuser`]
- **permissions:** owner, admin
- **input:** `{ store_user_id }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `CONFLICT` (no se puede remover al owner), `UNAUTHORIZED`
- **nota:** un admin no puede remover a otro admin; solo al owner le corresponde.

### `list_store_users`
- **Actor:** user
- **requires:** [`multiuser`]
- **permissions:** owner, admin
- **input:** `{}`
- **output:** `{ items: store_user[] }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

### `accept_invitation`
- **Actor:** user
- **requires:** [`multiuser`]
- **permissions:** user (el invitado)
- **input:** `{ invitation_token }`
- **output:** `store_user` activado con `accepted_at`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND` (token inválido), `CONFLICT` (ya aceptada o expirada)

## UI Components

- `UserList` — listado de usuarios con roles y estado
- `InviteUserForm` — formulario de invitación por email
- `RoleSelector` — selector de rol (admin, collaborator)
- `UserRoleBadge` — badge visual del rol
- `PendingInvitationBanner` — banner de invitación pendiente de aceptación

## Constraints

- Solo puede haber un `owner` por tienda. El owner no puede ser removido ni cambiar su rol a través de este módulo (solo vía transferencia explícita, funcionalidad futura).
- `collaborator` solo puede: ver pedidos, ver productos, actualizar estado de pedidos. No puede crear/eliminar productos ni acceder a configuración o billing.
- Sin módulo `multiuser` activo: no se pueden invitar usuarios adicionales. Solo el owner tiene acceso.
- Las invitaciones tienen expiración de 72 horas.
- Un usuario puede tener acceso a múltiples tiendas con distintos roles.

## Edge Cases

- **Invitar un email que no tiene cuenta en el sistema:** se crea una invitación pendiente. Al registrarse con ese email, se asocia automáticamente a la tienda.
- **Desactivar módulo `multiuser` con usuarios activos:** los `store_users` existentes se conservan. Al reactivar, todos siguen activos. Durante la desactivación, los colaboradores no pueden ingresar al panel de la tienda.
- **Admin intentando remover a otro admin:** devuelve `UNAUTHORIZED`. Solo el owner puede remover admins.

## Future Extensions

- Transferencia de ownership a otro usuario.
- Permisos granulares por sección (ej: acceso solo a pedidos, no a productos).
- Log de actividad por usuario.
