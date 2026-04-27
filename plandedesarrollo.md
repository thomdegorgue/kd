# Plan de Desarrollo — KitDigital.ar
> **Fecha:** 27 de abril de 2026  
> **Objetivo:** Dejar el sistema listo para producción, profesional y vender 100 catálogos.  
> **Metodología:** Fase a fase, cada paso es atómico y verificable. Un agente IA puede ejecutar cada paso sin romper lo anterior.

---

## Estado actual

- **Producción activa:** sí (testing, no vendiendo)
- **Crear tienda:** funciona
- **Admin (lectura):** funciona
- **Crear/editar cualquier cosa en admin:** ❌ error "Server Components render" en producción
- **Onboarding:** ❌ flujo roto — no se cobra, redirige a demo inexistente
- **Billing page:** muestra UI pero sin datos
- **Catálogo público:** funciona OK

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

---

### 0.1 🔴 Fix: error "Server Components render" al crear/editar

**Causa raíz identificada:**  
`executeAction()` en `src/lib/actions/helpers.ts` llama `getStoreContext()` SIN try/catch. Si el header `x-store-context` no está presente (middleware falló, timeout Supabase, etc.), `getStoreContext()` lanza una excepción no capturada que Next.js muestra como "An error occurred in the Server Components render."

Adicionalmente, en `src/lib/executor/index.ts` el **PASO 5** (límites del plan) llama `handler.limits.countQuery(store_id)` sin try/catch. Si falla, propaga excepción no capturada.

**Archivos a modificar:**
- `src/lib/actions/helpers.ts`
- `src/lib/executor/index.ts` (PASO 5)

**Pasos:**

1. En `helpers.ts`, envolver toda la función en try/catch:
```typescript
export async function executeAction<T = unknown>(
  name: string,
  input: object = {}
): Promise<ActionResult<T>> {
  try {
    const ctx = await getStoreContext()
    return executor<T>({
      name,
      store_id: ctx.store_id,
      actor: { type: 'user', id: ctx.user_id },
      input,
      context: ctx,
    })
  } catch (err) {
    // Si es ActionResult ya formateado, propagarlo
    if (err && typeof err === 'object' && 'success' in err) {
      return err as ActionResult<T>
    }
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    return { success: false, error: { code: 'SYSTEM_ERROR', message } } as ActionResult<T>
  }
}
```

2. En `executor/index.ts` PASO 5, envolver `countQuery` en try/catch:
```typescript
if (handler.limits && storeContext && store_id) {
  try {
    const limitField = handler.limits.field
    const maxAllowed = storeContext.limits[limitField]
    const current = await handler.limits.countQuery(store_id)
    if (current >= maxAllowed) {
      return makeError('LIMIT_EXCEEDED', `Límite de ${limitField} alcanzado (${current}/${maxAllowed})`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error verificando límites'
    return makeError('SYSTEM_ERROR', message)
  }
}
```

3. **Verificar en producción:** crear un producto, editar un producto. Debe funcionar sin error.

4. **Investigación adicional (si el error persiste):** Revisar los logs de Vercel/hosting para ver el digest del error y el stack trace real. Podría ser un schema mismatch en la tabla `events` en producción.

---

### 0.2 🔴 Fix: el ProductSheet no muestra errores del ActionResult

**Síntoma adicional:** Aunque la acción retorne `{ success: false }` correctamente, el usuario ve el error genérico de Next.js en lugar de un mensaje amigable en el sheet.

**Archivos a verificar:**
- `src/components/admin/product-sheet.tsx` — revisar que el mutation's `onError` muestre toast con el mensaje del error

**Paso:**
1. Leer el componente y verificar que el `useMutation` de creación/edición tenga:
```typescript
onSuccess: (result) => {
  if (!result.success) {
    toast.error(result.error.message)
    return
  }
  // ...
}
```
2. Si no lo tiene, agregarlo para todos los mutations del ProductSheet.

---

### 0.3 🔴 Fix: flujo de onboarding no requiere pago

**Situación actual:**
- El usuario completa onboarding (nombre, logo, módulos)
- En el step de payment hay una pantalla de pago
- PERO: el botón "Ir a mi panel" en `done-client.tsx` está disponible **sin importar si pagó**
- La lógica de `phase === 'no-payment'` muestra un botón a `/onboarding/payment`, pero el usuario puede navegar a `/admin` directamente
- El middleware NO bloquea tiendas con `billing_status = 'demo'` — solo bloquea `suspended`/`archived`
- `completeOnboarding()` redirige a `/admin` sin verificar si pagó

**Estrategia de fix:**

**Opción A (recomendada — corto plazo):** Bloquear acceso al admin si `billing_status = 'demo'`, redirigir a `/onboarding/payment`.

En el middleware `/admin`:
```typescript
// Después de construir storeContext:
if (store.billing_status === 'demo' || store.billing_status === null) {
  return NextResponse.redirect(new URL('/onboarding/payment', request.url))
}
```

Y en `completeOnboarding()`:
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

**Archivos a modificar:**
- `src/middleware.ts` (sección /admin)
- `src/lib/actions/onboarding.ts` (completeOnboarding)

---

### 0.4 🔴 Fix: onboarding redirección a "demo" eliminado

**Problema:** El onboarding steps y done-client hace referencia conceptual a "demo" pero esa ruta/lógica fue eliminada. Después del pago, el flujo debe ir directamente al success panel.

**Verificar:**
- `src/app/onboarding/done/done-client.tsx`: el `phase === 'no-payment'` muestra correctamente el botón a `/onboarding/payment` ✅
- Confirmar que no hay rutas `/demo/*` en el código que todavía sean referenciadas

```bash
grep -r "/demo" src/ --include="*.ts" --include="*.tsx"
```

Si hay referencias, eliminarlas.

---

### 0.5 🔴 Fix: Billing page muestra UI pero sin datos

**Causa:** `getActivePlan()` en `src/lib/actions/billing.ts` NO retorna un `ActionResult` — retorna `BillingPageData` directo o LANZA si `getStoreContext()` falla. El hook `useBilling()` usa esta función como `queryFn` de TanStack Query y si lanza, el hook queda en `isError` sin mostrar nada.

**Archivos a modificar:**
- `src/lib/actions/billing.ts` — `getActivePlan()`
- `src/components/admin/billing-panel.tsx` — agregar estado de error visible

**Pasos:**
1. Verificar que `getActivePlan()` esté manejando errores:
```typescript
export async function getActivePlan(): Promise<BillingPageData> {
  try {
    const ctx = await getStoreContext()
    const [plan, billing] = await Promise.all([getPlan(), getBillingInfo(ctx.store_id)])
    const monthly_total = computeMonthlyTotal(plan, ...)
    return { plan, billing, monthly_total }
  } catch (err) {
    throw err // TanStack Query lo captura como isError
  }
}
```

2. En `billing-panel.tsx`, mostrar estado de error:
```typescript
const { data, isLoading, isError } = useBilling()
if (isError) return <p>No se pudo cargar la información de suscripción.</p>
```

3. **Verificar en producción** que el panel billing muestra los datos del plan.

---

## FASE 1 — SEGURIDAD CRÍTICA

> **Objetivo:** Cerrar vulnerabilidades de seguridad identificadas en la auditoría que pueden comprometer datos o el sistema.  
> **Tiempo estimado:** 4–6 hs

---

### 1.1 🔴 Fix: Cron sin autenticación cuando CRON_SECRET no está definido

**Archivo:** `src/app/api/cron/clean-assistant-sessions/route.ts`

**Bug:** La condición actual permite acceso libre si `CRON_SECRET` no está definido:
```typescript
// INCORRECTO (actual)
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) { ... }
// CORRECTO
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) { ... }
```

**Fix:** Invertir la condición. Verificar que `CRON_SECRET` está configurado en el entorno de producción.

---

### 1.2 🔴 Fix: Tiendas con mora siguen visibles y activas

**Archivo:** `src/app/api/cron/check-billing/route.ts`

**Bug:** Al archivar por mora, el cron solo actualiza `billing_status = 'archived'` pero NO actualiza `status`. El catálogo público y el admin leen `status`.

**Fix:** Al archivar por mora, actualizar ambos campos:
```typescript
await db.from('stores').update({ 
  billing_status: 'archived',
  status: 'archived'  // <-- agregar esto
}).eq('id', storeId)
```

---

### 1.3 🟠 Fix: Redirección abierta post-login

**Archivo:** `src/app/auth/callback/route.ts`

**Bug:** `next` param sin validar permite `//evil.com`.

**Fix:**
```typescript
const rawNext = requestUrl.searchParams.get('next') ?? '/admin'
// Solo paths relativos: deben empezar con / pero no con //
const next = /^\/[^/]/.test(rawNext) ? rawNext : '/admin'
return NextResponse.redirect(`${origin}${next}`)
```

---

### 1.4 🟠 Fix: Email silencioso sin API key

**Archivo:** `src/lib/email/resend.ts`

**Bug:** Sin `RESEND_API_KEY` devuelve `{ success: true }` en silencio.

**Fix:** En producción, lanzar error explícito:
```typescript
if (!process.env.RESEND_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('RESEND_API_KEY no configurado en producción')
  }
  console.warn('[email] RESEND_API_KEY no configurado — email no enviado')
  return { success: false, error: 'Email no configurado' }
}
```

---

### 1.5 🟠 Fix: Webhook MP sin validación de timestamp

**Archivo:** `src/lib/billing/verify-signature.ts`

**Fix:** Agregar validación de antigüedad del timestamp (ventana ±5 minutos):
```typescript
const tsValue = parseInt(ts, 10)
const now = Math.floor(Date.now() / 1000)
if (Math.abs(now - tsValue) > 300) {
  return false // Timestamp demasiado antiguo o futuro
}
```

---

### 1.6 🟠 Fix: Security headers HTTP

**Archivo:** `next.config.ts`

**Fix:** Agregar bloque `headers()`:
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }]
},
```

---

## FASE 2 — ONBOARDING PREMIUM

> **Objetivo:** Experiencia de onboarding profesional que convierta visitantes en clientes pagos.  
> **Tiempo estimado:** 6–10 hs

---

### 2.1 Rediseñar flujo de onboarding completo

**Flujo actual (roto):**
1. Registro → tienda creada en 'demo' → onboarding (nombre, logo, módulos, payment) → done → /admin sin verificar pago

**Flujo nuevo (correcto):**
1. Registro → tienda creada con `billing_status = 'pending_payment'` y `status = 'pending'`
2. Onboarding:
   - Step 1: Nombre de la tienda + WhatsApp
   - Step 2: Logo + color primario
   - Step 3: Pago (OBLIGATORIO — no hay botón "omitir")
   - (Steps opcionales de módulos se mueven al admin, post-pago)
3. Done: esperar confirmación de Mercado Pago (polling)
4. Pago confirmado → `billing_status = 'active'`, `status = 'active'` → /admin

**Cambios requeridos:**

**2.1.1** En el signup action (`src/lib/actions/auth.ts`):
- Cuando se crea la tienda, usar `status = 'pending'` y `billing_status = 'pending_payment'` en lugar de 'demo'

**2.1.2** Eliminar el step de módulos del onboarding (simplificar):
- Los módulos se configuran desde Settings > Módulos del admin, post-pago
- El onboarding queda en 3 pasos: nombre → logo → pago

**2.1.3** El step de pago no debe tener botón "Omitir":
- Remover cualquier link/botón que saltee el pago

**2.1.4** `done-client.tsx`:
- El panel `no-payment` no debe existir como opción — siempre hay un pago previo
- Si el usuario llega a /done sin haber pagado, mostrar solo el botón de volver al pago
- Si el usuario llega con `?status=success`, hacer polling y esperar confirmación

**2.1.5** `completeOnboarding()`:
- Solo disponible si `billing_status = 'active'`
- Redirigir a /admin

**2.1.6** Middleware `/admin`:
- Bloquear si `billing_status` está en `['pending_payment', 'demo', 'pending']`
- Redirigir a `/onboarding/payment`

---

### 2.2 UX del paso de pago

**Mejorar el `PaymentStepClient`:**
- Mostrar precio con breakdown claro
- Beneficios del plan listados claramente
- "Sin permanencia — cancelás cuando quieras" prominente
- Logo de Mercado Pago visible + íconos de tarjetas aceptadas
- Botón de pago con feedback de loading
- Si el plan cargó null, mostrar precio de fallback claro (no precio 0)

---

### 2.3 Onboarding paso 1: UX mejorada

- Preview del catálogo URL en tiempo real ✅ (ya existe)
- Validación de slug único antes de avanzar (llamada async al endpoint `/api/stores/capacity`)
- Mensaje claro si el nombre ya está tomado

---

### 2.4 Email de bienvenida post-pago

**Trigger:** webhook de Mercado Pago confirma pago → `check-billing` o webhook activa `billing_status = 'active'`
**Acción:** enviar email de bienvenida con:
- URL del catálogo
- Link al panel admin
- Tips de primeros pasos

**Archivo a crear/modificar:** `src/lib/email/resend.ts` + `src/app/api/webhooks/mercadopago/route.ts`

---

## FASE 3 — BUGS CRÍTICOS EN ADMIN

> **Objetivo:** El admin funciona sin bugs que interrumpan la operación diaria.  
> **Tiempo estimado:** 6–8 hs

---

### 3.1 🔴 Fix: búsqueda de pedidos no funciona

**Archivo:** 
- `src/lib/actions/orders.ts` — agregar `search` a `OrderFilters`
- `src/lib/executor/handlers/orders.ts` — agregar filtrado por texto en `list_orders`
- `src/lib/hooks/use-orders.ts` — pasar filtro al hook
- `src/app/(admin)/admin/orders/page.tsx` — el search ya conecta al hook (verificar)

**Fix en handler:**
```typescript
if (search) {
  query = query.or(`customer_name.ilike.%${search}%,id.ilike.%${search}%`)
}
```

---

### 3.2 🟠 Fix: CategoryCatalogView no sincroniza carrito

**Archivo:** `src/app/(public)/[slug]/[category]/category-catalog-view.tsx`

**Bug:** No llama `setStoreId` ni pasa `stockModuleActive` a ProductGrid.

**Fix:**
```typescript
// Agregar al inicio del componente:
const { setStoreId } = useCartStore()
useEffect(() => { setStoreId(store.id) }, [store.id, setStoreId])

// En <ProductGrid>:
<ProductGrid ... stockModuleActive={stockModuleActive} />
```

---

### 3.3 🟠 Fix: bug en changeTier — validación de downgrade

**Archivo:** `src/lib/actions/billing.ts`

**Bug:** Lee `data` en lugar de `count` para validar el conteo de productos activos.

**Fix:**
```typescript
const { count, error: countError } = await db
  .from('products')
  .select('*', { count: 'exact', head: true })
  .eq('store_id', storeId)
  .is('deleted_at', null)
  .eq('is_active', true)

// Usar `count` (no `data`) para la validación:
if (count !== null && count > newMaxProducts) {
  return { success: false, error: 'Tenés más productos activos que el nuevo tier permite.' }
}
```

---

### 3.4 🟠 Fix: RLS faltantes en base de datos

**Archivo:** Script SQL de migración (ejecutar en Supabase)

**RLS a agregar:**

```sql
-- assistant_sessions: UPDATE para last_activity_at
CREATE POLICY "Users can update own sessions"
  ON assistant_sessions FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND accepted_at IS NOT NULL));

-- variant_attributes: UPDATE
CREATE POLICY "Store members can update variant attributes"
  ON variant_attributes FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND accepted_at IS NOT NULL));

-- variant_values: UPDATE
CREATE POLICY "Store members can update variant values"
  ON variant_values FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND accepted_at IS NOT NULL));

-- store_users: UPDATE y DELETE
CREATE POLICY "Store owners can update memberships"
  ON store_users FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users su2 WHERE su2.user_id = auth.uid() AND su2.role IN ('owner', 'admin') AND su2.accepted_at IS NOT NULL));

CREATE POLICY "Store owners can delete memberships"
  ON store_users FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users su2 WHERE su2.user_id = auth.uid() AND su2.role IN ('owner', 'admin') AND su2.accepted_at IS NOT NULL));
```

---

### 3.5 🟠 Fix: confirmaciones de acciones destructivas

**3.5.1** `src/components/admin/order-sheet.tsx`:
- Agregar `AlertDialog` antes de cancelar pedido

**3.5.2** `src/components/superadmin/users-table.tsx`:
- Agregar `AlertDialog` antes de ban de usuario

**3.5.3** `src/components/admin/product-sheet.tsx` y `order-sheet.tsx`:
- Detectar `form.formState.isDirty` al cerrar
- Mostrar `AlertDialog` "¿Tenés cambios sin guardar?"

---

### 3.6 🟠 Fix: StoreDetailPanel fechas de período

**Archivo:** `src/components/superadmin/store-detail-panel.tsx`

**Bug:** Ambas fechas "Inicio" y "Fin" muestran `current_period_end`.

**Fix:** La etiqueta "Inicio período" debe usar `store.current_period_start`.

---

### 3.7 🟠 Fix: useStock y useAssistantSession — query keys incorrectas

**Archivos:**
- `src/lib/hooks/use-stock.ts` — agregar `filters` a la query key
- `src/lib/hooks/use-assistant.ts` — agregar `sessionId` a la query key

**Fix en use-stock.ts:**
```typescript
queryKey: [...queryKeys.stock(store_id), filters],
```

**Fix en use-assistant.ts:**
```typescript
queryKey: [...queryKeys.assistantSession(store_id), sessionId],
```

---

## FASE 4 — BILLING PANEL COMPLETO

> **Objetivo:** El usuario puede ver su plan, cambiarlo y gestionarlo.  
> **Tiempo estimado:** 4–6 hs

---

### 4.1 Estado visible del plan actual

El `BillingPanel` debe mostrar claramente:
- Plan actual (mensual/anual)
- Fecha de próxima facturación
- Monto que se cobra
- Módulos activos
- Tier de productos (cuántos tiene vs cuántos puede tener)

**Verificar** que `getBillingInfo()` retorna todos estos campos correctamente desde Supabase.

---

### 4.2 Estado "sin suscripción" (billing_status = 'active' post-onboarding)

Si el usuario llegó al admin pero no tiene `mp_subscription_id` (pagó con checkout preference, no preapproval), mostrar estado especial con opción de suscribirse para renovación automática.

---

### 4.3 Botón "Cambiar plan" funcional

- Verificar que `changeTier` lleva al usuario a Mercado Pago correctamente
- Mostrar confirmación antes de cambiar
- Fix del bug 3.3 antes de esto

---

### 4.4 Botón "Cancelar suscripción"

- Mostrar AlertDialog con consecuencias claras
- "Tu acceso continúa hasta [fecha]"
- Confirmar cancelación

---

### 4.5 Módulos pro — toggle funcional

- Cada módulo pro debe poder activarse/desactivarse
- Mostrar costo adicional de cada módulo
- Reflejar cambio en el monto mensual en tiempo real

---

## FASE 5 — TIPOS TYPESCRIPT Y DEUDA TÉCNICA

> **Objetivo:** El código compila correctamente, sin `any`, con tipos que reflejan la BD real.  
> **Tiempo estimado:** 4–6 hs

---

### 5.1 Regenerar tipos desde Supabase CLI

```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/types/database.ts
```

Luego corregir las referencias que rompan.

**Desalineaciones conocidas a corregir:**
- `orders.source` — falta en tipos TS
- `stores.billing_period`, `stores.annual_paid_until`, `stores.ai_tokens_reset_at`
- `stores.custom_domain_txt_token` vs `custom_domain_verification_token`
- Varios campos de `plans` no reflejados

---

### 5.2 Eliminar `as any` en queries

**Archivos:** `src/lib/db/queries/*.ts` y handlers

Reemplazar `const db = supabaseServiceRole as any` por el cliente tipado:
```typescript
import type { Database } from '@/lib/types/database'
const db = supabaseServiceRole // si los tipos están bien generados
```

Esto requiere completar 5.1 primero.

---

### 5.3 Unificar formato de moneda

**Bug:** Dos implementaciones distintas — `currency.ts` y `whatsapp.ts`.

**Fix:** Crear un único helper en `src/lib/utils/currency.ts`:
```typescript
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

### 5.4 Zona horaria Argentina en fechas

**Archivo:** `src/lib/utils/date.ts`

**Fix:** Agregar `timeZone` explícito:
```typescript
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}
```

---

### 5.5 Unificar query keys

**Archivos:** `src/lib/hooks/use-finance.ts`, `use-expenses.ts`, `use-variants.ts`, `use-custom-domain.ts`, `use-sales.ts`

Migrar todas las claves manuales a la factory `src/lib/hooks/query-keys.ts`.

---

### 5.6 Unificar ActionResult en billing y superadmin

**Archivos:**
- `src/lib/actions/billing.ts` — `CreateSubscriptionResult`, `CancelSubscriptionResult` son tipos propios, no `ActionResult`
- `src/lib/actions/superadmin.ts` — retornos inconsistentes

Migrar todos a `ActionResult<T>` estándar.

---

## FASE 6 — PERFORMANCE Y EXPERIENCIA ADMIN

> **Objetivo:** El admin es rápido, sin estados de carga que duren más de 200ms.  
> **Tiempo estimado:** 6–8 hs

---

### 6.1 Suspense boundaries en rutas del admin

**Archivos:** `src/app/(admin)/admin/*/page.tsx`

Agregar `<Suspense fallback={<PageSkeleton />}>` alrededor del contenido de cada página.

---

### 6.2 next/dynamic para sheets y modales pesados

**Archivos a diferir:**
- `ProductSheet` (~550 líneas) — cargar solo cuando se abre
- `OrderSheet`
- Modales de variantes

```typescript
const ProductSheet = dynamic(() => import('@/components/admin/product-sheet'), {
  ssr: false,
})
```

---

### 6.3 Paginación real en superadmin

**Archivos:**
- `src/app/(superadmin)/superadmin/stores/page.tsx`
- `src/app/(superadmin)/superadmin/users/page.tsx`

Las queries ya soportan paginación real. Conectar la UI al paginador.

---

### 6.4 Búsqueda server-side en OrderSheet

**Archivo:** `src/components/admin/order-sheet.tsx`

Reemplazar `useProducts({ pageSize: 200 })` por búsqueda server-side con debounce al escribir.

---

### 6.5 staleTime y gcTime faltantes

**Archivo:** `src/lib/hooks/use-variants.ts`

Agregar:
```typescript
staleTime: staleTimes.variants ?? 30_000,
gcTime: gcTimes.variants ?? 300_000,
```

---

## FASE 7 — SEO Y CATÁLOGO PÚBLICO

> **Objetivo:** El catálogo de cada tienda está indexado correctamente y se ve bien en redes.  
> **Tiempo estimado:** 4–6 hs

---

### 7.1 Open Graph completo en páginas de producto

**Archivo:** `src/app/(public)/[slug]/p/[id]/page.tsx`

Agregar metadata completa:
```typescript
export async function generateMetadata({ params }) {
  const product = await getProductPublic(params.id)
  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image_url ? [{ url: product.image_url }] : [],
      type: 'website',
    },
    twitter: { card: 'summary_large_image' },
  }
}
```

---

### 7.2 OG tags en páginas de categoría

**Archivo:** `src/app/(public)/[slug]/[category]/page.tsx`

Agregar title, description y OG.

---

### 7.3 Sitemap con productos individuales

**Archivo:** `src/app/sitemap.ts`

Agregar URLs de productos individuales por tienda activa.

---

### 7.4 JSON-LD de disponibilidad real

**Archivo:** `src/app/(public)/[slug]/p/[id]/product-detail-view.tsx`

El campo `availability` en JSON-LD debe leer el stock real:
```typescript
availability: stockModuleActive && product.stock !== null
  ? product.stock > 0 ? 'InStock' : 'OutOfStock'
  : 'InStock'
```

---

### 7.5 "Cargar más" en vista por categoría

**Archivo:** `src/app/(public)/[slug]/[category]/`

La vista de categoría actualmente carga máximo 48 productos. Agregar paginación tipo "cargar más" similar a la del catálogo principal.

---

## FASE 8 — MIGRACIÓN SQL FINAL

> **Objetivo:** El schema de la BD en producción refleja correctamente todas las correcciones necesarias.  
> **Tiempo estimado:** 2–3 hs

---

### 8.1 Migración de índices faltantes

```sql
-- Índices en FKs sin índice
CREATE INDEX IF NOT EXISTS idx_finance_entries_order_id ON finance_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_payment_id ON finance_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_finance_entry_id ON expenses(finance_entry_id);
CREATE INDEX IF NOT EXISTS idx_savings_movements_finance_entry_id ON savings_movements(finance_entry_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_store_invitations_expires_at ON store_invitations(expires_at);
```

---

### 8.2 Migración de UNIQUE parciales

```sql
-- Stock sin variante: evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_product_no_variant
  ON stock_items(store_id, product_id) WHERE variant_id IS NULL;

-- Precios mayoristas sin variante
CREATE UNIQUE INDEX IF NOT EXISTS idx_wholesale_no_variant
  ON wholesale_prices(store_id, product_id, min_quantity) WHERE variant_id IS NULL;

-- Idempotencia de pagos MP
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_mp_payment_id
  ON payments(mp_payment_id) WHERE mp_payment_id IS NOT NULL;
```

---

### 8.3 Migración de FKs faltantes

```sql
-- FKs de store_id que faltan en el schema original
ALTER TABLE order_items 
  ADD CONSTRAINT IF NOT EXISTS fk_order_items_store 
  FOREIGN KEY (store_id) REFERENCES stores(id);

ALTER TABLE assistant_messages
  ADD CONSTRAINT IF NOT EXISTS fk_assistant_messages_store
  FOREIGN KEY (store_id) REFERENCES stores(id);

ALTER TABLE savings_movements
  ADD CONSTRAINT IF NOT EXISTS fk_savings_movements_store
  FOREIGN KEY (store_id) REFERENCES stores(id);
```

---

### 8.4 CHECK constraints faltantes

```sql
-- Precio de comparación debe ser mayor al precio
ALTER TABLE products
  ADD CONSTRAINT IF NOT EXISTS chk_compare_price
  CHECK (compare_price IS NULL OR compare_price > price);
```

---

## FASE 9 — ACCESIBILIDAD Y POLISH FINAL

> **Objetivo:** Experiencia premium para los 100 primeros clientes.  
> **Tiempo estimado:** 4–6 hs

---

### 9.1 Accesibilidad básica

- `BannerCarousel`: agregar `aria-label` a botones de navegación
- `EntityListPagination`: agregar texto accesible en botones anterior/siguiente
- Botones con solo iconos: agregar `aria-label` descriptivo

---

### 9.2 Guards de formularios

- Todos los Sheets con formulario deben preguntar antes de cerrar si hay cambios sin guardar
- Implementar un hook `useUnsavedChanges(isDirty: boolean)` reutilizable

---

### 9.3 Estados vacíos con onboarding contextual

Cuando una sección del admin está vacía (sin productos, sin pedidos, etc.), mostrar:
- Ícono ilustrativo
- Texto descriptivo
- Botón de acción principal claro

---

### 9.4 Loading skeletons consistentes

- Todas las tablas del admin deben mostrar skeletons durante carga
- Los skeletons deben reflejar la forma de los datos (columnas correctas)

---

### 9.5 Notificaciones push / badge de actividad

- Cuando llega un nuevo pedido, mostrar notificación en el admin
- (opcional para primera versión — usar polling si no hay WebSocket)

---

## FASE 10 — CHECKLIST FINAL PARA LANZAMIENTO

> Ejecutar antes de anunciar que se vende.

### Producción

- [ ] Variables de entorno configuradas: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Webhooks de Mercado Pago apuntando a la URL correcta de producción
- [ ] Cron jobs configurados en el proveedor de hosting (Vercel Cron / similar)
- [ ] Dominio principal configurado con SSL
- [ ] DNS wildcard configurado para subdominios de clientes (*.kitdigital.ar)

### Funcional

- [ ] Crear tienda de test → completar onboarding → pagar → entrar al admin ✅
- [ ] Crear producto → funciona sin error ✅
- [ ] Editar producto → funciona sin error ✅
- [ ] Crear pedido → funciona ✅
- [ ] Catálogo público → visible en `nombre.kitdigital.ar` ✅
- [ ] WhatsApp de pedido → llega con el link correcto ✅
- [ ] Cancelar suscripción → acceso continúa hasta fin de período ✅
- [ ] Webhook MP → la tienda se activa automáticamente post-pago ✅
- [ ] Billing page → muestra plan, tier, próxima facturación ✅
- [ ] Email de bienvenida → llega al crear la cuenta ✅

### Superadmin

- [ ] Login superadmin → panel accesible ✅
- [ ] Listado de tiendas con paginación ✅
- [ ] Ver detalle de tienda (fechas correctas) ✅
- [ ] Activar/archivar tienda manualmente ✅

---

## Orden de ejecución recomendado para un agente IA

```
FASE 0 → FASE 1 → FASE 2 → FASE 3 → FASE 4 → FASE 5 → FASE 8 → FASE 6 → FASE 7 → FASE 9 → FASE 10
```

Cada paso dentro de una fase puede ejecutarse en orden secuencial. Los pasos numerados con letras (1.1, 1.2...) son independientes entre sí salvo que se indique dependencia explícita.

---

## Notas para el agente IA ejecutor

1. **Nunca hacer migraciones destructivas** (DROP, DELETE, TRUNCATE) sin confirmación explícita del usuario.
2. **Antes de modificar un archivo**, leerlo primero para entender el contexto completo.
3. **Verificar que el código compila** después de cada cambio (`pnpm tsc --noEmit` o similar).
4. **Un paso a la vez**: no modificar más de 3 archivos por paso.
5. **Las migraciones SQL** se ejecutan en Supabase Dashboard > SQL Editor, no directamente.
6. **Los cambios de producción** (billing, middleware, onboarding) tienen mayor riesgo — confirmar con el usuario antes de aplicar en producción.
7. **Prerequisito para FASE 5.2**: completar FASE 5.1 (regenerar tipos) primero.

---

*Generado el 27 de abril de 2026 — KitDigital.ar*
