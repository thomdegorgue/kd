# Module: tasks

## Purpose

Permite al dueño y su equipo gestionar tareas internas relacionadas con la operación de la tienda.

Es un sistema de to-do simple y operativo. Permite crear recordatorios, tareas pendientes y hacer seguimiento de acciones relacionadas con pedidos u operaciones del negocio.

## Dependencies

- `catalog` — tasks pertenece a una tienda
- `orders` — las tareas pueden vincularse opcionalamente a un pedido

## Data Impact

### Entities owned
- `task` — el módulo tasks es el único que escribe en la tabla `tasks`

### Fields
- `task.id` — UUID
- `task.store_id` — UUID
- `task.title` — título de la tarea (requerido)
- `task.description` — descripción opcional
- `task.status` — `pending` | `in_progress` | `done` | `cancelled`
- `task.due_date` — fecha límite opcional
- `task.assigned_to` — UUID nullable, referencia a `store_users.user_id`
- `task.order_id` — UUID nullable, vínculo a un pedido
- `task.created_by` — UUID del usuario que creó la tarea
- `task.created_at`, `task.updated_at`

### Relationships
- Un `task` pertenece a una `store`
- Un `task` puede estar vinculado a un `order`
- Un `task` puede estar asignado a un `store_user`

### External reads
- `store_users` — para validar que `assigned_to` tiene acceso a la tienda (lectura directa controlada)
- `orders` — para validar que `order_id` pertenece a la tienda (lectura directa controlada)

## Actions

### `create_task`
- **Actor:** user
- **requires:** [`tasks`]
- **permissions:** owner, admin, collaborator
- **input:** `{ title, description?, due_date?, assigned_to?, order_id? }`
- **output:** `task` creada
- **errors:** `MODULE_INACTIVE`, `INVALID_INPUT`, `NOT_FOUND` (order o user inválido), `UNAUTHORIZED`

### `update_task`
- **Actor:** user
- **requires:** [`tasks`]
- **permissions:** owner, admin, collaborator
- **input:** `{ task_id, title?, description?, status?, due_date?, assigned_to? }`
- **output:** `task` actualizada
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `delete_task`
- **Actor:** user
- **requires:** [`tasks`]
- **permissions:** owner, admin
- **input:** `{ task_id }`
- **output:** `{ success: true }`
- **errors:** `MODULE_INACTIVE`, `NOT_FOUND`, `UNAUTHORIZED`

### `list_tasks`
- **Actor:** user
- **requires:** [`tasks`]
- **permissions:** owner, admin, collaborator
- **input:** `{ status?, assigned_to?, order_id?, due_date_from?, due_date_to? }`
- **output:** `{ items: task[] }`
- **errors:** `MODULE_INACTIVE`, `UNAUTHORIZED`

## UI Components

- `TaskList` — listado de tareas con filtros de estado y asignado
- `TaskForm` — formulario de creación y edición
- `TaskCard` — tarjeta de tarea con estado y fecha límite
- `TaskStatusSelect` — selector de estado con colores
- `TaskDueDateBadge` — badge de fecha límite con indicador de vencimiento

## Constraints

- `title` obligatorio, máximo 200 caracteres.
- `status` válidos: `pending`, `in_progress`, `done`, `cancelled`.
- `assigned_to` debe ser un usuario con acceso activo a la tienda.
- Las tareas sin `due_date` no tienen vencimiento; no generan alertas automáticas.

## Edge Cases

- **Tarea asignada a usuario que pierde acceso a la tienda:** la tarea conserva el `assigned_to`, pero el usuario no puede verla ni actualizarla. El owner puede reasignarla.
- **Tarea vinculada a pedido cancelado:** sigue siendo válida. El vínculo es referencial.

## Future Extensions

- Notificaciones de tareas próximas a vencer.
- Checklist dentro de una tarea.
- Prioridades (alta, media, baja).
