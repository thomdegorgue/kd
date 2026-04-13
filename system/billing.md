# Billing — Planes, Suscripciones y Mercado Pago

---

## Modelo

```
Total mensual = precio_plan_base + Σ precio_módulos_adicionales_activos
```

Cobro mediante Mercado Pago Suscripciones (recurrente automático). KitDigital no almacena datos de tarjeta.

---

## Planes

| Plan | Productos | Pedidos/mes | IA Tokens | Módulos incluidos |
|------|-----------|-------------|-----------|-------------------|
| `starter` | 30 | 100 | 0 | CORE (5 módulos) |
| `growth` | 200 | 500 | 1000 | 11 módulos + add-ons |
| `pro` | 1000 | ilimitados | 5000 | Todos (20 módulos) |

Precios definidos por superadmin en tabla `plans`. Trial (demo): 14 días, sin tarjeta, límites del starter.

---

## Módulos Adicionales (add-ons)

Los módulos no incluidos en el plan se cobran como add-on mensual. Precios en `plans.module_prices`.

- Activar: costo se agrega al próximo período. Módulo disponible inmediato.
- Desactivar: módulo se desactiva inmediato. Sin devolución. Costo se quita del próximo período.

---

## Ciclo de Facturación

```
Día 0   → Tienda activada. Primer cobro. billing_cycle_anchor = hoy.
Día 30  → MP cobra automáticamente.
           Éxito → billing_status permanece 'active'. Período renovado.
           Fallo → billing_status → 'past_due'.
Día 60  → 30 días en 'past_due' → billing_status → 'archived'. Datos conservados 90 días.
```

---

## Flujo de Alta de Suscripción

1. Dueño elige plan en `/admin/billing`
2. Backend crea suscripción en MP vía API (`POST /preapproval`)
3. MP devuelve `init_point` (URL de pago)
4. Dueño redirigido a MP para ingresar método de pago
5. MP cobra primer mes y notifica vía webhook
6. Webhook handler: `billing_status → 'active'`, registra `mp_subscription_id`
7. Evento: `subscription_created`

---

## Flujo de Cambio de Plan

- Upgrade (precio mayor): cambio inmediato. Cobro prorrateado de la diferencia.
- Downgrade (precio menor): cambio al inicio del próximo período. Sin devolución.
- Si el nuevo plan tiene límites menores a los activos (ej: 200 productos con plan de 30), el dueño debe reducir primero.

---

## Flujo de Cancelación

1. Dueño cancela desde panel o superadmin cancela manualmente
2. Se cancela suscripción en MP vía API
3. Acceso continúa hasta fin del período actual pagado
4. Al vencer → `past_due` → 30 días → `archived`

---

## Webhooks de Mercado Pago

**Endpoint:** `POST /api/webhooks/mercadopago/billing`

**Pipeline:**
1. Verificar firma HMAC-SHA256 con `MP_WEBHOOK_SECRET`
2. Parsear payload
3. Verificar idempotencia en `billing_webhook_log`
4. Consultar estado actual en API de MP
5. Resolver `store_id` desde `mp_subscription_id`
6. Ejecutar lógica según tipo
7. Registrar evento
8. Marcar como procesado en `billing_webhook_log`
9. Responder 200

**Topics procesados:**
- `payment` (approved): renovar período, `billing_status → 'active'`
- `payment` (rejected/cancelled): `billing_status → 'past_due'` si estaba active
- `subscription_preapproval` (authorized): alta de suscripción
- `subscription_preapproval` (cancelled): registrar `cancelled_at`, acceso hasta fin de período
- `subscription_preapproval` (paused): `billing_status → 'past_due'`

**Reintentos:** webhooks fallidos se encolan en Redis. Max 5 intentos con backoff (1min, 5min, 15min, 1h, 6h). Después → `failed` + alerta a superadmin.

---

## Reglas de Billing

1. Nunca cobrar dos veces el mismo período (idempotencia por `mp_payment_id`).
2. Billing de KitDigital es independiente del módulo `payments` (que gestiona cobros del dueño a sus clientes).
3. Precios siempre de tabla `plans`. Nunca hardcodeados.
4. Límites se aplican en tiempo de ejecución vía executor.
5. Superadmin puede override de billing manualmente. Siempre con evento registrado.

---

## Observabilidad

- Toda ejecución de webhook persiste en `billing_webhook_log` los campos: `mp_event_id`, `topic`, `store_id`, `raw_payload`, `status`, `error`, `processing_time_ms` (ms desde recepción hasta fin del handler), `result` (texto breve: ej. `subscription_renewed`, `ignored_duplicate`), `processed_at`.
- Si la cola de reintentos en Redis supera 20 ítems pendientes: emitir evento `billing_retry_queue_alert` con `actor_type: 'system'` y notificar al superadmin en su dashboard.
- Dashboard de superadmin muestra: webhooks procesados/fallidos en las últimas 24h, reintentos pendientes, tiempo promedio de procesamiento.
