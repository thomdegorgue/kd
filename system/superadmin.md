# Superadmin — Panel Interno de Operaciones

Acceso: `/superadmin/*`. Solo `users.role === 'superadmin'`. Sin RLS (usa service_role).

---

## Capacidades

### Gestión de Tiendas
- Listar todas las tiendas (con filtros por status, plan, fecha)
- Ver detalle de cualquier tienda (config, módulos, billing, usuarios)
- Cambiar status de tienda (active, suspended, archived)
- Cambiar plan de tienda
- Override de módulos (activar/desactivar individualmente)
- Override de límites (max_products, max_orders, ai_tokens)
- Extender trial (modificar trial_ends_at)
- Impersonar tienda (acceso lectura al panel como si fuera el owner)

### Gestión de Usuarios
- Listar usuarios
- Ban/unban usuario
- Ver tiendas de un usuario

### Gestión de Planes
- CRUD de planes (crear, editar, desactivar)
- Modificar precios de módulos add-on

### Auditoría
- Ver tabla de eventos (filtros por tienda, tipo, fecha, actor)
- Ver log de webhooks de billing (`billing_webhook_log`)
- Ver billing payments por tienda

### Métricas
- MRR (Monthly Recurring Revenue)
- Tiendas activas por plan
- Churn rate
- Tasa de conversión demo → active
- Top tiendas por pedidos/mes

---

## Seguridad

- Toda acción de superadmin genera evento con `actor_type: 'superadmin'`.
- Doble confirmación en acciones destructivas (archivar tienda, ban usuario).
- Impersonation es solo lectura; no puede modificar datos como el owner.
- El superadmin nunca ve datos de tarjeta (manejados por MP).
