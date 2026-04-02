# Billing Webhooks — KitDigital.AR

## Propósito

Este archivo define cómo el sistema procesa los webhooks de Mercado Pago relacionados con el billing de KitDigital (cobro de suscripciones a dueños de tienda).

No cubre los webhooks de pagos de clientes hacia las tiendas (eso es el módulo `payments`).

→ Modelo de billing: `/system/billing/billing.md`
→ Superadmin: `/system/superadmin/superadmin.md`

---

## Endpoint

```
POST /api/webhooks/mercadopago/billing
```

Este endpoint es **público** (sin autenticación de sesión de usuario).
La autenticación se realiza verificando la firma del webhook de Mercado Pago.

---

## Tipos de Notificación Relevantes

Mercado Pago envía notificaciones (`topic`) para distintos eventos. Solo procesamos los siguientes:

| Topic | Acción en KitDigital |
|-------|---------------------|
| `subscription_preapproval` | Alta, baja o cambio de estado de una suscripción |
| `payment` | Confirmación o fallo de un cobro recurrente |

Cualquier otro topic recibe respuesta `200 OK` sin procesamiento (para que Mercado Pago no reintente).

---

## Pipeline de Procesamiento de Webhook

Cada webhook entrante sigue este pipeline:

```
[1] Verificar firma del webhook (HMAC-SHA256 con secret de MP)
        │ FALLA → 401. Log de intento inválido.
        │ OK
        ▼
[2] Parsear payload. Extraer topic + resource ID
        │ FALLA → 400. Log de payload malformado.
        │ OK
        ▼
[3] Verificar idempotencia (¿ya procesamos este payment_id / subscription_id + estado?)
        │ YA PROCESADO → 200 OK sin hacer nada (idempotente)
        │ NUEVO
        ▼
[4] Consultar estado actual en API de Mercado Pago (GET /v1/payments/{id})
        │ FALLA → 500. Encolar para reintento.
        │ OK
        ▼
[5] Resolver store_id a partir de mp_subscription_id
        │ NO ENCONTRADO → 200 OK + log de advertencia (suscripción desconocida)
        │ ENCONTRADO
        ▼
[6] Ejecutar lógica según tipo de evento (ver secciones abajo)
        │
        ▼
[7] Registrar evento en tabla `events` (actor_type: 'system')
        ▼
[8] Marcar notificación como procesada (tabla billing_webhook_log)
        ▼
[9] Responder 200 OK a Mercado Pago
```

Si el paso [9] no se responde dentro de 5 segundos, Mercado Pago reintentará.
Por eso la lógica pesada se encola en background si es necesario, respondiendo 200 inmediatamente.

---

## Verificación de Firma

Mercado Pago firma cada webhook con HMAC-SHA256 usando el `WEBHOOK_SECRET` configurado en el panel de MP.

```typescript
const signature = request.headers['x-signature']
const requestId = request.headers['x-request-id']
const rawBody   = await request.text()

const expectedSignature = crypto
  .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
  .update(`id=${requestId};request-body=${rawBody}`)
  .digest('hex')

if (signature !== `ts=${timestamp},v1=${expectedSignature}`) {
  return 401
}
```

Si la firma no coincide, el request se rechaza inmediatamente sin procesar ningún dato.

---

## Idempotencia

Antes de procesar cualquier evento, se verifica si ya fue procesado:

```sql
SELECT id FROM billing_webhook_log
WHERE mp_event_id = ? AND status = 'processed'
```

Si existe → devolver `200 OK` sin ejecutar nada.

Al terminar el procesamiento exitoso:
```sql
INSERT INTO billing_webhook_log (mp_event_id, topic, store_id, status, processed_at)
VALUES (?, ?, ?, 'processed', NOW())
```

**`billing_webhook_log`** es la tabla de control de idempotencia. Campos:
- `mp_event_id` — ID del evento de Mercado Pago (único)
- `topic` — tipo de notificación
- `store_id` — tienda afectada
- `status` — `pending` | `processed` | `failed`
- `raw_payload` — JSONB con el payload completo
- `processed_at` — timestamp

---

## Lógica por Tipo de Evento

### `payment` — Pago aprobado (`status: approved`)

```
1. Verificar que payment.type == 'recurring_payment'
2. Resolver store_id desde mp_subscription_id
3. Calcular nuevo período:
   current_period_start = hoy
   current_period_end   = hoy + 30 días
4. Actualizar stores:
   billing_status        → 'active'
   current_period_start  = nuevo_inicio
   current_period_end    = nuevo_fin
5. Emitir evento: billing_payment_approved
```

---

### `payment` — Pago fallido (`status: rejected` o `status: cancelled`)

```
1. Verificar que payment.type == 'recurring_payment'
2. Resolver store_id desde mp_subscription_id
3. Si store.billing_status == 'active':
   → stores.billing_status = 'past_due'
   → Emitir evento: billing_payment_failed
4. Si store.billing_status ya es 'past_due':
   → No cambiar estado, solo loguear el reintento fallido
   → Emitir evento: billing_payment_retry_failed
```

---

### `subscription_preapproval` — Suscripción creada (`status: authorized`)

```
1. Resolver store_id desde el external_reference enviado en la creación
2. Actualizar stores:
   mp_subscription_id    = subscription.id
   mp_customer_id        = subscription.payer_id
   billing_status        → 'active'
   billing_cycle_anchor  = hoy
   current_period_start  = hoy
   current_period_end    = hoy + 30 días
3. Emitir evento: billing_activated
```

---

### `subscription_preapproval` — Suscripción cancelada (`status: cancelled`)

```
1. Resolver store_id desde mp_subscription_id
2. Si store.billing_status == 'active':
   → No cambiar status inmediatamente
   → Registrar cancelled_at = hoy
   → El acceso continúa hasta current_period_end
   → El cron check_billing_due manejará el vencimiento
3. Emitir evento: billing_subscription_cancelled
```

---

### `subscription_preapproval` — Suscripción pausada (`status: paused`)

```
1. Resolver store_id
2. stores.billing_status → 'past_due'
3. Emitir evento: billing_payment_failed
```

---

## Manejo de Errores y Reintentos

| Situación | Comportamiento |
|-----------|---------------|
| API de MP no responde (Paso 4) | Encolar en Redis para reintento en 60 segundos. Responder 200 a MP. |
| Error de DB al actualizar tienda | Rollback, marcar webhook como `failed`, alertar al superadmin. |
| store_id no encontrado | Log de advertencia. Responder 200 (no reintentar). |
| Firma inválida | Log de seguridad. Responder 401. |
| Payload malformado | Log de error. Responder 400. |

Mercado Pago reintenta el webhook si no recibe 200 en 5 segundos, con backoff exponencial hasta 24 horas.
Por eso la idempotencia es crítica: los reintentos no deben duplicar efectos.

---

## Cola de Reintentos

Los webhooks que fallan en el paso de actualización de DB se encolan en Upstash Redis:

```
Queue: billing_webhook_retry
Payload: { mp_event_id, topic, store_id, raw_payload, attempt, next_retry_at }
Max intentos: 5
Backoff: 1min, 5min, 15min, 1hora, 6horas
```

Después de 5 intentos fallidos → el evento queda en estado `failed` y genera una alerta para el superadmin.

---

## Seguridad

1. **Verificación de firma en todo request.** Sin excepciones, incluso en desarrollo.
2. **El endpoint no requiere sesión de usuario.** La autenticación es la firma de MP.
3. **No se procesa ningún dato antes de verificar la firma.**
4. **La IP de origen se loguea** pero no se usa como método de autenticación (las IPs de MP pueden cambiar).
5. **El `mp_event_id` es la clave de idempotencia**, no el estado de la tienda. El estado de la tienda puede cambiar manualmente; el evento de MP no.
6. **El raw payload se almacena** en `billing_webhook_log.raw_payload` para auditoría y debugging.

---

## Variables de Entorno Requeridas

| Variable | Descripción |
|----------|-------------|
| `MP_WEBHOOK_SECRET` | Secret para verificar firma HMAC-SHA256 |
| `MP_ACCESS_TOKEN` | Token de acceso a la API de Mercado Pago (para GET de pagos) |
| `MP_PUBLIC_KEY` | Clave pública (para el frontend de billing) |
