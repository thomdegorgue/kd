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

### Seguridad — Implementación (F7)

- **Rate limiting:** Todas las rutas `/superadmin/*` y API routes de superadmin usan Upstash ratelimit (máximo razonable por IP/usuario).
- **2FA obligatorio:** El superadmin debe tener 2FA habilitado (TOTP vía Supabase Auth MFA). Sin 2FA activo, el middleware redirige a configuración de 2FA.
- **IP allowlist (opcional):** Variable de entorno `SUPERADMIN_ALLOWED_IPS` (lista separada por comas). Si está definida, el middleware rechaza requests de IPs no incluidas. Si no está definida, se permite cualquier IP (útil en desarrollo).
- **Sesiones cortas:** TTL de sesión de superadmin: 4 horas. Después, re-autenticación obligatoria.
- **Logging completo:** Todo endpoint de superadmin registra evento en `events` con `actor_type: 'superadmin'`, incluyendo lectura de datos sensibles (billing, impersonation).

---

## Impersonation — Mecánica

La impersonation permite al superadmin ver el panel admin de cualquier tienda como si fuera el owner, pero en modo solo lectura.

### Flujo

1. Superadmin selecciona "Impersonar" en el detalle de una tienda.
2. El frontend envía header `X-Impersonate-Store: {store_id}` en las requests.
3. El middleware verifica:
   - `users.role === 'superadmin'`
   - Header `X-Impersonate-Store` presente y válido
   - La tienda existe
4. Construye un `StoreContext` especial con flag `readonly: true`.
5. El superadmin navega el panel admin con los datos de esa tienda.

### Restricciones

- Toda server action verifica `StoreContext.readonly`. Si es `true`, retorna `UNAUTHORIZED` para cualquier operación de escritura.
- Se registra evento `store_impersonated` con `actor_type: 'superadmin'` y `data: { store_id }` al iniciar la impersonation.
- El superadmin no puede: crear/editar/eliminar datos, cambiar configuración, ni acceder a billing de la tienda impersonada.
- La UI muestra un banner visible "Modo impersonation — Solo lectura" durante toda la sesión impersonada.
