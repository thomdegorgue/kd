# Flow: Lifecycle de Tienda — KitDigital.AR

## Propósito

Este archivo define el ciclo de vida completo de una tienda: todos los estados posibles, las transiciones entre ellos, quién las ejecuta, qué eventos generan, y qué efectos tienen sobre la operación.

Es la referencia canónica para implementar el comportamiento del sistema ante cambios de estado de tienda.

→ Modelo de billing: `/system/billing/billing.md`
→ Flujo de usuario de billing: `/system/flows/billing.md`
→ Reglas globales: `/system/constraints/global-rules.md`

---

## Estados de una Tienda

```
            ┌─────────────────────────────────────────┐
            │                                         │
       [DEMO] ──── activación plan ──────────────► [ACTIVE]
            │                                    ↑   │
            │ trial vence                        │   │ pago falla
            ▼                                    │   ▼
       [PAST_DUE] ◄─────────────────────────────────┤
            │       reactivación exitosa          │   │
            │                                    └───┘
            │ 30 días sin pago
            ▼
       [ARCHIVED]
            │
            │ (superadmin override posible en cualquier estado)
            ▼
       [SUSPENDED]  ← solo por acción del superadmin
```

### Tabla de estados

| Estado | Descripción | Quién puede llegar aquí |
|--------|-------------|------------------------|
| `demo` | Trial activo. 14 días. Sin pago. | Creación de tienda (onboarding) |
| `active` | Suscripción vigente. Operación completa. | Webhook MP: pago aprobado |
| `past_due` | Pago fallido o trial vencido. Operación restringida. | Cron / webhook MP |
| `suspended` | Suspendida manualmente. Sin operación. | Superadmin |
| `archived` | Inactiva por > 30 días en `past_due`. Solo datos conservados. | Cron |

---

## Transiciones de Estado

### `demo` → `active`

**Trigger:** Webhook de Mercado Pago confirma pago de primera suscripción.
**Actor del sistema:** `system` (webhook handler)
**Action:** actualización directa de `stores.billing_status` (no pasa por executor de módulos)
**Evento emitido:** `billing_activated`
**Efectos:**
- Vitrina pública: plenamente operativa (sin badge de "en prueba")
- Panel: sin restricciones de plan
- Límites: se actualizan al plan contratado
- Módulos adicionales contratados: se activan

---

### `demo` → `past_due` (trial vencido)

**Trigger:** Cron `check_trial_expiry`, diario 00:00 UTC
**Condición:** `store.trial_ends_at < NOW()` AND `store.billing_status = 'demo'`
**Actor del sistema:** `system` (cron job)
**Evento emitido:** `billing_trial_expired`
**Efectos:**
- Vitrina pública: muestra mensaje "tienda temporalmente inactiva"
- Panel: solo lectura + banner prominente de activación
- Webhook de WhatsApp: deja de generar mensajes
- Módulos: deshabilitados para escritura (solo lectura)
- Los datos de la tienda se conservan íntegros

**Comunicación al dueño:**
- Notificación en panel (próximo login)
- Email informativo (Fase 4)

---

### `active` → `past_due` (pago fallido)

**Trigger:** Webhook de Mercado Pago notifica pago rechazado o suscripción pausada.
**Actor del sistema:** `system` (webhook handler)
**Evento emitido:** `billing_payment_failed`
**Efectos:** (idénticos a demo → past_due)

**Período de gracia:** 3 días en los que Mercado Pago puede reintentar automáticamente.
Si en esos 3 días el pago se aprueba → `past_due → active` sin intervención del dueño.

**Comunicación al dueño:**
- Notificación inmediata en panel
- WhatsApp al número del owner (Fase 4): "Tu pago de KitDigital no pudo procesarse. Actualizá tu método de pago para seguir operando."

---

### `past_due` → `active` (reactivación)

**Trigger:** Webhook de Mercado Pago confirma pago de reactivación.
**Actor del sistema:** `system` (webhook handler)
**Evento emitido:** `billing_reactivated`
**Efectos:**
- Todos los efectos de `past_due` se revierten
- Vitrina pública: operativa nuevamente
- Panel: operación completa restaurada
- Módulos adicionales: los que estaban activos antes se re-habilitan automáticamente
- Límites: se actualizan al plan contratado

---

### `past_due` → `archived` (30 días sin pago)

**Trigger:** Cron `archive_inactive_stores`, diario 12:00 UTC
**Condición:** `store.billing_status = 'past_due'` AND `(NOW() - last_billing_failure_at) > 30 días`
**Actor del sistema:** `system` (cron job)
**Evento emitido:** `billing_store_archived`
**Efectos:**
- Vitrina pública: página de "tienda archivada"
- Panel: acceso bloqueado (solo página de reactivación)
- Datos de la tienda: conservados por 90 días adicionales
- Módulos: todos deshabilitados

**Comunicación al dueño:**
- Notificación en panel (si ingresa)
- Email informativo con instrucciones de reactivación (Fase 4)

---

### `any` → `suspended` (superadmin)

**Trigger:** Acción manual del superadmin desde `/superadmin/stores/{id}`
**Actor:** `superadmin`
**Evento emitido:** `store_suspended`
**Efectos:** Idénticos a `archived` en cuanto a restricciones operativas.
**Reversible:** Sí, por el superadmin (`suspended → active` directo, sin requerir pago).

**Casos de uso para suspensión manual:**
- Actividad fraudulenta detectada
- Solicitud legal
- Violación de términos de servicio

---

### `archived` → `active` (reactivación desde archivo)

**Trigger:** Webhook de Mercado Pago confirma nuevo pago de suscripción.
**Actor del sistema:** `system` (webhook handler)
**Condición:** Solo posible si aún está dentro de los 90 días de retención de datos.
**Evento emitido:** `billing_reactivated`
**Efectos:** Idénticos a `past_due → active`.

Si los 90 días de retención ya vencieron → los datos fueron eliminados por el cron de cleanup. El dueño puede crear una nueva tienda pero no recuperar datos anteriores.

---

### `suspended` → `active` (superadmin levanta suspensión)

**Trigger:** Acción manual del superadmin.
**Actor:** `superadmin`
**Evento emitido:** `store_reactivated`
**Condición:** El superadmin puede activar sin requerir nuevo pago (override de billing).

---

## Tabla de Efectos por Estado

| Efecto | `demo` | `active` | `past_due` | `suspended` | `archived` |
|--------|--------|----------|------------|-------------|-----------|
| Vitrina pública accesible | ✅ (badge) | ✅ | ❌ | ❌ | ❌ |
| Panel de gestión accesible | ✅ | ✅ | ✅ (solo R) | ❌ | ❌ (solo reactiv.) |
| Creates y updates en módulos | ✅ | ✅ | ❌ | ❌ | ❌ |
| Lectura de datos (GET/LIST) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Módulos adicionales activables | ❌ | ✅ | ❌ | ❌ | ❌ |
| WhatsApp cart generación | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cobro de billing | ❌ | ✅ | En gestión | Pausado | Cancelado |
| Datos conservados | ✅ | ✅ | ✅ | ✅ | ✅ (90 días) |

---

## Retención y Eliminación de Datos

| Evento | Datos de la tienda |
|--------|-------------------|
| `demo` → `past_due` | Conservados indefinidamente |
| `active` → `past_due` | Conservados indefinidamente |
| `past_due` → `archived` | Conservados 90 días más |
| 90 días después de `archived` | Eliminados por cron (hard delete programado) |
| `suspended` | Conservados indefinidamente (hasta resolución) |

El cron `delete_expired_archived_stores` (Fase 3) ejecuta el hard delete de tiendas archivadas cuyo período de 90 días venció.

Antes del hard delete:
1. Se envía notificación final al owner (si el email sigue activo)
2. Se genera un snapshot básico en cold storage (para posibles disputas legales) — Fase 5

---

## Crons del Lifecycle

| Cron | Frecuencia | Condición | Transición |
|------|-----------|-----------|-----------|
| `check_trial_expiry` | Diario 00:00 UTC | `demo` con `trial_ends_at < NOW()` | `demo → past_due` |
| `check_billing_due` | Diario 06:00 UTC | `active` con pago MP vencido | `active → past_due` |
| `archive_inactive_stores` | Diario 12:00 UTC | `past_due` por > 30 días | `past_due → archived` |
| `delete_expired_archived_stores` | Semanal | `archived` por > 90 días | Hard delete (Fase 3) |
| `cleanup_cancelled_subscriptions` | Diario 18:00 UTC | `active` con `cancelled_at` y `current_period_end < NOW()` | `active → past_due` |

Todos los crons actúan con `actor_type: system` y generan eventos en `events`.

---

## Efectos en el Executor por Estado

El executor verifica el estado de la tienda en el Paso 2 del pipeline.

| Estado | Comportamiento del executor |
|--------|---------------------------|
| `demo` | Permite actions del CORE. Bloquea actions de módulos adicionales con `STORE_INACTIVE`. |
| `active` | Permite todas las actions para las que el actor tenga permiso y módulos activos. |
| `past_due` | Solo permite actions de lectura (`get_*`, `list_*`). Bloquea creates y updates con `STORE_INACTIVE`. |
| `suspended` | Bloquea todas las actions con `STORE_INACTIVE`. |
| `archived` | Bloquea todas las actions con `STORE_INACTIVE`. |

**El executor no distingue si el `STORE_INACTIVE` viene de `suspended` o `archived`.** Devuelve el mismo código de error. El significado semántico lo gestiona la capa de UI según el estado leído del `StoreContext`.
