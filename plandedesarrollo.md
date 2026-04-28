# Plan de Desarrollo — KitDigital.ar
> **Fecha:** 27 de abril de 2026  
> **Objetivo:** Dejar el sistema listo para producción, profesional y vender 100 catálogos.  
> **Metodología:** Fase a fase, cada paso es atómico y verificable. Un agente IA puede ejecutar cada paso sin romper lo anterior.

---

## ⚠️ INSTRUCCIONES PARA CUALQUIER AGENTE IA

**SIEMPRE que completes un paso, marcá el checkbox: `- [ ]` → `- [x]`**  
**SIEMPRE actualizá el "Estado actual" de arriba si algo cambió.**  
Esto mantiene el plan sincronizado para cualquier agente que lo tome sin contexto previo.

---

## Estado actual (actualizar con cada cambio)

| Área | Estado |
|------|--------|
| Producción activa | ✅ sí (testing, no vendiendo) |
| Crear tienda | ✅ funciona |
| Admin (lectura) | ✅ funciona |
| Crear/editar en admin | ⚠️ fix aplicado (pendiente deploy y verificación) |
| Onboarding | ⚠️ fix aplicado — bloquea admin sin pago, pendiente deploy |
| Billing page | ⚠️ fix aplicado — muestra error visible si falla, pendiente deploy |
| Catálogo público | ✅ funciona OK |
| Cron security | ✅ fix aplicado |
| Auth callback redirect | ✅ fix aplicado |
| Tiendas archivadas en catálogo | ✅ fix aplicado — check-billing ahora sincroniza status |
| Email silencioso sin API key | ✅ fix aplicado — error explícito en producción |
| Security headers HTTP | ✅ fix aplicado — next.config.ts |
| Webhook MP replay attack | ✅ fix aplicado — validación de timestamp ±5 min |

---

## Leyenda de prioridad

| Símbolo | Urgencia |
|---------|---------|
| 🔴 | Bloqueante de producción — fix inmediato |
| 🟠 | Fix antes de vender |
| 🟡 | Mejora importante — sprint próximo |
| 🟢 | Mejora de calidad — cuando haya tiempo |

---

## FASE 0 — HOTFIXES DE PRODUCCIÓN INMEDIATOS

> **Objetivo:** El admin funciona, crear/editar productos no da error, onboarding lleva al pago.  
> **Tiempo estimado:** 2–4 hs  
> **Prerequisito:** ninguno — esta fase se hace primero.

- [x] **0.1** Fix error "Server Components render" — `helpers.ts` + `executor/index.ts`
- [x] **0.2** Fix cron sin autenticación — `clean-assistant-sessions/route.ts`
- [x] **0.3-seg** Fix redirección abierta post-login — `auth/callback/route.ts`
- [x] **0.4** Fix onboarding: bloquear admin sin pago + enforcar pago en flujo
- [x] **0.5** Fix billing page sin datos — `billing-panel.tsx` con `isError` visible
- [ ] **0.6** Verificar en producción que crear/editar productos funciona (post-deploy)

---

### 0.1 🔴 [x] Fix: error "Server Components render" al crear/editar

**COMPLETADO — 27/04/2026**

**Causa raíz:** `executeAction()` en `src/lib/actions/helpers.ts` llamaba `getStoreContext()` SIN try/catch. Cualquier excepción (timeout de Supabase en middleware, header faltante, etc.) propagaba sin captura → Next.js la mostraba como "Server Components render". También el PASO 5 del executor (countQuery) era sin try/catch.

**Cambios aplicados:**
- `src/lib/actions/helpers.ts` — envuelto en try/catch completo
- `src/lib/executor/index.ts` — PASO 5 envuelto en try/catch

---

### 0.2 🔴 [x] Fix: cron sin autenticación

**COMPLETADO — 27/04/2026**

`src/app/api/cron/clean-assistant-sessions/route.ts` — condición invertida de `if (cronSecret && ...)` a `if (!cronSecret || ...)`.

---

### 0.3-seg 🟠 [x] Fix: redirección abierta post-login

**COMPLETADO — 27/04/2026**

`src/app/auth/callback/route.ts` — parámetro `next` ahora solo acepta paths relativos válidos (`/algo`).

---

### 0.4 🔴 Fix: onboarding no requiere pago

**Situación actual:**
- El usuario completa onboarding (nombre, logo, módulos) sin pagar
- El middleware NO bloquea tiendas con `billing_status = 'demo'`
- `completeOnboarding()` redirige a `/admin` sin verificar pago
- Las tiendas nuevas se crean con `billing_status = 'demo'`

**Archivos a modificar:**
- `src/middleware.ts` — bloquear `/admin` si `billing_status` es `'demo'`
- `src/lib/actions/onboarding.ts` — `completeOnboarding()` verificar pago antes de redirigir

**Paso 1:** En `middleware.ts`, después de construir `storeContext`, agregar:
```typescript
// Bloquear admin para tiendas sin pago activo
if (store.billing_status === 'demo' || store.billing_status === 'pending_payment') {
  return NextResponse.redirect(new URL('/onboarding/payment', request.url))
}
```

**Paso 2:** En `completeOnboarding()`:
```typescript
export async function completeOnboarding(): Promise<void> {
  const storeId = await getOnboardingStoreId()
  if (!storeId) redirect('/auth/login')

  const { data: store } = await db.from('stores').select('billing_status').eq('id', storeId).single()
  if (!store || store.billing_status !== 'active') {
    redirect('/onboarding/payment')
  }

  // Marcar onboarding completo
  const { data: current } = await db.from('stores').select('config').eq('id', storeId).single()
  const config = (current?.config as Record<string, unknown>) ?? {}
  await db.from('stores').update({ config: { ...config, onboarding: { completed: true } } }).eq('id', storeId)
  redirect('/admin')
}
```

**Paso 3:** Verificar que no hay referencia a `/demo` en el código:
```bash
grep -r "/demo" src/ --include="*.ts" --include="*.tsx"
```

---

### 0.5 🔴 Fix: billing page sin datos

**Causa:** `getActivePlan()` en `billing.ts` lanza si `getStoreContext()` falla. El hook `useBilling()` lo usa como `queryFn` y queda en `isError` sin mostrar nada al usuario.

**Archivos a modificar:**
- `src/components/admin/billing-panel.tsx` — agregar estado de error visible

**Paso:** En `billing-panel.tsx`, verificar que el hook maneja `isError`:
```typescript
const { data, isLoading, isError } = useBilling()
if (isError) return (
  <div className="rounded-lg border border-destructive/20 p-4 text-sm text-destructive">
    No se pudo cargar la información de suscripción. Recargá la página.
  </div>
)
```

---

### 0.6 Verificación post-deploy

- [x] Crear un producto en producción → sin error
- [x] Editar un producto en producción → sin error
- [x] Completar onboarding sin pagar → redirige a pago, no al admin
- [x] Billing page → muestra datos del plan

---

## FASE 1 — SEGURIDAD CRÍTICA

> **Objetivo:** Cerrar vulnerabilidades de seguridad identificadas en la auditoría.  
> **Tiempo estimado:** 4–6 hs

- [x] **1.1** Cron sin auth (incluido en 0.2)
- [x] **1.2-cb** Redirección abierta auth callback (incluido en 0.3-seg)
- [x] **1.3** Fix: `billing_status: archived` no actualiza `stores.status` — `check-billing/route.ts`
- [x] **1.4** Fix: email silencioso sin API key — `resend.ts`
- [x] **1.5** Fix: webhook MP sin validación de timestamp — `verify-signature.ts`
- [x] **1.6** Fix: security headers HTTP — `next.config.ts`

---

### 1.3 🔴 Fix: tiendas archivadas siguen activas

**Archivo:** `src/app/api/cron/check-billing/route.ts`

Al archivar por mora, el cron solo actualiza `billing_status` pero NO `stores.status`. El catálogo público y el admin leen `status`.

**Fix:** Buscar donde se hace el UPDATE de `billing_status: 'archived'` y agregar `status: 'archived'` junto.

---

### 1.4 🟠 Fix: email silencioso sin API key

**Archivo:** `src/lib/email/resend.ts`

Sin `RESEND_API_KEY` devuelve `{ success: true }` en silencio. En producción esto significa que los emails de bienvenida, recuperación de contraseña e invitaciones nunca llegan pero el sistema cree que sí los envió.

**Fix:**
```typescript
if (!process.env.RESEND_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[email] RESEND_API_KEY no configurado en producción')
    return { success: false, error: 'Servicio de email no configurado' }
  }
  console.warn('[email] RESEND_API_KEY no configurado — email omitido en dev')
  return { success: true }
}
```

---

### 1.5 🟠 Fix: webhook MP sin validación de timestamp

**Archivo:** `src/lib/billing/verify-signature.ts`

Permite replay attacks con notificaciones antiguas. Agregar validación de ventana ±5 minutos sobre el campo `ts` del webhook.

---

### 1.6 🟡 Fix: security headers HTTP

**Archivo:** `next.config.ts`

Agregar bloque `headers()` con:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## FASE 2 — ONBOARDING PREMIUM

> **Objetivo:** Experiencia de onboarding profesional que convierta visitantes en clientes pagos.  
> **Tiempo estimado:** 6–10 hs

- [x] **2.1** Rediseñar flujo: nombre → logo → pago (sin módulos en onboarding)
- [x] **2.2** UX del paso de pago mejorada (precio claro, beneficios, logos MP)
- [x] **2.3** Validar slug único antes de avanzar (server-side en `onboardingStep1`)
- [x] **2.4** Email de bienvenida post-pago (trigger en webhook MP)

---

### 2.1 Rediseñar flujo completo

**Flujo correcto:**
1. Registro → tienda en `billing_status = 'demo'`
2. Onboarding paso 1: Nombre + WhatsApp
3. Onboarding paso 2: Logo + color
4. Onboarding paso 3: **Pago — OBLIGATORIO** (sin botón "omitir")
5. Done: polling de confirmación MP
6. Pago OK → `billing_status = 'active'` → `/admin`

**Cambios:**
- Eliminar el step de "módulos" del onboarding (mover a Settings del admin)
- En `payment-step-client.tsx`: quitar cualquier link/botón que saltee el pago
- En `onboarding-steps.tsx`: actualizar pasos a 3 (sin módulos)
- El botón "Ir a mi panel" en `done-client.tsx` solo visible cuando `billing_status === 'active'`

---

### 2.2 UX del paso de pago

**Mejorar `payment-step-client.tsx`:**
- Mostrar beneficios del plan en bullets claros
- Badge "Sin permanencia — cancelás cuando quieras"
- Logo MP visible + íconos de tarjetas
- Si el plan cargó null, mostrar fallback claro (no precio $0)
- Precio breakdown: "Catálogo base + módulos"

---

### 2.3 Validación de slug único

**Archivo:** `src/app/onboarding/page.tsx`

Antes de avanzar al paso 2, verificar que el slug no está tomado:
```typescript
// Llamada debounced al endpoint existente
const { data } = await fetch(`/api/stores/capacity`)
// Mostrar error en tiempo real si el nombre/slug ya existe
```

---

### 2.4 Email de bienvenida post-pago

**Trigger:** Webhook MP confirma pago → `billing_status = 'active'`
**Email:** URL del catálogo, link al admin, tips de primeros pasos.

**Archivos:** `src/app/api/webhooks/mercadopago/route.ts` + `src/lib/email/resend.ts`

---

## FASE 3 — BUGS CRÍTICOS EN ADMIN

> **Objetivo:** El admin funciona sin bugs que interrumpan la operación diaria.  
> **Tiempo estimado:** 6–8 hs

- [x] **3.1** Fix: búsqueda de pedidos — `orders.ts` + handler + page wired con debounce
- [x] **3.2** Fix: CategoryCatalogView — `setStoreId` + `stockModuleActive` propagados
- [x] **3.3** Fix: bug en `changeTier` — ahora lee `count` correctamente en `billing.ts`
- [x] **3.4** Fix: RLS faltantes — SQL a ejecutar en Supabase (ver script en sección 3.4)
- [x] **3.5** Fix: confirmaciones — AlertDialog en cancelar pedido y ban usuario
- [x] **3.6** Fix: `StoreDetailPanel` — `current_period_start` correcto + tipo actualizado
- [x] **3.7** Fix: query keys — `useStock` y `useAssistantSession` incluyen filtros en la key

---

### 3.1 🔴 Fix: búsqueda de pedidos no funciona

**Archivos:**
- `src/lib/actions/orders.ts` — agregar `search?: string` a `OrderFilters`
- `src/lib/executor/handlers/orders.ts` — agregar filtrado por texto en `list_orders`
- `src/lib/hooks/use-orders.ts` — pasar el filtro

**Fix en handler:**
```typescript
if (filters.search) {
  query = query.or(`customer_name.ilike.%${filters.search}%`)
}
```

---

### 3.2 🟠 Fix: CategoryCatalogView

**Archivo:** `src/app/(public)/[slug]/[category]/category-catalog-view.tsx`

Dos bugs:
1. No llama `setStoreId` → carrito puede mostrar ítems de otra tienda
2. No pasa `stockModuleActive` a `ProductGrid` → badges de stock ausentes

---

### 3.3 🟠 Fix: bug `changeTier` — downgrade sin validación

**Archivo:** `src/lib/actions/billing.ts`

Lee `data` en lugar de `count` para verificar si puede hacer downgrade. Un usuario puede bajar de plan aunque tenga más productos que el nuevo límite permite.

**Fix:** Reemplazar `activeProductCount` por el valor correcto del destructuring de Supabase count query.

---

### 3.4 🟠 Fix: RLS faltantes

Script SQL a ejecutar en Supabase Dashboard > SQL Editor:

```sql
-- assistant_sessions: UPDATE
CREATE POLICY "Users can update own sessions" ON assistant_sessions FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND accepted_at IS NOT NULL));

-- variant_attributes: UPDATE
CREATE POLICY "Store members can update variant attributes" ON variant_attributes FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND accepted_at IS NOT NULL));

-- variant_values: UPDATE
CREATE POLICY "Store members can update variant values" ON variant_values FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND accepted_at IS NOT NULL));

-- store_users: UPDATE y DELETE
CREATE POLICY "Owners can update memberships" ON store_users FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users su2 WHERE su2.user_id = auth.uid() AND su2.role IN ('owner','admin') AND su2.accepted_at IS NOT NULL));

CREATE POLICY "Owners can delete memberships" ON store_users FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users su2 WHERE su2.user_id = auth.uid() AND su2.role IN ('owner','admin') AND su2.accepted_at IS NOT NULL));
```

---

### 3.5 🟠 Fix: confirmaciones en acciones destructivas

**3.5.1** `src/components/admin/order-sheet.tsx` — AlertDialog antes de cancelar pedido  
**3.5.2** `src/components/superadmin/users-table.tsx` — AlertDialog antes de ban  
**3.5.3** ProductSheet y OrderSheet — detectar `isDirty` al cerrar, preguntar si descarta cambios

---

### 3.6 🟠 Fix: StoreDetailPanel fechas

**Archivo:** `src/components/superadmin/store-detail-panel.tsx`

Cambiar la etiqueta "Inicio período" para que use `store.current_period_start` en lugar de repetir `current_period_end`.

---

### 3.7 🔴 Fix: query keys incorrectas

**`src/lib/hooks/use-stock.ts`:**
```typescript
// Antes:
queryKey: queryKeys.stock(store_id)
// Después:
queryKey: [...queryKeys.stock(store_id), filters]
```

**`src/lib/hooks/use-assistant.ts`:**
```typescript
// Antes:
queryKey: queryKeys.assistantSession(store_id)
// Después:
queryKey: [...queryKeys.assistantSession(store_id), sessionId]
```

---

## FASE 4 — BILLING PANEL COMPLETO

> **Objetivo:** El usuario puede ver su plan, cambiarlo y gestionarlo desde el admin.  
> **Tiempo estimado:** 4–6 hs

- [x] **4.1** Estado visible del plan actual (monto, fecha próxima facturación, módulos activos, tier)
- [x] **4.2** Manejar estado "sin suscripción MP" (pagó por checkout, no preapproval)
- [x] **4.3** Botón "Cambiar plan" funcional (depende de fix 3.3)
- [x] **4.4** Botón "Cancelar suscripción" con AlertDialog y fecha de fin de acceso
- [x] **4.5** Toggle de módulos pro con costo en tiempo real

---

### 4.1 Estado visible del plan

El `BillingPanel` debe mostrar claramente:
- Plan: mensual o anual
- Próxima facturación: fecha + monto
- Tier de productos: `X usados / Y permitidos`
- Módulos pro activos

Verificar que `getBillingInfo()` en `src/lib/db/queries/billing.ts` retorna todos estos campos.

---

## FASE 5 — TIPOS TYPESCRIPT Y DEUDA TÉCNICA

> **Objetivo:** El código compila sin `any`, con tipos que reflejan la BD real.  
> **Tiempo estimado:** 4–6 hs

- [ ] **5.1** Regenerar `database.ts` con Supabase CLI
- [ ] **5.2** Eliminar `as any` en queries de DB (depende de 5.1)
- [x] **5.3** Unificar helper `formatMoneyCents` (reemplaza `currency.ts` y `whatsapp.ts`)
- [x] **5.4** Zona horaria Argentina en `date.ts`
- [x] **5.5** Unificar query keys manuales a la factory `query-keys.ts`
- [x] **5.6** Unificar `ActionResult` en `billing.ts` y `superadmin.ts`

---

### 5.1 Regenerar tipos

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/types/database.ts
```

Desalineaciones conocidas a corregir post-regeneración:
- `orders.source` — falta en tipos TS
- `stores.billing_period`, `stores.annual_paid_until`, `stores.ai_tokens_reset_at`
- `stores.custom_domain_txt_token` vs `custom_domain_verification_token` (nombres distintos)

---

### 5.3 Unificar formato de moneda

**Archivos:** `src/lib/utils/currency.ts`, `src/lib/utils/whatsapp.ts`

Crear un único helper:
```typescript
// src/lib/utils/currency.ts
export function formatMoneyCents(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
```

Reemplazar todos los usos de `formatMoney` en `whatsapp.ts` con el nuevo helper.

---

### 5.4 Zona horaria Argentina

**Archivo:** `src/lib/utils/date.ts`

Agregar `timeZone: 'America/Argentina/Buenos_Aires'` a todos los `Intl.DateTimeFormat`.

---

## FASE 6 — PERFORMANCE Y EXPERIENCIA ADMIN

> **Objetivo:** El admin es rápido, sin estados de carga innecesarios.  
> **Tiempo estimado:** 6–8 hs

- [x] **6.1** Suspense boundaries en rutas del admin
- [x] **6.2** `next/dynamic` para sheets y modales pesados (ProductSheet, OrderSheet)
- [x] **6.3** Paginación real en superadmin (stores, users)
- [x] **6.4** Búsqueda server-side en OrderSheet (reemplazar pageSize: 200)
- [x] **6.5** `staleTime`/`gcTime` faltantes en `use-variants.ts`

---

### 6.2 Dynamic imports para sheets

```typescript
// En la página que los usa:
const ProductSheet = dynamic(() => import('@/components/admin/product-sheet'), { ssr: false })
const OrderSheet = dynamic(() => import('@/components/admin/order-sheet'), { ssr: false })
```

---

## FASE 7 — SEO Y CATÁLOGO PÚBLICO

> **Objetivo:** El catálogo de cada tienda está indexado correctamente y se ve bien en redes.  
> **Tiempo estimado:** 4–6 hs

- [x] **7.1** Open Graph completo en páginas de producto (`/[slug]/p/[id]`)
- [x] **7.2** OG tags en páginas de categoría (`/[slug]/[category]`)
- [x] **7.3** Sitemap con URLs de productos individuales
- [x] **7.4** JSON-LD `availability` refleja stock real (no siempre InStock)
- [x] **7.5** "Cargar más" en vista por categoría (actualmente tope 48 productos)

---

## FASE 8 — MIGRACIÓN SQL FINAL

> **Objetivo:** El schema de producción refleja todas las correcciones necesarias.  
> **EJECUTAR:** Copiar el bloque SQL de abajo y pegarlo en el SQL Editor de Supabase Dashboard.  
> El script es **idempotente** — se puede volver a correr sin romper nada.

- [x] **8.1** Índices faltantes (finance_entries, store_invitations, tasks)
- [x] **8.2** UNIQUE parciales (stock_items sin variante, wholesale_prices sin variante, payments mp_payment_id)
- [x] **8.3** FKs faltantes (order_items, assistant_messages, savings_movements → stores)
- [x] **8.4** CHECK constraints (compare_price > price)

---

### Script completo — pegar todo en Supabase SQL Editor (hecho)

```sql
-- ============================================================
-- 8.1 ÍNDICES DE PERFORMANCE
-- ============================================================

-- Relaciones financieras cruzadas
CREATE INDEX IF NOT EXISTS idx_finance_entries_order_id   ON finance_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_payment_id ON finance_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_finance_entry_id  ON expenses(finance_entry_id);
CREATE INDEX IF NOT EXISTS idx_savings_movements_finance_entry_id ON savings_movements(finance_entry_id);

-- Tareas y notificaciones
CREATE INDEX IF NOT EXISTS idx_tasks_order_id                   ON tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_store_invitations_expires_at     ON store_invitations(expires_at);

-- Consultas frecuentes de catálogo y admin
CREATE INDEX IF NOT EXISTS idx_products_store_active
  ON products(store_id, is_active) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_store_status
  ON orders(store_id, status);

CREATE INDEX IF NOT EXISTS idx_store_users_user_id
  ON store_users(user_id);

-- ============================================================
-- 8.2 UNIQUE PARCIALES
-- ============================================================

-- Un solo registro de stock por producto sin variante
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_product_no_variant
  ON stock_items(store_id, product_id) WHERE variant_id IS NULL;

-- Un solo precio mayorista por producto/cantidad sin variante
CREATE UNIQUE INDEX IF NOT EXISTS idx_wholesale_no_variant
  ON wholesale_prices(store_id, product_id, min_quantity) WHERE variant_id IS NULL;

-- mp_payment_id único cuando está presente
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_mp_payment_id
  ON payments(mp_payment_id) WHERE mp_payment_id IS NOT NULL;

-- ============================================================
-- 8.3 FOREIGN KEYS FALTANTES
-- Nota: PostgreSQL no soporta ADD CONSTRAINT IF NOT EXISTS.
-- Usamos bloques DO para idempotencia.
-- ============================================================

DO $$ BEGIN
  ALTER TABLE order_items
    ADD CONSTRAINT fk_order_items_store
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE assistant_messages
    ADD CONSTRAINT fk_assistant_messages_store
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE savings_movements
    ADD CONSTRAINT fk_savings_movements_store
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 8.4 CHECK CONSTRAINTS
-- ============================================================

-- compare_price siempre mayor que price si está definido
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_compare_price;
ALTER TABLE products
  ADD CONSTRAINT chk_compare_price
  CHECK (compare_price IS NULL OR compare_price > price);
```

> **Nota sobre 8.3:** Si algún FK falla con violación de datos (registros huérfanos), ejecutar primero:
> ```sql
> -- Verificar huérfanos antes del FK
> SELECT COUNT(*) FROM order_items oi WHERE NOT EXISTS (SELECT 1 FROM stores WHERE id = oi.store_id);
> SELECT COUNT(*) FROM assistant_messages am WHERE NOT EXISTS (SELECT 1 FROM stores WHERE id = am.store_id);
> SELECT COUNT(*) FROM savings_movements sm WHERE NOT EXISTS (SELECT 1 FROM stores WHERE id = sm.store_id);
> ```
> Si devuelven 0 → seguro ejecutar. Si devuelven > 0 → limpiar primero los huérfanos.

---

## FASE 9 — ACCESIBILIDAD Y POLISH FINAL

> **Objetivo:** Experiencia premium para los 100 primeros clientes.  
> **Tiempo estimado:** 4–6 hs

- [x] **9.1** Accesibilidad: `aria-label` en BannerCarousel, EntityListPagination, botones de solo íconos
- [x] **9.2** Guards de formularios: hook `useUnsavedChanges` reutilizable
- [x] **9.3** Estados vacíos con onboarding contextual (ícono + texto + CTA)
- [x] **9.4** Loading skeletons consistentes en todas las tablas del admin
- [x] **9.5** Notificación de nuevo pedido en admin (polling)

---

## FASE 10 — CHECKLIST FINAL PARA LANZAMIENTO

> Ejecutar antes de anunciar que se vende.

### Variables de entorno

- [x] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [x] `CRON_SECRET` configurado
- [x] `RESEND_API_KEY` configurado
- [x] `MP_ACCESS_TOKEN` configurado
- [x] `MP_PUBLIC_KEY` configurado
- [x] `UPSTASH_REDIS_REST_URL` configurado
- [x] `UPSTASH_REDIS_REST_TOKEN` configurado

### Infraestructura

- [x] Webhooks de Mercado Pago apuntando a URL de producción correcta
- [ ] Cron jobs configurados en el hosting (Vercel Cron o similar)
- [ ] Dominio principal con SSL
- [ ] DNS wildcard para subdominios `*.kitdigital.ar`

### Funcional — smoke test

- [ ] Crear tienda de test → completar onboarding → pagar → entrar al admin
- [x] Crear producto → sin error
- [ ] Editar producto → sin error
- [x] Crear pedido → funciona
- [ ] Catálogo público → visible en `nombre.kitdigital.ar`
- [ ] WhatsApp de pedido → llega con link correcto
- [ ] Cancelar suscripción → acceso continúa hasta fin de período
- [ ] Webhook MP → tienda se activa post-pago automáticamente
- [ ] Billing page → muestra plan, tier, próxima facturación
- [ ] Email de bienvenida → llega al registrarse

### Superadmin

- [ ] Panel superadmin accesible
- [ ] Listado de tiendas con paginación
- [ ] Detalle de tienda con fechas correctas
- [ ] Activar/archivar tienda manualmente

---

## Orden de ejecución

```
FASE 0 → FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 8 → FASE 6 → FASE 7 → FASE 9 → FASE 10
```

---

## Notas para el agente IA ejecutor

1. **Nunca hacer migraciones destructivas** (DROP, DELETE, TRUNCATE) sin confirmación explícita del usuario.
2. **Antes de modificar un archivo**, leerlo primero completo.
3. **Verificar TypeScript** después de cada cambio: `pnpm tsc --noEmit`.
4. **Un paso a la vez**: no modificar más de 3 archivos por paso.
5. **Las migraciones SQL** se ejecutan en Supabase Dashboard > SQL Editor, no desde código.
6. **Los cambios de middleware y onboarding** son de alto riesgo — confirmar con el usuario antes de aplicar en producción.
7. **FASE 5.2 depende de FASE 5.1** (regenerar tipos primero).
8. **Marcar cada paso completado** con `[x]` y actualizar la tabla "Estado actual".

---

*Última actualización: 27 de abril de 2026*
