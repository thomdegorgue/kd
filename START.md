# START.md — KitDigital.ar — Guía Maestra de Desarrollo

> **Para agentes IA:** este archivo es el punto de entrada completo. Contiene estado actual, decisiones tomadas, referencias exactas de código y el plan fase a fase con checkboxes. Leer `auditoria.md` para análisis técnico detallado. Leer `schema.sql` para el modelo de datos.

## Estado: listo para ejecución por IA

**Orden obligatorio:** **FASE 0 → FASE 1 → FASE 2 → FASE 4+** (FASE 3 quedó absorbida en FASE 0 como fix de webhooks).

**Decisiones recientes (2026-05-02):**
- **Sin auto-upgrade de suscripción MP** por cantidad de productos. Plan self-serve = **$20.000/mes hasta 100 productos**; al llegar al cupo → **bloqueo + “contactá soporte”**. Ampliación de cupo y nuevo monto = **manual** (soporte/superadmin + nueva preapproval o acuerdo).
- **Catálogo demo y vivo:** un solo componente `CatalogStoreView` con `variant: 'live' | 'demo'`.
- **Onboarding IA:** idempotencia (`ai_onboarding_done`), timeout + fallback.
- **Admin demo:** banner + deshabilitar CTAs primarios donde sea barato.

---

## 0. Qué es KitDigital.ar

SaaS argentino de catálogos digitales para emprendedores. Cada comerciante tiene una **tienda** (subdominio en prod: `{slug}.kitdigital.ar`; path en dev: `/{slug}`). El panel de administración está en `/admin`. Se cobra una suscripción mensual o anual via **Mercado Pago**.

- **URL prod:** https://kitdigital.ar
- **Stack:** Next.js 16.2 (App Router) · React 19 · TypeScript strict · Supabase (Postgres + Auth + RLS) · Upstash Redis · MercadoPago REST · OpenAI · Resend · Cloudinary · Zod 4 · TanStack Query 5 · Zustand 5 · Tailwind 3
- **Repo:** monorepo mínimo (un solo `package.json` en la raíz, todo en `src/`)
- **Deploy:** Vercel · DB: Supabase cloud

---

## 1. Estructura de archivos clave

```
src/
├── app/
│   ├── page.tsx                          # Landing principal
│   ├── (public)/[slug]/                  # Catálogo público (delegar en CatalogStoreView)
│   ├── (public)/demo/[slug]/             # Misma vista, variant="demo" + overlay
│   ├── (admin)/admin/                    # Panel del comerciante (21 secciones)
│   ├── (superadmin)/superadmin/          # Panel interno KitDigital
│   ├── auth/                             # Login, signup, reset, callback
│   ├── onboarding/                       # Flujo de alta (REDISEÑAR — ver FASE 2)
│   └── api/
│       ├── webhooks/mercadopago/route.ts # Webhook billing MP (suscripción)
│       ├── webhooks/mercadopago/orders/  # Webhook pagos de órdenes
│       ├── cron/check-billing/route.ts   # Cron diario (trial, past_due, annual)
│       └── stores/capacity/route.ts      # Slots disponibles para landing
├── components/
│   ├── admin/billing-panel.tsx           # Panel billing (tiene bug P0 en línea 118)
│   └── admin/admin-shell.tsx             # Layout principal del admin
├── lib/
│   ├── actions/                          # Server Actions (27 archivos)
│   │   ├── billing.ts                    # create/cancel/changeTier subscription
│   │   ├── onboarding.ts                 # Pasos del onboarding (MODIFICAR — FASE 2)
│   │   └── checkout.ts                   # Carrito público
│   ├── billing/
│   │   ├── calculator.ts                 # computeMonthlyTotal, calculateAnnualPrice
│   │   ├── packs.ts                      # PACKS[], computePackTotal, packsToModules
│   │   ├── mercadopago.ts                # createPreapproval, cancelPreapproval, etc.
│   │   └── verify-signature.ts           # HMAC webhook MP
│   ├── db/queries/billing.ts             # getPlan, getBillingInfo, getStoreOwnerEmail
│   ├── executor/index.ts                 # Pipeline central: auth→módulos→límites→execute
│   ├── supabase/service-role.ts          # Cliente DB sin RLS (tipado como `any` — deuda P1)
│   ├── types/
│   │   ├── database.ts                   # Tipos DB (manual, 871 LOC — regenerar en P1)
│   │   └── index.ts                      # ModuleName, StoreContext, ActionResult, etc.
│   └── email/templates/                  # Emails Resend (welcome, trial-expired, etc.)
└── middleware.ts                          # Multi-tenant, auth, StoreContext en headers
```

**Archivos de configuración raíz:**
- `schema.sql` — esquema completo DB (aplicar sobre Supabase vacío)
- `verify_schema.sql` — queries de verificación (solo lectura)
- `wipe_public_schema.sql` — limpia schema para dev/staging
- `.env.example` — todas las vars requeridas
- `vercel.json` — redirects + crons (check-billing corre a las 3 AM UTC diario)
- `auditoria.md` — análisis técnico detallado + decisiones de producto

---

## 2. Variables de entorno (`.env.example`)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

MP_ACCESS_TOKEN=           # Token de app KitDigital (no de tiendas individuales)
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=         # Secret HMAC para verificar webhooks MP

OPENAI_API_KEY=            # Para asistente IA + onboarding IA (FASE 2)
RESEND_API_KEY=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

NEXT_PUBLIC_APP_URL=https://kitdigital.ar
NEXT_PUBLIC_APP_DOMAIN=kitdigital.ar    # Para construir subdominios en prod
NEXT_PUBLIC_WHATSAPP_NUMBER=

CRON_SECRET=               # Bearer token para /api/cron/*
```

---

## 3. Cómo correr el proyecto

```bash
pnpm install
cp .env.example .env       # Completar con credenciales reales
pnpm dev                   # Arranca en localhost:3000

# Aplicar schema si es DB nueva:
# Ir a Supabase > SQL Editor > pegar schema.sql > ejecutar

# Generar tipos DB (cuando el schema cambie):
pnpm types:db
```

---

## 4. Modelo de datos — tablas relevantes

| Tabla | Rol |
|---|---|
| `users` | Perfil (`role: user | superadmin`) |
| `stores` | Tenant: `slug`, `billing_status`, `modules` (JSONB), `limits` (JSONB), `config` (JSONB) |
| `store_users` | `user_id ↔ store_id` + `role: owner | admin | viewer` |
| `plans` | Config global: `price_per_100_products`, `bundle_3packs_price`, etc. |
| `billing_payments` | Pagos de suscripción KitDigital |
| `billing_webhook_log` | Idempotencia + auditoría webhooks MP billing |
| `products`, `categories` | Catálogo de cada tienda |
| `orders`, `order_items` | Pedidos |

**Valores de `billing_status`:** `demo` · `active` · `past_due` · `cancelled` · `archived`

**Columnas clave de `stores`:**
```sql
billing_status      TEXT        -- estado actual de la suscripción
billing_period      TEXT        -- 'monthly' | 'annual'
trial_ends_at       TIMESTAMPTZ -- para expirar demos (cron lee esto)
mp_subscription_id  TEXT        -- preapproval activa en MP
annual_paid_until   DATE        -- para plan anual
modules             JSONB       -- { products: true, stock: false, ... }
limits              JSONB       -- { max_products: 100, max_orders: 500 }
config              JSONB       -- config interna + pending_packs + onboarding
```

---

## 5. Modelo comercial actual

### Packs (`src/lib/billing/packs.ts`)

| Pack | Precio | Módulos |
|---|---|---|
| **core** | $0 | catalog, products, categories, cart, orders, banners, social, product_page, custom_domain |
| **operations** | $10.000 | stock, shipping, variants, payments |
| **finance** | $10.000 | finance, expenses, savings_account |
| **team** | $10.000 | multiuser, tasks, wholesale |
| **ai** | $10.000 | assistant |
| Bundle (ops+fin+team) | $25.000 | descuento $5.000 |

### Cupo de productos y precio base (FASE 1)

> **Self-serve:** el comerciante paga el **plan base** (hoy equivalente a **$20.000/mes** por hasta **100** productos activos, más packs). `stores.limits.max_products` es la fuente de verdad del cupo; valor inicial **100**.

> **Sin cobro automático por volumen:** no hay cron que cancele/cree preapprovals en MP cuando sube el número de productos. Eso evita re-autorizaciones y doble cobro.

**Tabla comercial de referencia** (landing, billing, negociación con cliente; **no** dispara webhooks):

| Hasta N productos (`max_products`) | Precio/mes sugerido (ARS) | Notas |
|---|---|---|
| 100 | $20.000 | Default; coincide con suscripción self-serve |
| 200 | $40.000 | Tras acuerdo; soporte sube `limits.max_products` y ajusta MP |
| 300 | $55.000 | Idem |
| 500 | $80.000 | Idem |
| 1.000 | $100.000 | Tope comercial sugerido |

Implementación: `src/lib/billing/commercial-tiers.ts` con `COMMERCIAL_TIERS[]`, `getSuggestedMonthlyCents(maxProducts)` — **solo UI y cotización**. El cobro real sigue siendo el monto de la preapproval/checkout que exista en MP tras el acuerdo operativo.

**Al superar el cupo:** el executor (crear/reactivar producto) devuelve error tipado; la UI muestra *"Necesitás más capacidad? Escribinos a …"* (definir canal: email, WhatsApp, formulario).

---

## 6. Flujo de billing actual (para entender antes de modificar)

```
Signup → createStore (auth.ts) → stores.billing_status = 'demo'
       ↓
Onboarding → createOnboardingCheckout → MP Checkout Preference (pago único)
           ↓ (webhook payment approved)
stores.billing_status = 'active' · periodo 30 días
           ↓ (mensual: preapproval caduca → webhook payment rejected)
billing_status = 'past_due'
           ↓ (30 días sin pago → cron)
billing_status = 'archived'
```

**Código relevante:**
- Signup + createStore: `src/lib/actions/auth.ts`
- Webhook billing principal: `src/app/api/webhooks/mercadopago/route.ts`
- Cron transiciones: `src/app/api/cron/check-billing/route.ts`
- Crear suscripción mensual: `src/lib/actions/billing.ts:createSubscription`
- Crear plan anual: `src/lib/actions/billing.ts:createAnnualSubscription`
- Cancelar preapproval: `src/lib/billing/mercadopago.ts:cancelPreapproval`

---

## 6b. Webhooks e idempotencia — matriz de resolución

| Transición | Riesgo | Acción en app |
|---|---|---|
| **Mensual (preapproval) → Anual (checkout)** | Doble cobro si sigue viva la preapproval | En `createAnnualSubscription`: `cancelPreapproval` + `mp_subscription_id = null` **antes** de crear preference. En webhook pago anual aprobado: si aún hay `mp_subscription_id`, cancelar de nuevo (defensa race). |
| **Anual → Mensual** | Solapamiento de períodos | Hasta definir producto/prorrateo: **solo soporte**. No exponer self-serve. |
| **`changeTier`** | Dos preapprovals | Ya cancela la anterior; añadir **evento + log** si falla el cancel. |
| **Evento MP duplicado** | Doble procesamiento | `billing_webhook_log.mp_event_id` UNIQUE + estado `processed` — mantener. |
| **`cancelPreapproval` falla** | Cobro duplicado | Webhook reintenta limpieza; superadmin revisa cola de huérfanos. |

---

## 7. BUGS ACTIVOS (resolver antes de cualquier feature)

### 🔴 BUG-1: Precio hero 10× inflado — `billing-panel.tsx:118`

```tsx
// LÍNEA 118 — INCORRECTO:
{formatARS(packPricing.total + (billing.limits as Record<string, number>).max_products * 200000)}

// FIX — usar la misma fórmula que línea 197:
{formatARS(packPricing.total + (Math.ceil(currentTier / 100) * 2_000_000))}
```

> 100 productos × 200000 = 20.000.000 centavos = **$200.000** (debería ser $20.000).

### 🔴 BUG-2: Módulo `checkout` huérfano

- `checkout` está en `ModuleName` (`src/lib/types/index.ts:60`) pero **NO está en ningún pack** (`src/lib/billing/packs.ts`).
- `createCheckoutOrder` en `src/lib/actions/checkout.ts:80` falla silenciosamente si `modules.checkout !== true`.
- **Fix:** agregar `'checkout'` al array `modules` del pack `operations` en `packs.ts`.

### 🔴 BUG-3: Doble cobro mensual → anual

- `createAnnualSubscription` en `src/lib/actions/billing.ts:219` crea un `createCheckoutPreference` (pago único anual) pero **no cancela** el `mp_subscription_id` mensual activo.
- **Fix en `billing.ts` antes de `createCheckoutPreference`:**

```ts
// AGREGAR en createAnnualSubscription (~línea 243, antes de update stores):
const { data: storeCheck } = await db
  .from('stores').select('mp_subscription_id').eq('id', ctx.store_id).single()
if (storeCheck?.mp_subscription_id) {
  await cancelPreapproval(storeCheck.mp_subscription_id).catch((e) =>
    console.warn('[billing] No se pudo cancelar preapproval al migrar a anual:', e)
  )
  await db.from('stores').update({ mp_subscription_id: null }).eq('id', ctx.store_id)
}
```

---

## 8. PLAN DE DESARROLLO — FASE A FASE

---

### FASE 0 — Hotfixes P0 (≈ 3 horas)

**Objetivo:** el producto puede venderse sin bugs visibles.

- [x] **F0-1** Fix precio hero en `src/components/admin/billing-panel.tsx:118`
  - Reemplazar `max_products * 200000` por `Math.ceil(currentTier / 100) * 2_000_000`
  - Extraer helper `getTierBaseCost(maxProducts: number): number` en `calculator.ts` para no duplicar

- [x] **F0-2** Mover `checkout` al pack `operations` en `src/lib/billing/packs.ts`
  - Agregar `'checkout'` al array `modules` del pack `operations`
  - Verificar que el executor y la UI de packs reflejan el cambio

- [x] **F0-3** Fix doble cobro mensual → anual (incluye “FASE 3” antigua)
  - Modificar `createAnnualSubscription` en `src/lib/actions/billing.ts` (ver BUG-3 arriba)
  - Webhook `route.ts`, rama pago anual aprobado: si `stores.mp_subscription_id` sigue seteado, `cancelPreapproval` + limpiar columna
  - Opcional: `emitEvent` `billing_period_changed_to_annual` para auditoría
  - Verificar `changeTier` sigue cancelando preapproval previa; log si falla

- [x] **F0-4** Limpieza de archivos legacy
  - Eliminar `src/components/admin/admin-layout.tsx` (121 LOC, 0 imports reales)
  - Eliminar `src/components/admin/superadmin-layout.tsx` (0 imports)
  - Eliminar directorio `echo/` si existe (vacío)
  - Limpiar referencias a `fixes.md` en `README.md:19,60` y `verify_schema.sql:41`
  - Quitar `NEXT_PUBLIC_SLOTS_AVAILABLE` de `.env.example` (ya viene de DB)
  - Quitar `SUPERADMIN_ALLOWED_IPS` de README (no implementado en código)

- [x] **F0-5** Unificar precio base en UI (hero + resumen)
  - Extraer helper p. ej. `getSelfServeBaseMonthlyCents()` = `2_000_000` o leer `plans.price_per_100_products` mientras siga alineado a $20k/100
  - Usar en `billing-panel.tsx:118` y en la card de resumen (eliminar `max_products * 200000`)

---

### FASE 1 — Cupo 100 + tabla comercial + ampliación manual (≈ 6 h) ✅ COMPLETADA

**Objetivo:** self-serve claro ($20k / hasta 100 productos); **sin** cambiar cobros MP automáticamente por volumen.

#### F1-1: `src/lib/billing/commercial-tiers.ts` (solo referencia comercial)

```typescript
export type CommercialTier = { max_products: number; price_cents: number }

export const COMMERCIAL_TIERS: readonly CommercialTier[] = [
  { max_products: 100,  price_cents: 2_000_000 },
  { max_products: 200,  price_cents: 4_000_000 },
  { max_products: 300,  price_cents: 5_500_000 },
  { max_products: 500,  price_cents: 8_000_000 },
  { max_products: 1000, price_cents: 10_000_000 },
] as const

/** Precio mensual sugerido para un cupo negociado (UI / cotización). */
export function getSuggestedMonthlyCentsForCap(maxProducts: number): number {
  const row = COMMERCIAL_TIERS.find(t => t.max_products === maxProducts)
    ?? COMMERCIAL_TIERS.find(t => maxProducts <= t.max_products)
  return row?.price_cents ?? COMMERCIAL_TIERS[COMMERCIAL_TIERS.length - 1].price_cents
}
```

#### F1-2: Default y enforce de cupo

- Al activar tienda (`webhook` primer pago, `createStore`, etc.): asegurar `limits.max_products = 100` si no viene otra cosa acordada.
- **Executor / handler de productos:** antes de insert o reactivar, `count_active_products < limits.max_products`; si no, `PRODUCT_LIMIT_REACHED` + mensaje con link a soporte.
- Tests: intentar crear producto 101 → falla con código esperado.

#### F1-3: UI billing + landing

- `billing-panel`: texto tipo *"Tu plan incluye hasta {max_products} productos. ¿Más? Escribinos."* + tabla `COMMERCIAL_TIERS` como referencia.
- Landing / `PricingCalculator`: misma tabla; aclarar que el precio publicado es el self-serve; ampliaciones **con soporte**.

#### F1-4: Flujo operativo superadmin (manual)

Checklist cuando un cliente pide más cupo:

1. Acordar nuevo `max_products` y monto mensual (según tabla o excepción).
2. En DB: `UPDATE stores SET limits = jsonb_set(limits, '{max_products}', '<N>')`.
3. En MP: **nueva preapproval** con el monto acordado (o proceso acordado fuera de banda) y **cancelar** la anterior si aplica — mismo patrón que `changeTier`.
4. `events`: `capacity_upgraded_manual` con `{ old_cap, new_cap, agreed_cents }`.
5. (Futuro) Pantalla superadmin que haga 2–4 sin SQL a mano.

#### F1-5: `calculator.ts` (opcional, P1)

- Mantener `computeMonthlyTotal` alineado al **cupo actual** y precio **efectivo** guardado en config o plan hasta tener `quote()` único. No usar tabla comercial para cobrar sin intervención humana.

**Explícitamente NO hacer:** cron que modifique preapproval por cantidad de productos.

---

### FASE 2 — Flujo Demo + Onboarding IA (≈ 12 horas) ✅ COMPLETADA

**Objetivo:** el comerciante puede probar la plataforma sin pagar. Al completar el onboarding, OpenAI crea 1 producto + 1 categoría personalizados. La tienda queda en `/demo/{slug}` con efecto WOW.

#### Flujo completo

```
/auth/signup
    ↓ (createStore → billing_status = 'demo', trial_ends_at = now + 14 días)
/onboarding
    ↓ Paso 1: Nombre de tienda + descripción del negocio
    ↓ Paso 2: Color principal + logo (opcional)
    ↓ (sin paso de pago)
[Server: llamar OpenAI → crear categoría + producto personalizados]
    ↓ Redirect
/demo/{slug}   ← NUEVA ruta pública
    ↓ (bloque flotante con botones)
/admin          ← modo LECTURA para billing_status = 'demo'
    ↓ (CTA "Adquirí tu tienda")
/onboarding/payment  ← solo al querer pagar
    ↓ (pago exitoso)
/admin          ← modo EDICIÓN completo
```

#### F2-1: Rediseñar pasos de onboarding

**Archivos:** `src/app/onboarding/`, `src/lib/actions/onboarding.ts`

Pasos actuales → pasos nuevos:
- Eliminar el paso de **módulos** (`/onboarding/modules/`) — no relevante para la demo
- Eliminar el paso de **producto manual** (`/onboarding/product/`) — lo hace la IA
- Eliminar el paso de **pago** (`/onboarding/payment/`) del flujo inicial — viene después
- Mantener: nombre + descripción (paso 1), logo + color (paso 2)

**Nuevo schema del paso 1 en `onboarding.ts`:**
```typescript
const step1Schema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10, 'Contanos de qué trata tu negocio').max(500),
  whatsapp: z.string().regex(...).optional().or(z.literal('')),
})
```

**Al completar paso 2 (logo+color):**
- Guardar datos en `stores`
- Llamar `generateOnboardingContent(storeId)` (nueva función)
- Hacer `redirect('/demo/' + slug)` en lugar de `/onboarding/payment`

#### F2-2: Crear `src/lib/actions/ai-onboarding.ts`

**Reglas obligatorias (idempotencia y costo):**

1. **Al inicio:** leer `stores.config`; si `ai_onboarding_done === true`, **return** (F5, doble submit, reintentos).
2. **Lock optimista:** opcional `config.ai_onboarding_status: 'pending' | 'done' | 'failed'` para evitar dos jobs paralelos.
3. **Timeout:** `AbortSignal.timeout(12_000)` o `Promise.race` con el fetch a OpenAI.
4. **Fallback:** si timeout/error/JSON inválido → insertar categoría+producto **genéricos** (“Tu primer producto”, etc.) y marcar `ai_onboarding_done: true` igualmente.
5. **Una transacción lógica:** categoría + producto + `product_categories` + update `config` en el menor número de round-trips posible.
6. **Modelo:** `gpt-4o-mini` (o equivalente barato), `max_tokens` ≤ 400, `response_format: { type: 'json_object' }`.

```typescript
'use server'

import OpenAI from 'openai'

export async function generateOnboardingContent(storeId: string): Promise<void> {
  // 1. Obtener datos de la tienda; si ai_onboarding_done → return
  const { name, description, config } = await db.from('stores')...

  // 2. Llamar a OpenAI (con AbortSignal / timeout)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Sos un asistente que ayuda a crear catálogos digitales en Argentina.
      
      Tienda: "${name}"
      Descripción del negocio: "${description}"
      
      Generá en JSON:
      {
        "category": { "name": string, "description": string },
        "product": {
          "name": string,
          "description": string (2-3 oraciones, tono comercial argentino),
          "price": number (precio sugerido en pesos ARS, sin centavos)
        }
      }
      
      Reglas: nombres en español, precios razonables para Argentina 2025, 
      descripción de producto con tono amigable y persuasivo.`
    }],
    response_format: { type: 'json_object' },
    max_tokens: 300,
  })

  const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')

  // 3. Crear categoría
  const { data: category } = await db.from('categories').insert({
    store_id: storeId,
    name: parsed.category.name,
    description: parsed.category.description,
    is_active: true,
  }).select('id').single()

  // 4. Crear producto y asignarlo a la categoría
  const { data: product } = await db.from('products').insert({
    store_id: storeId,
    name: parsed.product.name,
    description: parsed.product.description,
    price: Math.round(parsed.product.price * 100),
    is_active: true,
  }).select('id').single()

  if (category?.id && product?.id) {
    await db.from('product_categories').insert({
      product_id: product.id,
      category_id: category.id,
    })
  }

  // 5. Marcar onboarding IA completado en config
  await db.from('stores')
    .update({ config: { ...currentConfig, ai_onboarding_done: true } })
    .eq('id', storeId)
}
```

**Loader cliente:** polling hasta `getOnboardingStatus()` refleje `ai_onboarding_done` (o error controlado), con tope de reintentos.

#### F2-3: Vista unificada de catálogo + `/demo/[slug]`

**No duplicar** la página de `[slug]/page.tsx`. Extraer un componente servidor (o composición) reutilizable:

- **Archivo sugerido:** `src/components/public/catalog-store-view.tsx`
- **Props mínimas:** `store` (o datos ya cargados), `slug: string`, `variant: 'live' | 'demo'`
- **`variant === 'demo'`:** renderizar hijo `DemoOverlay` (client) con URL pública `/demo/{slug}`
- **`variant === 'live'`:** sin overlay; URLs de catálogo como hoy

**Archivo:** `src/app/(public)/[slug]/page.tsx`  
→ Cargar datos **una vez**; delegar en `<CatalogStoreView ... variant="live" />`.

**Archivo:** `src/app/(public)/demo/[slug]/page.tsx`  
→ Resolver la misma tienda por `slug` (misma query/helper que arriba); `<CatalogStoreView ... variant="demo" />`.

Si el fetch de store falla en demo (no existe o no es `billing_status = demo`), devolver 404 o redirect a landing según regla de producto.

**Archivo:** `src/app/(public)/demo/[slug]/_components/demo-overlay.tsx`

```typescript
// Bloque flotante fijo en la parte inferior
// No tapa el contenido de la tienda (position: fixed, bottom-0)
// 3 acciones:
//   1. Copiar URL: navigator.clipboard.writeText(`kitdigital.ar/demo/${slug}`)
//   2. WhatsApp: `https://wa.me/?text=Mirá mi tienda: https://kitdigital.ar/demo/${slug}`
//   3. "Ir a mi panel" → redirect('/admin')
```

**Middleware:** agregar `/demo` como ruta pública en `src/middleware.ts`:
```typescript
// En el bloque de rutas públicas del sistema (~línea 124):
if (
  pathname.startsWith('/auth') ||
  pathname.startsWith('/invite') ||
  pathname.startsWith('/design') ||
  pathname.startsWith('/demo') ||   // ← AGREGAR
  pathname.startsWith('/api/')
) {
  return NextResponse.next()
}
```

**Dev vs Prod:** en dev la ruta es `/demo/{slug}` (path). En prod la URL es `kitdigital.ar/demo/{slug}` (también path, NO subdominio — es una ruta dentro del sitio principal).

#### F2-4: Admin en modo lectura para tiendas demo

**Cambio en middleware (`src/middleware.ts:214-217`):**

```typescript
// ANTES:
if (billingStatus === 'demo' || billingStatus === 'pending_payment') {
  return NextResponse.redirect(new URL('/onboarding/payment', request.url))
}

// DESPUÉS: permitir acceso al admin pero marcar como demo en el contexto
// (el StoreContext ya tiene billing_status = 'demo')
// No hacer redirect — el admin se encargará de mostrar el modo lectura
```

**En `src/lib/executor/index.ts`:** el executor ya debe rechazar escrituras cuando `billing_status = 'demo'`. Verificar que la condición `store_allows_writes()` incluye `demo` como estado de solo lectura (actualmente solo permite `active` y `past_due`).

**Banner global en admin:** en `src/components/admin/admin-shell.tsx` (o en el layout de admin), agregar:

```tsx
{storeContext.billing_status === 'demo' && (
  <DemoBanner slug={storeContext.slug} />
)}
```

**`DemoBanner` component:**
- Texto: "Modo demostración — Tu tienda es de solo lectura"
- CTA: "Adquirí tu tienda · desde $20.000/mes" → redirige a `/onboarding/payment`
- Color: azul/primario, no intrusivo pero visible

**UX proactiva (además del executor):**
- En páginas con acciones obvias (`/admin/productos`, `/admin/categorias`, etc.): si `billing_status === 'demo'`, **deshabilitar** botones “Nuevo”, “Guardar”, “Eliminar” y enlaces equivalentes; tooltip o texto corto *"Disponible al activar tu tienda"*.
- Mantener el bloqueo real en servidor (executor); la UI evita clicks inútiles y toasts repetidos.

#### F2-5: Cron — expiración de demos en 14 días

En `src/app/api/cron/check-billing/route.ts`, la sección 1 ("Trial vencido → past_due") ya existe y usa `trial_ends_at`. **El nuevo flujo demo DEBE usar `trial_ends_at`** para que el cron lo capture.

**En `createStore` (`src/lib/actions/auth.ts`)**, al crear la tienda en demo, setear:
```typescript
trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
```

**Cambiar la transición** del cron: en lugar de `past_due`, la tienda demo expirada debería ir a `archived` directamente (o `past_due` por 7 días y luego `archived`). Decisión: ir a `past_due` primero (consistente con el flujo actual), y los 30 días de `past_due` → `archived` se heredan.

**Email de expiración:** usar el `TrialExpiredEmail` existente con copy actualizado:
> "Tu tienda demo expiró. Pagá ahora para activarla y conservar tu nombre de tienda."

#### F2-6: Flujo de pago desde la demo

**Nueva ruta:** `/onboarding/payment` ya existe. Adaptar para que funcione también para usuarios que ya completaron el onboarding pero no pagaron.

**Lógica:**
1. Usuario en admin demo hace clic en "Adquirí tu tienda"
2. Redirige a `/onboarding/payment`
3. Al pagar: webhook activa `billing_status = 'active'`
4. Redirect a `/admin` — ahora en modo edición completo
5. La tienda migra de `/demo/{slug}` a `{slug}.kitdigital.ar` (en prod) automáticamente

---

### FASE 3 — (deprecada)

Los ítems de webhook mensual→anual e idempotencia están en **FASE 0 / F0-3** y en **§6b**. No hay checklist duplicado aquí.

---

### FASE 4 — Calidad (P1, ≈ 2 días)

- [ ] **F4-1** Regenerar `src/lib/types/database.ts` con Supabase CLI
  ```bash
  pnpm types:db
  ```
  Luego: tipar `supabaseServiceRole` en `src/lib/supabase/service-role.ts`:
  ```typescript
  import type { Database } from '@/lib/types/database'
  export const supabaseServiceRole = createClient<Database>(url, key)
  ```
  Eliminar `as any` en cascada (53 archivos).

- [ ] **F4-2** Tests críticos (crear en `src/lib/billing/` y `executor/`)
  - `commercial-tiers.test.ts` — `getSuggestedMonthlyCentsForCap()` y filas de `COMMERCIAL_TIERS`
  - `calculator.test.ts` — `computeMonthlyTotal`, `calculateAnnualPrice`
  - `verify-signature.test.ts` — HMAC + anti-replay
  - `webhook.test.ts` — mock de pago aprobado/rechazado + idempotencia
  - `executor.test.ts` — módulo inactivo, tienda `demo`, límites

- [ ] **F4-3** CI con GitHub Actions
  ```yaml
  # .github/workflows/ci.yml
  - pnpm lint
  - pnpm tsc --noEmit
  - pnpm test
  ```

- [ ] **F4-4** Encriptar `payment_methods.config.access_token`
  - Usar `pgcrypto` de Postgres o cifrado en app layer antes de guardar en DB
  - Afecta: `src/lib/payments/mercadopago.ts` (lectura) y acción de crear payment method

- [ ] **F4-5** CSP report-only en `next.config.ts`
  ```typescript
  "Content-Security-Policy-Report-Only": "default-src 'self'; img-src 'self' res.cloudinary.com; ..."
  ```

- [ ] **F4-6** Sentry
  ```bash
  pnpm add @sentry/nextjs
  # Seguir setup wizard de Sentry para Next.js App Router
  ```

---

### FASE 5 — Preparación para crecer (P2)

- [ ] **F5-1** Cache `StoreContext` en Redis (60s TTL) en `middleware.ts`
  - La query de `store_users` + `stores` en cada request `/admin/*` → cachear resultado
  - Key: `store_context:user_id:{userId}`
  - Invalidar cuando el webhook de billing cambie `billing_status`

- [ ] **F5-2** Dashboard de webhooks fallidos en `/superadmin/webhooks`
  - Filtrar `billing_webhook_log WHERE status = 'failed'`
  - Mostrar payload + botón "Reintentar"

- [ ] **F5-3** Healthcheck `/api/health`
  - DB ping: `SELECT 1`
  - Redis ping: `redis.ping()`
  - MP reachable: `HEAD https://api.mercadopago.com`

- [ ] **F5-4** Empty states con CTA a pack
  - En `/admin/finance`, `/admin/stock`, etc.: si el módulo está OFF, mostrar card con precio y link a `/admin/billing?pack=finance`
  - Ya existen `plan-upgrade-prompt.tsx` y `pack-inactive-warning.tsx` — conectarlos

- [ ] **F5-5** Migrar switch de Radix a Base UI
  - `src/components/ui/switch.tsx` → reemplazar `@radix-ui/react-switch` por `@base-ui/react/switch`
  - Eliminar `@radix-ui/react-switch` del `package.json`

---

## 9. Patrones de código — reglas para no romper nada

### Server Actions

```typescript
// Patrón estándar para acciones protegidas:
'use server'

const db = supabaseServiceRole as any  // TODO: tipar cuando se regenere database.ts

export async function miAction(rawInput: unknown): Promise<ActionResult<T>> {
  try {
    const ctx = await getStoreContext()  // lanza si no autenticado
    const input = miSchema.parse(rawInput)
    // ... lógica ...
    return { success: true, data: resultado }
  } catch (err) {
    return { success: false, error: { code: 'SYSTEM_ERROR', message: ... } }
  }
}
```

### Executor (para operaciones que afectan al catálogo)

```typescript
// Las acciones de productos/órdenes/etc. pasan por el executor:
// src/lib/executor/index.ts → valida store_id, status, módulos, límites
// NO usar el executor para billing, auth, onboarding, superadmin (tienen su propio flujo)
```

### Emitir eventos de auditoría

```typescript
await db.from('events').insert({
  store_id: storeId,
  type: 'nombre_del_evento',  // snake_case, descriptivo
  actor_type: 'user' | 'system',
  actor_id: userId | null,
  data: { /* datos relevantes */ },
})
```

### MP preapproval vs checkout preference

- **Preapproval** (`/preapproval`): suscripción recurrente mensual. Se auto-cobra cada mes.
- **Checkout Preference** (`/checkout/preferences`): pago único. Usar para plan anual.
- **Identificar tienda en webhook:** `external_reference = "{store_id}|monthly"` o `"{store_id}|annual"`

---

## 10. Deuda técnica — para no olvidar

| Ítem | Archivo | Impacto |
|---|---|---|
| `as any` en 53 archivos | todos los `actions/`, `queries/` | Bugs silenciosos en rename |
| `billing-panel.tsx:118` (BUG-1) | billing-panel | Precio visible incorrecto |
| `checkout` fuera de packs (BUG-2) | `packs.ts` | Carrito web bloqueado |
| Doble cobro mensual→anual (BUG-3) | `billing.ts:219` | Riesgo financiero |
| `events` sin FK formal | `schema.sql:461` | Posibles huérfanos |
| `getStoreOwnerEmail` duplicado x3 | webhook, cron, queries | Mantener sincronizados |
| `getSlotsAvailable` duplicado x2 | `page.tsx:12`, `capacity/route.ts` | Extraer a `queries/stores.ts` |
| `getCatalogUrl` duplicado x3+ | varios | Extraer a helper |
| Sin tests (4 cases en 1 archivo) | `packs.test.ts` | Riesgo en cada refactor |
| Sin CSP, Sentry, healthcheck | varios | Observabilidad cero |
| `payment_methods.config.access_token` en cleartext | DB | Riesgo si DB se filtra |

---

## 11. Checklist de release (antes de primeros clientes)

- [ ] BUG-1 precio hero corregido
- [ ] BUG-2 módulo checkout en pack operations
- [ ] BUG-3 doble cobro mensual→anual resuelto
- [ ] Flujo demo completo funcionando end-to-end
- [ ] OpenAI genera producto+categoría correctamente
- [ ] `/demo/{slug}` cargando con overlay
- [ ] Admin en modo lectura para billing_status = 'demo'
- [ ] Cron expiración demos configurado y testeado
- [ ] Cupo 100 + tabla comercial + enforce en executor; billing-panel y landing alineados
- [ ] Al menos 5 tests: `commercial-tiers`, webhook/calculator o executor (límites), firma HMAC
- [ ] Sentry configurado
- [ ] Variables de producción en Vercel configuradas
- [ ] Webhook MP apuntando al endpoint correcto en Producción

---

## 12. Comandos útiles

```bash
# Desarrollo
pnpm dev                          # Puerto 3000
pnpm build                        # Verificar que compila
pnpm tsc --noEmit                 # TypeCheck sin generar archivos
pnpm lint                         # ESLint
pnpm test                         # Vitest

# DB
pnpm types:db                     # Regenerar types/database.ts (requiere SUPABASE_ACCESS_TOKEN)
# Para limpiar DB de desarrollo:
# En Supabase SQL Editor → pegar wipe_public_schema.sql → luego schema.sql

# Bundle análisis
pnpm analyze                      # Bundle analyzer (abrir .next/analyze/*.html)

# Simular cron en local (con curl):
curl -H "Authorization: Bearer TU_CRON_SECRET" http://localhost:3000/api/cron/check-billing
```

---

*Última actualización: 2026-05-02 · Commit base `a59f9e4 fixes` · Incluye: cupo 100 + ampliación manual (sin auto-upgrade MP), catálogo unificado demo/live, webhooks §6b, onboarding IA endurecido.*
*Ver `auditoria.md` para análisis técnico detallado de cada dominio.*
