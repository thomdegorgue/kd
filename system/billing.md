# Billing — Planes, Suscripciones y Mercado Pago

---

## Modelo

```
Total mensual = ceil(max_products / 100) × precio_por_100 + Σ módulos_pro_activos × precio_por_módulo
```

Cobro mediante Mercado Pago Suscripciones (recurrente automático). KitDigital no almacena datos de tarjeta.

Ambos precios (`precio_por_100` y `precio_por_módulo`) son configurables por superadmin en tabla `plans`.

---

## Precio Base — Tier de Productos

El dueño elige cuántos productos quiere poder tener (tier). El precio escala linealmente:

| Tier (max productos) | Precio/mes |
|----------------------|------------|
| 100                  | $20,000 ARS |
| 200                  | $40,000 ARS |
| 300                  | $60,000 ARS |
| N × 100              | N × $20,000 ARS |

Fórmula: `ceil(max_products / 100) × price_per_100_products` (almacenado en `plans.price_per_100_products`, en centavos ARS).

`stores.limits.max_products` define el tier de cada tienda. Se fija al activar la suscripción y se puede cambiar (ver flujo de cambio de tier).

---

## Módulos Pro — Add-on Mensual

Los 9 módulos pro tienen precio fijo por módulo activo: **`plans.pro_module_price`** (por defecto $5,000 ARS/mes en centavos).

**Módulos base** (incluidos sin cargo adicional): `catalog`, `products`, `categories`, `cart`, `orders`, `stock`, `payments`, `banners`, `social`, `product_page`, `shipping`.

**Módulos pro** (add-on mensual): `variants`, `wholesale`, `finance`, `expenses`, `savings_account`, `multiuser`, `custom_domain`, `tasks`, `assistant`.

- **Activar módulo pro:** módulo disponible inmediato. Costo se suma al próximo período.
- **Desactivar módulo pro:** módulo se desactiva inmediato. Sin devolución. Costo se quita del próximo período.

---

## Trial

14 días, sin tarjeta. Límites: `plans.trial_max_products` productos (por defecto 100), módulos base activos, sin módulos pro. Al vencer → se ofrece activar suscripción o la tienda pasa a `past_due`.

---

## Recálculo de Precio

El precio de la suscripción cambia cuando:
1. El dueño cambia su tier de productos (`stores.limits.max_products`).
2. El dueño activa o desactiva un módulo pro.

**Flujo de recálculo:**
1. Calcular nuevo `total = ceil(max_products / 100) × price_per_100_products + cant_pro_activos × pro_module_price`.
2. Cancelar la suscripción actual en MP (`PUT /preapproval/{id}` con `status: cancelled`).
3. Crear nueva suscripción en MP con el nuevo monto.
4. Registrar evento `subscription_price_updated` con `{ old_amount, new_amount, reason }`.

No hay proration automática via MP — si el dueño hace upgrade a mitad de período, el nuevo precio aplica desde el próximo ciclo (o se cobra la diferencia manualmente si el superadmin lo decide).

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

## Flujo de Cambio de Tier de Productos

- **Upgrade** (más productos): cambio inmediato. El nuevo precio aplica desde el próximo período (sin cobro adicional inmediato — se recalcula la suscripción de MP).
- **Downgrade** (menos productos): solo posible si `count(productos_activos) ≤ nuevo_tier`. Si el dueño tiene más productos que el nuevo tier, debe eliminar/desactivar productos primero. El cambio aplica al inicio del próximo período.
- Ambos casos disparan el flujo de recálculo de precio (cancelar + crear nueva suscripción en MP).

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
