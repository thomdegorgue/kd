# Flow: Billing — KitDigital.AR

## Propósito

Este archivo define los flujos de interacción del usuario relacionados con el billing: activación de plan, activación de módulos adicionales, cambio de plan, y reactivación tras vencimiento.

No define el modelo de facturación (eso está en `/system/billing/billing.md`).
No define el procesamiento de webhooks (eso está en `/system/billing/webhooks.md`).

→ Modelo de billing: `/system/billing/billing.md`
→ Webhooks de Mercado Pago: `/system/billing/webhooks.md`
→ Lifecycle de tienda: `/system/flows/lifecycle.md`

---

## Flujo 1 — Activación de Plan (trial → active)

**Cuándo ocurre:** El dueño elige activar su plan durante o al vencer el trial.
**URL:** `/admin/billing/activar`
**Actor:** `user` (role: owner)

### Pasos:

**1. Pantalla de selección de plan**

El usuario ve los 3 planes (`starter`, `growth`, `pro`) con:
- Precio mensual
- Límites incluidos
- Lista de módulos del CORE incluidos
- Módulos adicionales disponibles (con precio)
- CTA "Elegir este plan"

El plan actual (demo) aparece indicado. Se recomienda `starter` por defecto.

**2. Confirmación del plan elegido**

Resumen antes del pago:
- Plan seleccionado + precio
- Módulos adicionales elegidos (si el usuario preseleccionó alguno)
- Total mensual
- Botón "Ir al pago"

**3. Redirección a Mercado Pago**

El backend ejecuta:
```
1. POST /v1/preapproval a la API de Mercado Pago
   → body: { reason, external_reference: store_id, auto_recurring: { frequency: 1, frequency_type: months, transaction_amount: total } }
2. MP devuelve { id: subscription_id, init_point: url_de_pago }
3. Stores mp_subscription_id_pending = subscription_id (estado pendiente)
4. Redirect del usuario a init_point (Mercado Pago)
```

El usuario completa el pago en el entorno de Mercado Pago (KitDigital nunca toca datos de tarjeta).

**4. Retorno post-pago**

Mercado Pago redirige al usuario a `/admin/billing/confirmacion?status=approved|failure|pending`

| Status | Qué muestra el frontend |
|--------|------------------------|
| `approved` | "¡Tu tienda está activa! Ya podés operar sin límites." + CTA al dashboard |
| `pending` | "El pago está procesándose. Te avisamos cuando esté confirmado." |
| `failure` | "Hubo un problema con el pago. Podés intentarlo de nuevo." + reintentar |

**Importante:** La pantalla de retorno es solo informativa. El cambio real de estado (`demo → active`) lo hace el webhook de Mercado Pago, no esta pantalla. El frontend puede mostrar el estado optimista si el status es `approved`, pero el estado canónico viene del webhook.

**5. Webhook confirma el pago**

El webhook handler (`/api/webhooks/mercadopago/billing`) procesa el evento:
- `store.billing_status → 'active'`
- `store.mp_subscription_id` ← actualizado
- Emite evento `billing_activated`

→ Ver detalle en `/system/billing/webhooks.md`

---

## Flujo 2 — Activación de Módulo Adicional

**Cuándo ocurre:** El dueño activa un módulo desde la sección de módulos del panel.
**URL:** `/admin/configuracion/modulos`
**Actor:** `user` (role: owner)
**Requiere:** `store.billing_status === 'active'`

### Pasos:

**1. Vista de módulos**

Lista de todos los módulos disponibles, organizados por categoría:
- CORE (incluidos en todos los planes, ya activos)
- Módulos adicionales (con precio/mes y descripción)

Cada módulo adicional muestra:
- Descripción de qué hace
- Precio mensual
- Estado: activo / inactivo
- Botón: "Activar" / "Desactivar"

**2. Confirmación de activación**

Al hacer click en "Activar [módulo]":
- Modal de confirmación: "Activar [módulo] — $X/mes adicionales a tu plan. El cobro se prorrateará hasta tu próxima fecha de renovación. ¿Confirmar?"
- Botón "Activar" + "Cancelar"

**3. Ejecución**

Action `enable_module` → executor:
- Verifica que la tienda está `active`
- Verifica que el módulo no está ya activo
- Actualiza `store.modules[module_name] = true`
- Actualiza el costo de la suscripción en Mercado Pago via API (agregando el módulo al recargo)
- Emite evento `module_enabled`

El módulo queda inmediatamente disponible en el panel (sin recargar la página).

**4. Confirmación visual**

Toast: "[Módulo] activado. Ya podés usarlo desde el menú."
El toggle del módulo pasa a "activo".
La sección del módulo aparece en la navegación del panel.

### Desactivación de módulo:

Flujo simétrico. Modal de confirmación: "Desactivar [módulo] — El módulo se desactivará de inmediato y no se cargará a partir del próximo período."

Si el módulo tiene datos activos (ej: desactivar `stock` con ítems de stock creados) → advertencia adicional: "Tus datos de [módulo] no se borrarán. Si lo reactivás en el futuro, los encontrarás intactos."

---

## Flujo 3 — Cambio de Plan

**Cuándo ocurre:** El dueño sube o baja su plan.
**URL:** `/admin/billing/cambiar-plan`
**Actor:** `user` (role: owner)
**Requiere:** `store.billing_status === 'active'`

### Upgrade (plan de mayor precio):

1. El usuario selecciona el plan superior.
2. Resumen: plan actual → nuevo plan, diferencia de precio prorrateada.
3. Confirma → se actualiza la suscripción en Mercado Pago y se cobra la diferencia prorrateada inmediatamente.
4. `store.plan_id` se actualiza.
5. Los nuevos límites aplican de inmediato.
6. Emite evento `billing_plan_changed`.

### Downgrade (plan de menor precio):

1. El usuario selecciona el plan inferior.
2. Validación previa: si el uso actual supera los límites del nuevo plan → se muestra advertencia específica:
   - "Tenés 150 productos activos. El plan Starter permite 30. Necesitás desactivar al menos 120 productos antes de hacer el downgrade."
   - El downgrade se bloquea hasta que el usuario reduzca su uso.
3. Si pasa la validación → el cambio se programa para el inicio del próximo período.
4. El sistema muestra: "Tu plan cambiará a [plan] el [fecha de renovación]."
5. Hasta esa fecha, el plan actual sigue activo.
6. En la fecha de renovación, el webhook de pago aplica el nuevo plan.

---

## Flujo 4 — Reactivación tras Vencimiento

**Cuándo ocurre:** La tienda está en `past_due` y el dueño quiere reactivarla.
**URL:** `/admin/billing/reactivar`
**Accesible incluso con tienda en `past_due`**

### Pasos:

1. El panel muestra un banner prominente de tienda suspendida con CTA "Reactivar tienda".

2. Al hacer click → pantalla de reactivación:
   - Resumen del adeudo (si aplica)
   - Plan actual (el que tenía antes de vencer)
   - Total a pagar para reactivar
   - Botón "Pagar y reactivar"

3. Redirección a Mercado Pago (igual que Flujo 1, Paso 3).

4. Al confirmar el pago → webhook actualiza `billing_status → 'active'`.
   - La vitrina vuelve a ser accesible.
   - Los módulos que estaban activos antes vuelven a estar activos.
   - Emite evento `billing_reactivated`.

---

## Flujo 5 — Cancelación de Suscripción

**Cuándo ocurre:** El dueño decide cancelar voluntariamente.
**URL:** `/admin/billing/cancelar`
**Actor:** `user` (role: owner)

### Pasos:

1. El usuario navega a Configuración → Billing → "Cancelar suscripción".

2. Pantalla de cancelación con:
   - Recordatorio de lo que perderá (módulos, límites)
   - Fecha hasta la que puede seguir usando la tienda (fin del período actual)
   - Campo opcional: motivo de cancelación (feedback para el negocio)
   - Botón "Confirmar cancelación" (destructivo, requiere confirmación adicional: tipear "CANCELAR")

3. Al confirmar:
   - Se cancela la suscripción en Mercado Pago via API.
   - `store.billing_status` no cambia inmediatamente (sigue `active` hasta `current_period_end`).
   - Se guarda `store.cancelled_at = hoy`.
   - Emite evento `billing_subscription_cancelled`.

4. El panel muestra: "Tu suscripción está cancelada. Podés seguir usando tu tienda hasta el [fecha]."

5. Al vencer el período actual → el cron detecta la cancelación y cambia a `past_due`.

---

## Pantalla de Billing (resumen)

**URL:** `/admin/billing`
**Visible para:** role `owner`

La pantalla de billing muestra en un solo lugar:

| Sección | Contenido |
|---------|-----------|
| Plan actual | Nombre, precio, fecha de renovación, botón "Cambiar plan" |
| Módulos activos | Lista con precio individual y botón "Desactivar" |
| Total mensual | Suma del plan + módulos |
| Estado de pago | `active` / `past_due` / `demo` con días restantes |
| Historial | Últimos 6 pagos (fecha, monto, estado) |
| Acciones | "Agregar módulo", "Cancelar suscripción" |

Si la tienda está en `demo` → la sección de billing muestra solo la barra de trial + CTA de activación.

---

## Estados del Panel según Billing Status

| Status | Banner en panel | Acciones disponibles | Vitrina |
|--------|----------------|---------------------|---------|
| `demo` | Barra de trial con días restantes + CTA activar | Todo el CORE | Activa (con badge "Tienda en prueba") |
| `active` | Ninguno (salvo aviso de renovación 3 días antes) | Todo | Activa |
| `past_due` | Banner rojo prominente + CTA reactivar | Solo lectura | Inactiva (mensaje "temporalmente inactiva") |
| `suspended` | Banner gris + mensaje de contacto | Ninguna | Inactiva |
| `archived` | Banner de archivado + instrucciones | Ninguna | Inactiva |
