# F3 — Billing y Lifecycle · Runbook

**Objetivo:** el modelo de negocio opera de forma autónoma sin intervención manual.
**Criterio de completitud:** demo → pago → active → vencimiento → past_due → archivado, end-to-end automático.

---

## Precondiciones

- [ ] Fase 2 completada
- [ ] Variables de entorno MP configuradas: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`
- [ ] Para testear webhooks en local: tunnel activo (ngrok o cloudflared)

---

## Docs a leer

```
/system/billing/billing.md              ← modelo completo de billing
/system/flows/billing.md                ← flujo de suscripción
/system/billing/webhooks.md             ← pipeline del webhook (9 pasos)
/system/flows/lifecycle.md              ← transiciones de estado de tienda
/system/core/events.md                  ← eventos de billing
/dev/infra/servicios.md                 ← sección Mercado Pago
```

---

## PASO 3.1 — Migraciones pendientes

Verificar que las columnas de billing en `stores` existen según `schema.md`:
- `billing_status`, `trial_ends_at`, `billing_cycle_anchor`
- `current_period_start`, `current_period_end`
- `mp_subscription_id`, `mp_customer_id`
- `ai_tokens_used`, `cancelled_at`, `last_billing_failure_at`

Si alguna falta (porque el schema fue ejecutado parcialmente), agregar con `ALTER TABLE stores ADD COLUMN IF NOT EXISTS ...`.

---

## PASO 3.2 — Integración Mercado Pago

```bash
npm install mercadopago@latest
```

**Archivos:**
- `src/lib/mercadopago/client.ts` — ver `/dev/infra/servicios.md` → sección MP
- `src/app/(admin)/admin/billing/page.tsx` — panel de billing
- `src/app/(admin)/admin/billing/actions.ts` — `createSubscriptionAction`
- `src/app/(admin)/admin/billing/confirmacion/page.tsx` — resultado del pago

**Panel `/admin/billing`:**
- Card del plan actual con: nombre, estado (badge), fecha de renovación, módulos activos
- Días de trial restantes (si `billing_status = 'demo'`)
- Historial de pagos: tabla con fecha, monto, estado (de `billing_payments`)
- CTA "Activar plan" → llama a `createSubscriptionAction` → redirect al `init_point` de MP

**`createSubscriptionAction`:**
```typescript
// Crear suscripción en MP → guardar mp_subscription_id en stores → retornar init_point
// Ver código completo en /dev/infra/servicios.md → "Crear suscripción"
```

**Página de confirmación:**
- Lee `?status=approved|failure|pending` de la URL (query param que MP agrega)
- `approved` → mostrar éxito, indicar que el pago será confirmado por webhook
- `failure` → mostrar error, ofrecer reintentar
- `pending` → mostrar pendiente, indicar que se notificará

**Verificación:**
- Click "Activar plan" → redirige a la página de MP
- En sandbox: completar pago de test → regresa a `/admin/billing/confirmacion?status=approved`

---

## PASO 3.3 — Webhook handler

**Archivo:** `src/app/api/webhooks/mercadopago/billing/route.ts`

Usar el template COMPLETO de `/dev/plantillas/webhook-route.md`. El template ya tiene los 9 pasos del pipeline documentado en `webhooks.md`.

**No simplificar el webhook** — cada paso existe por una razón:
1. Verificar firma → seguridad
2. Parsear payload → obtener topic + ID
3. Verificar idempotencia → evitar duplicados
4. Consultar MP API → no confiar en el payload
5. Resolver store → mapear mp_subscription_id → store_id
6. Ejecutar lógica → actualizar billing_status
7. Registrar evento → auditoría
8. Marcar log → idempotencia completada
9. Responder 200 → siempre, incluso en error (evitar reintentos)

**Testing local del webhook:**
```bash
# Terminal 1: dev server
npm run dev

# Terminal 2: tunnel
cloudflared tunnel --url http://localhost:3000

# En MP Dashboard: configurar la URL del tunnel como webhook temporalmente
# {tunnel-url}/api/webhooks/mercadopago/billing
```

**Verificación:**
- Webhook con firma inválida → 401
- Webhook duplicado → 200 con `idempotent: true`, sin reprocessar
- Webhook `subscription_preapproval` con status `authorized` → `stores.billing_status = 'active'`
- Registro en `billing_webhook_log` con `status = 'processed'`
- Evento en tabla `events` con `type = 'billing_webhook_subscription_preapproval'`

---

## PASO 3.4 — Cron jobs de lifecycle

**Archivos** en `supabase/functions/`:
- `check-trial-expiry/index.ts` — usar template de `/dev/plantillas/edge-function.md`
- `archive-inactive-stores/index.ts` — ídem
- `cleanup-assistant-sessions/index.ts` — ídem

**Deploy:**
```bash
supabase functions deploy check-trial-expiry
supabase functions deploy archive-inactive-stores
supabase functions deploy cleanup-assistant-sessions
```

**Configurar schedule en Supabase Dashboard** → Edge Functions → cada función → Cron:
- `check-trial-expiry`: `0 0 * * *`
- `archive-inactive-stores`: `0 12 * * *`
- `cleanup-assistant-sessions`: `0 3 * * *`

**Testing manual antes de activar el schedule:**
```bash
supabase functions invoke check-trial-expiry
# Verificar en logs que procesó las tiendas correctas
```

**Verificación:**
- Crear tienda demo con `trial_ends_at` en el pasado → correr `check-trial-expiry` → `billing_status = 'past_due'`
- Tienda `past_due` con `last_billing_failure_at` > 30 días → correr `archive-inactive-stores` → `billing_status = 'archived'`
- Tienda archivada → vitrina muestra página inactiva
- Tienda `past_due` → executor bloquea writes con `STORE_INACTIVE`

---

## PASO 3.5 — Panel Superadmin

**Docs:** `/system/superadmin/superadmin.md`

**Archivos:**
- `src/app/(superadmin)/superadmin/page.tsx` — dashboard con métricas
- `src/app/(superadmin)/superadmin/layout.tsx` — layout separado
- `src/app/(superadmin)/superadmin/stores/page.tsx` — lista de tiendas
- `src/app/(superadmin)/superadmin/stores/[id]/page.tsx` — detalle de tienda

**El middleware ya protege `/superadmin`** con verificación de `role = 'superadmin'` en la tabla `users`.

**Dashboard superadmin:**
```typescript
// Stats en paralelo:
const [activeCount, demoCount, pastDueCount, newThisMonth] = await Promise.all([
  db.from('stores').select('*', { count: 'exact', head: true }).eq('billing_status', 'active'),
  db.from('stores').select('*', { count: 'exact', head: true }).eq('billing_status', 'demo'),
  db.from('stores').select('*', { count: 'exact', head: true }).eq('billing_status', 'past_due'),
  db.from('stores').select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString()),
])
```

**Lista de tiendas `/superadmin/stores`:**
- Tabla con: slug, nombre, billing_status (badge), plan, fecha de creación
- Filtros: status, plan, fecha
- Acción "Ver detalle" → página de detalle

**Detalle de tienda `/superadmin/stores/[id]`:**
- Datos de la tienda
- Estado de billing con opción de cambiar manualmente (`update_store_status` handler con `actor: superadmin`)
- Opción "Extender trial" (`extend_trial` handler)
- Log de eventos de la tienda (tabla `events`)

**Verificación:**
- Usuario superadmin puede acceder a `/superadmin`
- Usuario normal → 403
- Dashboard muestra métricas reales

---

## Checklist de completitud de Fase 3

```
[ ] /admin/billing muestra plan, trial, historial
[ ] Botón "Activar plan" → redirige a MP sandbox
[ ] Webhook: firma inválida → 401
[ ] Webhook: subscription authorized → billing_status = 'active'
[ ] Webhook: payment approved → registro en billing_payments
[ ] Webhook: idempotencia funciona (evento duplicado → 200 sin reprocessar)
[ ] Cron check_trial_expiry: tiendas demo vencidas → past_due
[ ] Cron archive_inactive_stores: past_due +30 días → archived
[ ] Tienda archived: vitrina muestra página inactiva
[ ] /superadmin: protegido, solo superadmin accede
[ ] /superadmin/stores: lista de todas las tiendas
[ ] Superadmin puede cambiar billing_status manualmente
```

---

## Al finalizar

1. Actualizar `ESTADO.md`
2. Commit: `feat(fase-3): billing y lifecycle — MP, webhooks, crons, superadmin`
3. → Siguiente: [`/dev/fases/F4-modulos.md`](/dev/fases/F4-modulos.md)
