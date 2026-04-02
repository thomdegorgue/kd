# Superadmin — KitDigital.AR

## Propósito

Este archivo define el rol de superadmin: qué puede hacer, cómo accede al sistema, y qué restricciones aplican incluso a este nivel de privilegio máximo.

→ Billing: `/system/billing/billing.md`
→ Multi-tenancy: `/system/architecture/multi-tenant.md`
→ Reglas globales: `/system/constraints/global-rules.md`

---

## Qué es el Superadmin

El superadmin es el operador interno de KitDigital (el dueño del SaaS).
No es un usuario de tienda. Es el único rol con acceso transversal a todas las tiendas.

Existe exactamente un superadmin en el sistema en producción (puede haber más en staging).
El rol `superadmin` se asigna en `users.role` directamente en la DB, no desde ninguna UI de tienda.

---

## Acceso

El superadmin accede a través de un panel independiente:

```
/superadmin/*
```

Este panel está protegido por:
1. Autenticación con Supabase Auth (mismo JWT que el resto)
2. Middleware que verifica `user.role === 'superadmin'` antes de cualquier ruta
3. Si el rol no es `superadmin` → redirect a 403, sin revelar si la ruta existe

El panel de superadmin es completamente independiente del panel de gestión de tiendas.
Un superadmin **no puede** usar el panel de superadmin para gestionar su propia tienda (si tuviera una): usa el panel de tienda para eso.

---

## Capacidades del Superadmin

### Gestión de Tiendas

| Operación | Descripción |
|-----------|-------------|
| `list_stores` | Ver todas las tiendas con filtros (status, plan, fecha) |
| `get_store` | Ver el detalle completo de cualquier tienda |
| `update_store_status` | Cambiar status manualmente (`active`, `suspended`, `archived`) |
| `update_store_plan` | Cambiar el plan de una tienda |
| `enable_module_override` | Activar un módulo en una tienda sin cobro (ej: para soporte) |
| `disable_module_override` | Desactivar un módulo manualmente |
| `extend_trial` | Extender el período de demo de una tienda |
| `impersonate_store` | Ver la tienda como si fuera el owner (solo lectura) |

### Gestión de Planes

| Operación | Descripción |
|-----------|-------------|
| `list_plans` | Ver todos los planes |
| `create_plan` | Crear un nuevo plan |
| `update_plan` | Modificar precio, límites o módulos de un plan |
| `deactivate_plan` | Deshabilitar un plan para nuevas tiendas (no afecta existentes) |

### Gestión de Usuarios

| Operación | Descripción |
|-----------|-------------|
| `list_users` | Ver todos los usuarios del sistema |
| `get_user` | Ver detalle de un usuario |
| `ban_user` | Suspender un usuario (bloquea acceso a todas sus tiendas) |
| `unban_user` | Reactivar un usuario suspendido |

### Métricas y Observabilidad

| Operación | Descripción |
|-----------|-------------|
| `get_platform_metrics` | MRR, tiendas activas, churn, nuevas altas, módulos más usados |
| `get_store_events` | Ver el log de eventos de cualquier tienda |
| `get_billing_log` | Ver el historial de webhooks de billing |
| `get_system_errors` | Ver errores recientes del sistema |

### Operaciones de Emergencia

| Operación | Descripción |
|-----------|-------------|
| `force_billing_sync` | Forzar sincronización del estado de billing con Mercado Pago |
| `retry_failed_webhook` | Reintentar un webhook de billing fallido |
| `clear_store_cache` | Limpiar el cache de Redis de una tienda específica |

---

## Lo que el Superadmin NO puede hacer

Incluso con privilegios máximos, el superadmin está restringido:

1. **No puede ver ni modificar los datos de negocio privados de una tienda** (productos, pedidos, finanzas del dueño). Solo puede ver datos de configuración y estado.
   - Excepción: `impersonate_store` es solo lectura y genera un evento de auditoría.

2. **No puede ejecutar actions de negocio de módulos** (ej: `create_product` en nombre de una tienda). Las actions de módulos requieren actor `user`, `system`, o `ai`.

3. **No puede eliminar datos de forma irreversible** (hard delete) desde el panel. Todos los cambios son soft o reversibles, excepto `archive_store` después del período de retención de 90 días.

4. **No puede crear tiendas directamente.** Las tiendas se crean a través del flujo de onboarding. El superadmin puede crear tiendas de demo para testing, pero no tiendas de producción de otros.

5. **No puede modificar el código del sistema** desde el panel (es evidente, pero se menciona por claridad de rol).

---

## Trazabilidad del Superadmin

**Todas las operaciones del superadmin generan eventos** en la tabla `events` con `actor_type: 'superadmin'`.

Incluyendo:
- Cambios de status de tienda
- Cambios de plan
- Activación/desactivación de módulos
- Acceso a `impersonate_store`
- Ban/unban de usuarios

El log de superadmin es inmutable. No puede ser borrado ni modificado, ni siquiera por el propio superadmin.

---

## Impersonación de Tienda

El superadmin puede "ver como" cualquier tienda para diagnosticar problemas:

```
GET /superadmin/impersonate/{store_id}
```

Comportamiento:
- Redirige al panel de gestión de esa tienda en modo de solo lectura.
- Una barra visible en la parte superior indica "MODO SUPERADMIN — Solo lectura".
- Ninguna action de escritura está disponible en este modo.
- Genera evento `superadmin_impersonated_store` al iniciar la sesión de impersonación.
- La sesión de impersonación expira en 30 minutos o al cerrar el tab.

---

## Panel de Superadmin — Secciones

```
/superadmin
  /stores          → lista y gestión de tiendas
  /stores/{id}     → detalle de tienda + billing + módulos + eventos
  /plans           → gestión de planes y precios
  /users           → lista de usuarios + bans
  /metrics         → dashboard de métricas de plataforma
  /billing         → log de webhooks + suscripciones
  /system          → errores, cache, operaciones de emergencia
```

---

## Seguridad del Panel de Superadmin

1. **Ruta no indexable.** `/superadmin` no aparece en sitemap ni robots.txt.
2. **Sin link público.** No hay ningún enlace al panel de superadmin en el sitio público.
3. **Autenticación de dos factores (2FA) obligatoria** para el rol superadmin (implementado en Fase 4).
4. **Log de acceso.** Cada inicio de sesión del superadmin genera un evento de auditoría.
5. **Rate limiting estricto.** 20 req/min para el panel de superadmin.
6. **IP allowlist opcional.** El superadmin puede configurar una lista de IPs permitidas (implementado en Fase 4).

---

## Bootstrapping del Superadmin

El superadmin inicial se crea directamente en la DB durante el setup del proyecto:

```sql
-- Ejecutar una sola vez durante el setup inicial
UPDATE users SET role = 'superadmin' WHERE email = 'admin@kitdigital.ar';
```

No existe un endpoint para crear superadmins. El rol solo se puede asignar directamente en la DB por quien tiene acceso al proyecto de Supabase.

Esto es intencional: elimina el riesgo de que un atacante pueda escalar privilegios mediante un endpoint de creación de superadmin.
