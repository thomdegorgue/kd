# Billing — Planes, Suscripciones y Mercado Pago

---

## Modelo de Billing (Dual)

KitDigital soporta dos modalidades de pago. El dueño elige al activar su cuenta y puede migrar en cualquier momento.

### Plan Mensual (MP Preapproval / Suscripciones)

```
precio_mensual = ceil(max_products / 100) × price_per_100_products
              + Σ_módulos_pro_activos × pro_module_price
```

- Cobro recurrente automático cada 30 días.
- Módulos pro = add-on individual; se activan/desactivan en cualquier momento.
- Solo acepta tarjeta de crédito (restricción de MP Preapproval).
- `stores.billing_period = 'monthly'`

### Plan Anual (MP Checkout Pro / Pago Único)

```
precio_anual = ceil(max_products / 100) × price_per_100_products × (12 - annual_discount_months)
```

- `plans.annual_discount_months` = 2 por defecto → el dueño paga 10 meses y obtiene 12 meses de acceso (2 meses gratis).
- **Incluye todos los módulos base + todos los módulos pro, EXCEPTO `assistant`** (los módulos pro se activan automáticamente al confirmar el pago).
- Acepta débito y crédito (MP Checkout Pro sin restricción de medio de pago).
- `stores.billing_period = 'annual'`, `stores.annual_paid_until = fecha_de_pago + 365 días`.
- Al vencer `annual_paid_until` → `billing_status → 'past_due'` (vía cron).

Ambos precios (`price_per_100_products`, `pro_module_price`, `annual_discount_months`) son configurables por superadmin en tabla `plans`.

---

## Schema — Columnas Nuevas (Migración F13)

```sql
-- stores: soporte billing dual
ALTER TABLE stores ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'monthly'
  CHECK (billing_period IN ('monthly', 'annual'));
ALTER TABLE stores ADD COLUMN annual_paid_until DATE;  -- solo para billing_period = 'annual'

-- plans: configuración de descuento anual y cap global de tiendas
ALTER TABLE plans ADD COLUMN annual_discount_months INTEGER NOT NULL DEFAULT 2;
ALTER TABLE plans ADD COLUMN max_stores_total INTEGER;  -- NULL = sin límite

-- billing_payments: asegurar que mp_subscription_id sea nullable (pagos anuales no tienen suscripción)
ALTER TABLE billing_payments ALTER COLUMN mp_subscription_id DROP NOT NULL;
```

Estos ALTER deben ejecutarse en el SQL Editor de Supabase antes de desplegar F13 (ver PASOS-MANUALES.md §16).

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

## Plan Anual — Flujo Completo

### Alta

1. Dueño elige "Plan Anual" en `/admin/billing` y selecciona su tier de productos.
2. Backend calcula `precio_anual` con `calculateAnnualPrice()` en `billing/calculator.ts`.
3. Backend crea MP Checkout Preference (`POST /checkout/preferences`) con el monto anual y `external_reference = store_id`.
4. Dueño redirigido a MP para pagar (débito o crédito).
5. MP notifica vía webhook `topic: payment`, `status: approved`.
6. Webhook handler detecta `billing_period = 'annual'` por el campo `external_reference` o por la ausencia de `preapproval_id` en el payload.
7. Handler actualiza:
   - `stores.billing_status = 'active'`
   - `stores.billing_period = 'annual'`
   - `stores.annual_paid_until = NOW() + INTERVAL '365 days'`
   - `stores.modules` → activa todos los módulos pro excepto `assistant`
8. Registra evento `annual_subscription_created` con `{ amount, paid_until, modules_activated }`.

### Renovación

El plan anual no se renueva automáticamente. Al acercarse `annual_paid_until`:
- Cron `check-billing` a 14 días antes: envía email de aviso (template `trial-expiring` reutilizable).
- Al día 0 (`annual_paid_until < hoy`): `billing_status → 'past_due'`. Módulos pro se desactivan automáticamente.
- El dueño puede renovar desde `/admin/billing` generando un nuevo Checkout Preference.

### Cancelación / Downgrade a mensual

- Dueño puede cambiar a plan mensual antes de que venza `annual_paid_until` — el acceso anual continúa hasta `annual_paid_until`; al vencer, el sistema cobra la primera cuota mensual.
- No hay devolución prorrateada del plan anual.

### Webhook — Distinguir pago anual vs mensual

```
topic: payment     → puede ser anual (único) o renovación mensual
topic: preapproval → siempre mensual (MP Suscripciones)
```

Para diferenciar dentro de `topic: payment`:
- Si el payload contiene `preapproval_id` → pago de cuota mensual.
- Si no contiene `preapproval_id` y `external_reference = store_id` → pago anual único.

---

## Cap Global de Tiendas

`plans.max_stores_total` (INTEGER, nullable):
- `NULL` = sin límite (modo desarrollo / superadmin ilimitado).
- Valor positivo = cantidad máxima de tiendas no-archivadas permitidas en toda la plataforma.

**Validación en `create_store` (`src/lib/executor/handlers/stores.ts`):**
```typescript
const { data: plan } = await db.from('plans').select('max_stores_total').single()
if (plan.max_stores_total !== null) {
  const { count } = await db.from('stores')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'archived')
  if (count >= plan.max_stores_total) {
    return { error: 'STORE_CAP_REACHED' }
  }
}
```

**Endpoint público `/api/stores/capacity`** (GET):
- Devuelve `{ available: number | null }` — `null` si sin límite.
- Usado por la landing page para mostrar cupos disponibles en tiempo real.
- Superadmin edita `max_stores_total` desde `/superadmin/settings` (junto al panel de precios).

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

### Plan Mensual

```
Día 0   → Tienda activada. Primer cobro. billing_cycle_anchor = hoy.
Día 30  → MP cobra automáticamente.
           Éxito → billing_status permanece 'active'. Período renovado.
           Fallo → billing_status → 'past_due'.
Día 60  → 30 días en 'past_due' → billing_status → 'archived'. Datos conservados 90 días.
```

### Plan Anual

```
Día 0   → Pago único confirmado. annual_paid_until = hoy + 365d.
Día 351 → Cron envía email aviso de vencimiento (14 días antes).
Día 365 → annual_paid_until vencido → billing_status → 'past_due'.
           Módulos pro se desactivan.
Día 395 → 30 días en 'past_due' → billing_status → 'archived'.
```

---

## Flujo de Alta — Plan Mensual

1. Dueño elige "Plan Mensual" en `/admin/billing`
2. Backend crea suscripción en MP vía API (`POST /preapproval`)
3. MP devuelve `init_point` (URL de pago)
4. Dueño redirigido a MP para ingresar tarjeta de crédito
5. MP cobra primer mes y notifica vía webhook `topic: preapproval, status: authorized`
6. Webhook handler: `billing_status → 'active'`, `billing_period = 'monthly'`, registra `mp_subscription_id`
7. Evento: `subscription_created`

## Flujo de Alta — Plan Anual

Ver sección "Plan Anual — Flujo Completo" arriba.

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
- `payment` (approved) **sin** `preapproval_id`: pago único anual → activar `billing_period = 'annual'`, `annual_paid_until = +365d`, activar módulos pro (excepto `assistant`)
- `payment` (approved) **con** `preapproval_id`: renovación mensual → renovar período, `billing_status → 'active'`
- `payment` (rejected/cancelled): `billing_status → 'past_due'` si estaba active
- `subscription_preapproval` (authorized): alta de suscripción mensual
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
