# Billing — KitDigital.AR

## Propósito

Este archivo define el modelo de facturación de KitDigital como plataforma SaaS: cómo se cobran las suscripciones, cómo se gestionan los módulos adicionales, y cómo el ciclo de billing afecta el estado de la tienda.

No define los flujos de pago de las tiendas hacia sus propios clientes (eso es el módulo `payments`).
No define los webhooks de Mercado Pago (eso está en `/system/billing/webhooks.md`).

→ Modelo de negocio: `/docs/business.md`
→ Lifecycle de tienda: `/system/flows/lifecycle.md`
→ Webhooks de Mercado Pago: `/system/billing/webhooks.md`
→ Superadmin: `/system/superadmin/superadmin.md`

---

## Concepto Central

KitDigital cobra a los dueños de tienda una **suscripción mensual** compuesta por:

```
Total mensual = precio_plan_base + Σ precio_módulos_adicionales_activos
```

El cobro se realiza mediante **Mercado Pago Suscripciones** (pagos recurrentes automáticos).
KitDigital **no almacena** datos de tarjetas. Mercado Pago gestiona el cobro recurrente.

---

## Planes Base

| Plan | Precio base (ARS/mes) | Límites incluidos |
|------|----------------------|-------------------|
| `starter` | $X | max_products: 30, max_orders_month: 100 |
| `growth` | $XX | max_products: 200, max_orders_month: 500 |
| `pro` | $XXX | max_products: 1000, max_orders_month: ilimitado |

Los precios concretos los define el superadmin en `plans`. Los valores aquí son referenciales.
El plan `demo` no tiene cobro. Tiene límites más restrictivos y vence en 14 días.

---

## Módulos Adicionales

Los módulos que no están incluidos en el plan base se cobran como add-ons mensuales.
El precio de cada módulo está definido en la tabla `plans` (como JSONB `module_prices`).

Cuando se activa un módulo adicional:
1. El costo se agrega a la suscripción del próximo período de facturación.
2. El módulo queda inmediatamente disponible (no espera al siguiente ciclo).
3. El primer cobro es proporcional a los días restantes del período actual (prorrateo).

Cuando se desactiva un módulo adicional:
1. El módulo se desactiva inmediatamente.
2. No hay devolución (sin crédito por días no utilizados).
3. El costo se elimina del próximo período de facturación.

---

## Ciclo de Facturación

El billing opera en ciclos mensuales. Cada tienda tiene su propia fecha de renovación (`billing_cycle_anchor`), fijada en el día de activación.

```
Día 0  → Tienda activada. Primer cobro. billing_cycle_anchor = hoy.
Día 30 → Mercado Pago cobra automáticamente.
         Éxito → store.status permanece 'active', billing_period se renueva.
         Fallo → store.status → 'past_due'. Período de gracia: 3 días.
Día 33 → Si no se regularizó → store.status permanece 'past_due'.
         El cron diario monitorea el estado.
Día 63 → 30 días en 'past_due' → store.status → 'archived'. Datos conservados 90 días.
```

---

## Estados de Billing de una Tienda

| Status | Descripción | Operaciones permitidas |
|--------|-------------|----------------------|
| `demo` | Trial activo (14 días) | CORE + módulos base. Sin billing. |
| `active` | Suscripción al día | Todo |
| `past_due` | Pago fallido / vencido | Solo lecturas. No creates ni writes críticos. |
| `suspended` | Suspendida manualmente por superadmin | Ninguna |
| `archived` | >30 días en `past_due` o archivada manualmente | Ninguna. Datos conservados 90 días. |

Las transiciones de estado son ejecutadas por:
- El cron `check_billing_due` (automático, `actor_type: system`)
- El webhook de Mercado Pago al recibir pago (automático, `actor_type: system`)
- El superadmin (manual, `actor_type: superadmin`)

Cada transición genera un evento `billing_status_changed` en la tabla `events`.

---

## Estructura de Datos de Billing

### Tabla `plans`
Define los planes disponibles. Solo el superadmin puede crear o modificar planes.

| Campo | Descripción |
|-------|-------------|
| `id` | UUID |
| `name` | Nombre del plan (`starter`, `growth`, `pro`) |
| `price_monthly` | Precio base mensual en centavos |
| `limits` | JSONB: `{ max_products, max_orders_month, ai_tokens, ... }` |
| `module_prices` | JSONB: `{ stock: 1500, payments: 2000, ... }` (centavos/mes) |
| `is_active` | Si el plan está disponible para nuevas tiendas |

### Campos de billing en `stores`

| Campo | Descripción |
|-------|-------------|
| `plan_id` | FK → `plans.id` |
| `billing_status` | Estado actual del billing (`demo`, `active`, `past_due`, etc.) |
| `trial_ends_at` | Fecha de vencimiento del trial (solo para demo) |
| `billing_cycle_anchor` | Día del mes de renovación |
| `current_period_start` | Inicio del período actual |
| `current_period_end` | Fin del período actual |
| `mp_subscription_id` | ID de la suscripción en Mercado Pago |
| `mp_customer_id` | ID del cliente en Mercado Pago |

---

## Flujo de Alta de Suscripción

1. El dueño de tienda elige su plan desde el panel.
2. KitDigital crea una suscripción en Mercado Pago via API.
3. Mercado Pago devuelve una `init_point` (URL de pago).
4. El usuario es redirigido a Mercado Pago para ingresar su método de pago.
5. Mercado Pago cobra el primer mes y notifica via webhook.
6. El webhook handler actualiza `stores.billing_status → 'active'` y registra `mp_subscription_id`.
7. Se emite evento `billing_activated`.

---

## Flujo de Cambio de Plan

1. El dueño de tienda selecciona el nuevo plan.
2. Si el nuevo plan tiene un precio mayor:
   - Se actualiza el plan inmediatamente.
   - Se cobra la diferencia prorrateada por los días restantes del período.
3. Si el nuevo plan tiene un precio menor (downgrade):
   - El cambio se aplica al inicio del próximo período de facturación.
   - No hay devolución del período actual.
4. Si el nuevo plan tiene límites menores a los activos actualmente (ej: downgradear con 50 productos habiendo 200), el dueño debe reducir primero.

---

## Flujo de Cancelación

1. El dueño cancela desde el panel o el superadmin cancela manualmente.
2. Se cancela la suscripción en Mercado Pago via API.
3. El acceso continúa hasta el fin del período actual ya pagado.
4. Al vencer el período → `billing_status → 'past_due'`.
5. A los 30 días en `past_due` → `billing_status → 'archived'`.

---

## Flujo de Reactivación

Una tienda `past_due` o `archived` puede reactivarse:

1. El dueño inicia el proceso de pago desde el panel (o el superadmin reactiva).
2. Se genera una nueva suscripción en Mercado Pago.
3. Se cobra el monto adeudado + el período vigente.
4. Al confirmar el pago → `billing_status → 'active'`.
5. Se emite evento `billing_reactivated`.

---

## Período de Gracia y Comunicación

| Evento | Comunicación |
|--------|-------------|
| 3 días antes del vencimiento | Notificación por WhatsApp al owner |
| Pago fallido | Notificación inmediata por WhatsApp al owner |
| Día 1 en `past_due` | Notificación por WhatsApp con link de pago |
| Día 7 en `past_due` | Segunda notificación + advertencia de archivado |
| Día 25 en `past_due` | Notificación final: archivado en 5 días |
| Archivado | Notificación + instrucciones de reactivación |

Las notificaciones se envían al número WhatsApp registrado como `store.owner_phone`.
No se implementan en Fase 0. Se activan en Fase 4 (Billing completo).

---

## Reglas de Billing

1. **Nunca cobrar dos veces el mismo período.** La idempotencia se garantiza verificando `mp_payment_id` en la tabla de pagos de billing antes de procesar un webhook.

2. **El billing de KitDigital es independiente del módulo `payments`.** El módulo `payments` gestiona los cobros de las tiendas a sus clientes. Billing gestiona los cobros de KitDigital a las tiendas. Son dos sistemas separados.

3. **Los precios se leen siempre de la tabla `plans`.** No hay precios hardcodeados en el código.

4. **Los límites del plan se aplican en tiempo de ejecución.** Si el plan cambia, los nuevos límites aplican de inmediato para las operaciones siguientes.

5. **El superadmin puede overridear el billing manualmente.** Puede activar, suspender, o archivar una tienda independientemente del estado de Mercado Pago. Siempre queda registrado como evento.
