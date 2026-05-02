# Auditoría general — KitDigital.ar

**Fecha:** 2026-05-02
**Branch:** `main` · último commit: `a59f9e4 fixes`
**Estado declarado:** producción (testing, no vendiendo aún) · meta 100 catálogos vendidos.

---

## 0. TL;DR

KitDigital es un SaaS multi-tenant sólido en su núcleo: schema bien diseñado, RLS exhaustivo, executor central con auth/módulos/límites, integración MP con HMAC + anti-replay e idempotencia, multi-tenancy resuelto vía middleware con `x-store-context`. La arquitectura de **5 packs comerciales** está implementada.

Sin embargo, el producto **no está listo para vender**: hay un bug visible que muestra precios 10× más altos en el panel de suscripción, hay un módulo `checkout` huérfano que bloquea silenciosamente el carrito online, hay archivos legacy (admin-layout, superadmin-layout, echo/, fixes.md, MODULOS.md, START.md, DECISIONES.md) que confunden, y el tipado de DB se mantuvo a mano dejando **53 archivos con `as any`** (y 60 `eslint-disable`). Tests prácticamente cero (1 archivo, 4 cases).

**Prioridad para vender:** P0 (bug pricing visible) → P0 (checkout huérfano) → P1 (limpieza legacy + regenerar `database.ts`) → P2 (tests críticos: webhook, executor, calculator).

---

## 1. Composición del proyecto

### 1.1 Stack
- **Runtime:** Next.js 16.2.3 (App Router) + React 19.2.4 + TS strict (`tsconfig.json:7`)
- **DB:** Supabase (Postgres + Auth + RLS + Realtime), tipos en `src/lib/types/database.ts` (manuales, 871 LOC)
- **Cache:** Upstash Redis (con fallback no-op si no hay env, `src/lib/redis.ts`)
- **Pagos:** Mercado Pago (REST directo, no SDK)
- **Email:** Resend
- **AI:** OpenAI (asistente)
- **UI:** Tailwind v3 + shadcn/ui sobre `@base-ui/react` (con un outlier `@radix-ui/react-switch`)
- **State:** TanStack Query 5 + Zustand 5
- **Forms:** React Hook Form + Zod 4
- **Tests:** Vitest 4 (1 archivo)

### 1.2 Layout de rutas (App Router)
| Grupo | Ruta | Propósito |
|---|---|---|
| `(public)` | `/[slug]`, `/[slug]/checkout`, `/tracking` | Catálogo público, checkout, tracking |
| `(admin)` | `/admin/*` (21 secciones) | Panel del comerciante |
| `(superadmin)` | `/superadmin/*` (events, plan, stores, users, webhooks) | Panel interno |
| —  | `/auth/*`, `/onboarding/*`, `/invite/[token]`, `/design`, `/`, legales | Sistema |
| `api` | `/api/{cron,webhooks,pdf,stores}` | Endpoints de máquina |

### 1.3 Capas
- **Middleware:** resuelve slug (subdominio en prod, path en dev), inyecta `x-store-context` para `/admin/*`, gatekeeps `/superadmin/*`. Escribe contexto en headers — patrón limpio.
- **Server Actions** (`src/lib/actions/*` — 27 archivos): puertas de entrada del cliente. Dos flavors:
  - Las que pasan por `executor` (productos, órdenes, etc.).
  - Las "especiales" (auth, billing, checkout público, onboarding, superadmin) que usan `supabaseServiceRole` directo + emisión manual de evento.
- **Executor** (`src/lib/executor/`): `executor()` valida tienda + actor + módulos + límites + input + ejecuta + emite evento + invalida caché + revalida ISR. 20 handlers registrados.
- **DB queries** (`src/lib/db/queries/`): solo lectura, lado servidor.
- **Hooks TanStack** (`src/lib/hooks/`): mirroring de las acciones para el cliente; query keys centralizadas en `query-keys.ts`.
- **Validations Zod:** 22 archivos en `src/lib/validations/` (uno por dominio).

### 1.4 Modelo comercial (packs)
| Pack | Precio | Módulos | Notas |
|---|---|---|---|
| **core** | $0 | catalog, products, categories, cart, orders, banners, social, product_page, custom_domain | Siempre activo |
| **operations** | $10.000 | stock, shipping, variants, payments | Pack |
| **finance** | $10.000 | finance, expenses, savings_account | Pack |
| **team** | $10.000 | multiuser, tasks, wholesale | Pack |
| **ai** ⚡ | $10.000 | assistant | Destacado |
| Bundle 3 ops | $25.000 (–$5.000) | operations + finance + team | Atajo |

Tier base: **$20.000 / 100 productos / mes** (`plans.price_per_100_products = 2_000_000` centavos).

---

## 2. Hallazgos críticos (P0 — antes de vender)

### 🔴 2.1 Bug en `billing-panel.tsx`: precio del HERO 10× inflado
**Archivo:** `src/components/admin/billing-panel.tsx:118`

```tsx
<p className="text-4xl font-bold">
  {formatARS(packPricing.total + (billing.limits as Record<string, number>).max_products * 200000)}
</p>
```

`max_products * 200000` da, para 100 productos, 20.000.000 centavos = **$200.000**. La fórmula correcta (que el mismo archivo usa más abajo, línea 197) es `Math.ceil(max_products / 100) * 2_000_000`. El usuario ve **dos precios distintos en la misma vista**: $200.000 en el hero y $20.000 en el resumen.

**Fix:** reemplazar por `Math.ceil(currentTier / 100) * 2_000_000` (idéntico al de la card de resumen) y extraer a un helper compartido para no repetir el cálculo.

### 🔴 2.2 Módulo `checkout` huérfano
- `ModuleName` lo declara (`types/index.ts:60`).
- **No está en ningún PACK** (`lib/billing/packs.ts` — buscar `checkout`).
- `getPublicPaymentMethods` (`actions/checkout.ts:278`) y `createCheckoutOrder` (línea 80) cortocircuitan si `modules.checkout !== true`.
- Solo se prende manualmente desde `/admin/payments` (`payments/page.tsx:189`).

**Consecuencia:** un comerciante que activa Pack Operations cree que tiene checkout online (porque el pack incluye `payments`), pero el carrito web sigue silenciosamente desactivado hasta que toque un toggle escondido en otra pantalla.

**Fix recomendado:** mover `checkout` al pack `operations` (pertenece ahí) o, si la decisión de producto es desacoplarlo (porque depende de configurar transferencia/MP), entonces auto-activarlo cuando el usuario crea su primer `payment_method` activo.

### 🔴 2.3 `database.ts` manual + 53 archivos con `as any`
- `database.ts` (871 LOC) está documentado como "Generado con Supabase CLI" pero el script `scripts/gen-supabase-types.mjs` no se corrió (faltan `Relationships`).
- El cliente `supabaseServiceRole` se exporta **sin tipar** (`service-role.ts:5`) y se castea a `any` en cada archivo de acciones, queries, handlers y rutas API → 53 archivos, 60 `eslint-disable`.
- Pierde toda la seguridad de tipos en la capa de datos. Cualquier renombre de columna falla en runtime.

**Fix:** ejecutar `pnpm types:db` con `SUPABASE_ACCESS_TOKEN`, importar `Database` en `service-role.ts` (`createClient<Database>(...)`), borrar los `as any` de raíz. Esto es 1 día bien invertido.

---

## 3. Incongruencias y deuda visible

### 3.1 Componentes legacy / muertos
| Archivo | Estado | Acción |
|---|---|---|
| `src/components/admin/admin-layout.tsx` (121 LOC) | Sin imports reales (solo se referencia a sí mismo). El layout activo es `admin-shell.tsx`. | **Eliminar** |
| `src/components/admin/superadmin-layout.tsx` | Sin imports (Grep: 0). El layout real es `superadmin-shell.tsx`. | **Eliminar** |
| `echo/` (directorio) | Vacío. | **Eliminar** |
| `MODULOS.md`, `DECISIONES.md` | Pueden estar obsoletos en el repo. | `START.md` **sí existe** en la raíz como guía maestra para agentes IA. |
| `fixes.md` | Referenciado en `README.md:19,60` y `verify_schema.sql:41`. **No existe**. | Crear o limpiar referencias |
| `plandedesarrollo.md` | Citado en memoria del agente, **no existe**. | Limpiar memoria |

### 3.2 Doc/code drift
- `README.md` lista `SUPERADMIN_ALLOWED_IPS` como env var pero **ningún archivo la lee** (Grep: 0 hits en `src/`). Decidir: implementar (en middleware antes de la verificación de role) o quitarla del README.
- `.env.example` lista `NEXT_PUBLIC_WHATSAPP_NUMBER` (usado en 2 sitios — OK) y `NEXT_PUBLIC_SLOTS_AVAILABLE` (usado en 0 sitios — el slot counter ahora viene de DB vía `/api/stores/capacity` y `getSlotsAvailable` en `src/app/page.tsx`). Quitar de `.env.example`.
- `nombres oficiales del producto` del README dice "Catálogo / Portada / Módulos / Panel". El UI usa "Catálogo / Banners / Módulos / Panel". Se quedó obsoleto el nombre "Portada".

### 3.3 Inconsistencias dentro del modelo de datos
- **`events.store_id` no tiene FK formal** (`schema.sql:461-469`). Se documenta en `clear.sql:14` ("se puede borrar directo"). Riesgo de huérfanos si alguien borra `stores` por API.
  → Agregar `FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL` para preservar histórico de auditoría.
- **`billing_webhook_log.store_id` y `order_webhook_log.store_id`** sí tienen FK pero sin `ON DELETE` definido (default = NO ACTION). Si se borra una tienda, los webhooks quedan trabados.
  → Definir `ON DELETE SET NULL` para no perder histórico.
- **Plan único asumido**: muchas queries hacen `.eq('is_active', true).single()` (`actions/billing.ts`, `executor/handlers/stores.ts:24`, `db/queries/billing.ts:35`). Si por algún motivo hay más de 1 plan activo, todos esos endpoints rompen sin warning. Agregar `LIMIT 1` o índice parcial `UNIQUE (is_active) WHERE is_active=true`.
- **`onboarding.ts:201` usa `order by created_at limit 1` para `getPlan`** mientras todo el resto usa `is_active=true`. Inconsistencia silenciosa.
- **Onboarding hard-codea tier=100** (`onboarding.ts:219, 220`). Coherente con **cupo default 100**; ampliación >100 solo vía soporte (`START.md` FASE 1).

### 3.4 RLS — observaciones
- Política `products_public_select` permite ver productos cuando `status IN ('demo', 'active', 'past_due')`. **`past_due`** debería bloquearlos (presión para pagar). Verificar si es decisión de producto (gracia visual) o bug.
- `assistant_messages` solo tiene `INSERT` policy con `WITH CHECK` (`schema.sql:1151`); falta `UPDATE`/`DELETE` (probablemente intencional, pero entonces los toggles deberían ocurrir vía service role).
- No hay `SELECT` policy para `events` para usuarios normales — solo `INSERT`. El frontend no muestra historial al comerciante; si en el futuro se agrega, hay que pensarlo.

### 3.5 Inconsistencias de UI
- **Sheet vs Dialog:** la mayoría de páginas (11 admin pages) usa `Sheet` como pattern premium. Excepciones: `/admin/ventas` usa `Dialog` y `components/design/admin-preview.tsx` también. Alinear `ventas` a `Sheet` para consistencia.
- **Switch outlier:** el único componente que **no** usa `@base-ui/react` es `src/components/ui/switch.tsx` (usa `@radix-ui/react-switch`). Migrar a `@base-ui` y eliminar la dep `@radix-ui/react-switch`.
- **`signOut` action en sidebar** (`admin-shell.tsx:251`) usa `<form action={signOut}>`. Funciona pero el cliente queda renderizando entre la respuesta y el redirect. Revisar UX (loading spinner mientras va).

---

## 4. Auditoría por dominios

### 4.1 Billing & MP
✅ **Bien:**
- HMAC-SHA256 con timing-safe comparison (`verify-signature.ts`).
- Anti-replay con ventana ±5 min sobre el `ts` del header.
- Idempotencia vía `mp_event_id UNIQUE` + `billing_webhook_log` con estado `pending → processed/failed`.
- Welcome email solo en primer pago aprobado (`count === 1`).
- Cron diario con `Bearer CRON_SECRET` para transitar `demo → past_due → archived` y aviso de plan anual a 14 días.
- Separación dominio: `billing_webhook_log` (suscripción de comerciante) vs `order_webhook_log` (pagos de órdenes con MP de cada tienda).

⚠️ **Observaciones:**
- **`payment_methods.config.access_token`** se guarda en cleartext. Si la DB se filtra, se exponen MP tokens de cada tienda. Encrypt at rest (Postgres `pgcrypto` + clave en env) o moverlo a Vercel KV / Vault.
- **Race del welcome email**: si dos webhooks aprobados llegan en paralelo y la idempotencia no los frena (porque tienen `mp_event_id` distintos pero ambos serían "el primer pago"), `count === 1` podría devolver true para los dos. Riesgo bajo pero no nulo. Mitigación: lock de DB o flag `welcome_email_sent_at` en `stores`.
- **`togglePack` no cobra**: `actions/billing.ts:378` solo cambia `stores.modules`, sin chequear si la tienda está pagando ese pack. Un usuario puede activar Pack Operations gratis. Hace falta enganchar `togglePack` a un flujo de upgrade real (suscripción MP) o desactivar el toggle si `billing_status !== 'active'`.
- **`createOnboardingCheckout` (`onboarding.ts:194`)**: tier hard-coded = 100, no permite elegir.
- Hay **tres caminos de pricing distintos** que deberían colapsarse en uno: `computeMonthlyTotal`, `calculateAnnualPrice`, `computePackTotal`, más el cálculo manual del hero (bug 2.1) y el resumen del billing-panel. Centralizar en un único `quote(plan, tier, packs, period)`.

### 4.2 Multi-tenancy (middleware + RLS)
✅ Schema usa `(store_id, ...)` en todos los índices clave. RLS coherente: `store_users` filtra acceso, `store_allows_writes()` corta escrituras en `suspended/archived`.

⚠️
- El middleware hace `auth.getUser()` + query a `store_users` con `service_role` (bypassing RLS) en cada request `/admin/*`. Para 100 catálogos no es problema, pero si crecen, **cachear** el `StoreContext` resuelto en Redis con TTL 30–60s.
- `email_confirmed_at === null` redirige a `/onboarding/done` sin importar la URL pretendida. Si el usuario ya completó onboarding pero tarda en confirmar el email, se le rompe la navegación (no puede ir a `/admin/billing` por ej.).
- Cookies: el middleware usa `service_role` para resolver `custom_domain → slug` con cache Redis 5 min. Si el comerciante cambia su dominio o lo desverifica, el cache no se invalida hasta TTL.

### 4.3 Executor
✅ Pipeline limpio (10 pasos: handler → store_id → status → actor → módulos → límites → validate → execute → event → cache).
✅ Side-effect imports en `handlers.ts` para evitar TDZ (bien razonado, comentario explícito).

⚠️
- `executor` falla con `SYSTEM_ERROR` si `storeContext` no está provisto, en lugar de cargarlo de DB (TODO en línea 71). Aceptable por ahora pero hay que terminarlo.
- `stores.ts` (handler) está **fuera** del registro de `handlers.ts` (no se importa). Es intencional: `createStore` se llama directo desde `auth.ts:6`. Un comentario en el archivo aclararía la decisión.
- `revalidatePath` solo se llama si los keys empiezan con `products:` o `store:slug:`. Las pages del admin no se revalidan (van por TanStack Query). OK, pero documentarlo.

### 4.4 Performance
✅ Índices muchos y bien dirigidos al patrón multi-tenant.
✅ Bundle analyzer integrado (`pnpm analyze`).
✅ TanStack virtual para tablas largas.

⚠️
- **`events` no tiene índice por `actor_id`** — si superadmin filtra "todo lo que hizo el usuario X", scan secuencial.
- **`shipments.tracking_code`** tiene índice (correcto), pero la página pública `/tracking/[code]` debería ser ISR/edge para no cobrar function en cada lookup.
- `dashboardStats` carga `out_of_stock` aun cuando `stock` está OFF (el componente lo filtra a `'—'` pero la query corre igual).

### 4.5 Security
✅ Headers OWASP en `next.config.ts`: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
✅ Rate-limit con Upstash en password reset, PDF, checkout público.
✅ HMAC en webhooks MP.

⚠️
- **No hay CSP** (`Content-Security-Policy`). Para una app que sirve imágenes Cloudinary y Redirige a MP es importante. Empezar con un CSP report-only para no romper nada.
- **`SUPERADMIN_ALLOWED_IPS`** prometido en README, no implementado. O se hace o se borra.
- **`/api/cron/*`** validan `Bearer CRON_SECRET` (bien). Si Vercel deja de usar `Authorization`, hay que cambiar a su header propio (`x-vercel-cron-signature` ya está disponible).
- **`/api/pdf/[template]`** acepta `body.data` como `Record<string, unknown>` y lo pasa directo al template (con `as any` en línea 38). Si los templates inyectan ese data en HTML, hay riesgo XSS según cómo `jspdf` renderice. Verificar.
- **No hay protección CSRF explícita** en server actions — Next 16 con cookies same-site=lax mitiga, pero si en algún momento se exponen las actions desde otro origen, hay que validar `Origin`.

### 4.6 Observabilidad
- `console.error` repartido (43 ocurrencias). Sin Sentry, sin LogTail, sin Vercel Log Drains documentado.
- `events` sirve como audit log pero no hay UI superadmin para verlo de forma performant (la tabla `events-table.tsx` existe — verificar cobertura).
- Webhooks fallidos quedan en `billing_webhook_log.status='failed'` sin alerta. Falta dashboard de "webhooks pendientes/fallidos" en superadmin.

### 4.7 Tests
- **Único test:** `src/lib/billing/packs.test.ts` (4 cases).
- Sin tests de:
  - `verify-signature.ts` (HMAC + anti-replay)
  - `executor/index.ts` (módulos inactivos, tienda suspended, límites, permisos)
  - Webhook de billing (transiciones de estado, idempotencia)
  - Cron `check-billing` (trial expiration, archived, plan anual)
  - `calculator.ts` (`computeMonthlyTotal`, `calculateAnnualPrice`)
  - Checkout public flow (rate-limit, validación de carrito, precio server-side)
  - Validations Zod (22 schemas sin un solo test)
- Recomendación mínima: 20–25 unit tests cubren el 80% del riesgo.

---

## 5. Propuestas de mejora estratégica (proactivas)

### 5.1 Producto

1. **Plan base $20.000 + límite duro 100 productos + ampliación manual (sin auto-upgrade en MP):** ✅ DECISIÓN TOMADA — evita re-autorizaciones recurrentes en Mercado Pago y doble cobro por cron. El comerciante **paga solo el plan base** ($20.000/mes + packs) mientras `limits.max_products` sea el default (100). Al intentar superar el cupo, **se bloquea** la creación de productos y la UI muestra mensaje claro: *"Necesitás más de 100 productos? Contactá a soporte"* (email/WhatsApp/link a formulario).

   **Tabla comercial de referencia** (para landing, billing y negociación; **no** dispara cobros automáticos):

   | Capacidad (máx. productos) | Precio/mes sugerido | Uso |
   |---|---|---|
   | Hasta **100** | **$20.000** | Default self-serve; suscripción MP actual |
   | Hasta **200** | **$40.000** | Ampliación acordada → soporte |
   | Hasta **300** | **$55.000** | Idem |
   | Hasta **500** | **$80.000** | Idem |
   | Hasta **1.000** | **$100.000** (tope comercial) | Idem |

   **Implementación requerida:**
   - `src/lib/billing/tiers.ts` (o `commercial-tiers.ts`): solo `COMMERCIAL_TIERS[]`, `getCommercialTierByMaxProducts(maxProducts)`, `getSuggestedMonthlyCents(maxProducts)` para **UI y cotización**; no enlazar a webhooks ni cron de cobro.
   - `stores.limits.max_products` es la **fuente de verdad** del cupo; default **100** al activar tienda.
   - **Executor / validación:** al crear o reactivar producto, si `active_count >= limits.max_products` → error `PRODUCT_LIMIT_REACHED` con mensaje de soporte.
   - **Superadmin / operaciones:** flujo documentado en `START.md`: subir `max_products`, ajustar monto en MP (nueva preapproval o acuerdo fuera de banda), registrar evento `capacity_upgraded_manual`.
   - **Sin** cron que cancele/cree preapprovals por cantidad de productos.

2. **Empty states con CTA al pack correcto:** si un comerciante entra a `/admin/finance` sin pack, mostrar "Activá Finanzas Pro · $10.000" con un solo click hacia `/admin/billing?pack=finance` (hoy ya hay `plan-upgrade-prompt.tsx` y `pack-inactive-warning.tsx`, falta amarrarlos a cada módulo).
3. **AI tokens por pack y no por plan:** hoy `ai_tokens_monthly = 50.000` está en `plans` (global). Si el comerciante paga el pack AI, esperaría más tokens. Considerar `pack_ai_tokens` por suscripción.
4. **Self-serve cancel:** flujo actual correcto (`cancelled_at` + acceso hasta fin de período). Copy "Tu acceso continúa hasta el DD/MM" ya presente — perfeccionar en próxima iteración de UX.
5. **Flujo DEMO con onboarding IA** ✅ DECISIÓN TOMADA — reemplaza el concepto de "trial". Ver sección 5.6.
6. **Webhook idempotente y cambios de `billing_period`:** ✅ SE RESUELVE PROACTIVAMENTE — ver sección 5.7 (matriz completa de casos y defensas).

### 5.6 Flujo Demo + Onboarding IA (nuevo)

**Concepto:** el comerciante puede crear su tienda sin pagar. Al completar el onboarding, OpenAI genera 1 producto y 1 categoría personalizados. La tienda queda en estado `demo` y es accesible en `kitdigital.ar/demo/{slug}` (path, no subdominio). Tiene 14 días para pagar; si no paga, la tienda se elimina (el usuario lógico se mantiene).

**Flujo completo:**

```
Landing → Signup → Onboarding (4 pasos) → [OpenAI genera producto+categoría] →
Loader → kitdigital.ar/demo/{slug} [EFECTO WOW] → Panel admin (modo lectura) →
Pago → Tienda activa (modo edición)
```

**Pasos de onboarding rediseñados:**
1. Datos de registro (nombre, email, contraseña) — ya existe en `/auth/signup`
2. Nombre de tienda + descripción del negocio
3. Color principal + logo (opcional; si no hay logo, se usa el nombre en la fuente de la marca)
4. *(sin paso de pago en esta etapa)*
5. Generación IA (loader mientras OpenAI crea producto + categoría inspirados en nombre+descripción)
6. Redirect a `/demo/{slug}` — vista pública de la tienda recién creada

**Vista `/demo/{slug}`** (nueva ruta pública):
- **Un solo componente de catálogo** compartido con la tienda “en vivo”: p. ej. `CatalogStoreView` con prop `variant: 'live' | 'demo'`; **no** duplicar la lógica de `[slug]/page.tsx`.
- Bloque flotante fijo en la parte inferior (no tapa el contenido):
  - 📋 Copiar: `kitdigital.ar/demo/{slug}`
  - 💚 "Compartí con un amigo" → abre WhatsApp con link
  - 🛒 "Ir a mi panel de administración" (botón prominente)

**Panel de administración en modo demo:**
- Toda la interfaz es navegable y visible
- Banner global + **deshabilitar botones primarios** (“Nuevo producto”, “Guardar”, etc.) donde sea barato de implementar, además del bloqueo en executor — menos toasts repetidos y mejor UX
- Cada sección puede reforzar con un cartel *"Modo lectura — Adquirí tu tienda por $20.000/mes"* con CTA a pago
- El executor rechaza todas las escrituras para tiendas en estado `demo` (ya existe lógica parcial; extender)
- Módulos: visible todo el catálogo de features del plan base

**Onboarding IA (idempotencia y robustez):**
- Antes de llamar a OpenAI: si `stores.config.ai_onboarding_done === true`, **no** crear duplicados (reintentos / F5).
- Timeout acotado (p. ej. `AbortSignal` ~12–15 s) + fallback: categoría/producto placeholder si la API falla.
- Modelo barato (`gpt-4o-mini` o equivalente), `max_tokens` bajo, una sola inserción atómica categoría+producto+`product_categories`.

**Expiración:**
- 14 días después de `created_at` si `billing_status = 'demo'` → cron elimina la tienda (soft delete o borrado real)
- El `store_users` + `users` se mantienen → el usuario puede crear una nueva tienda
- El slug queda disponible para quien pague primero

**Archivos a crear/modificar:**
- `src/components/public/catalog-store-view.tsx` (nombre sugerido) — vista unificada `variant: 'live' | 'demo'`
- `src/app/(public)/[slug]/page.tsx` — delegar en `CatalogStoreView` con `variant="live"`
- `src/app/(public)/demo/[slug]/page.tsx` — misma data, `variant="demo"` + overlay
- `src/app/(public)/demo/[slug]/_components/demo-overlay.tsx` — bloque flotante
- `src/app/onboarding/_components/onboarding-steps.tsx` — rediseñar pasos
- `src/lib/actions/onboarding.ts` — nuevos pasos + llamada a OpenAI
- `src/lib/actions/ai-onboarding.ts` — nuevo: genera producto + categoría vía OpenAI
- `src/app/api/cron/check-billing/route.ts` — expiración de demos en 14 días
- `src/middleware.ts` — `/demo` debe ser público; tiendas `demo` en `/admin` → modo lectura (no redirect)

### 5.7 Billing, webhooks e idempotencia — plan completo (proactivo)

**A. Mensual (preapproval) → Anual (checkout preference, pago único)**

| Paso | Dónde | Qué hacer |
|---|---|---|
| 1 | `createAnnualSubscription` (`billing.ts`) | **Antes** de `createCheckoutPreference`: leer `mp_subscription_id`; si existe, `cancelPreapproval(id)` y luego `UPDATE stores SET mp_subscription_id = null`. |
| 2 | Webhook `payment` aprobado, rama anual (`route.ts` ~236) | Tras activar anual: si la fila de `stores` aún tiene `mp_subscription_id` (race), `cancelPreapproval` otra vez y limpiar columna — **defensa doble**. |
| 3 | `events` | `emitEvent(storeId, 'billing_period_changed_to_annual', { ... })` para auditoría. |

**B. Anual → Mensual**

- Hasta tener flujo de producto claro (prorrateo, fechas), tratar como **solo vía soporte**. No crear preapproval mensual mientras el anual siga vigente sin reconciliar.

**C. `changeTier` (monto/cupo mensual)**

- Ya cancela preapproval previa antes de crear una nueva. Mantener; **log + evento** si `cancelPreapproval` falla.

**D. Idempotencia MP (existente)**

- `billing_webhook_log.mp_event_id` UNIQUE + `processed` → duplicados ignorados. Mantener 200 OK; fallos → `failed` + revisión superadmin.

**E. Fallas operativas**

- Si `cancelPreapproval` falla tras pago anual: reintentar desde webhook (A2); si persiste, cola manual en superadmin.

**Referencia de código — `createAnnualSubscription` (antes de preference):**
```ts
const { data: storeRow } = await db.from('stores').select('mp_subscription_id').eq('id', ctx.store_id).single()
if (storeRow?.mp_subscription_id) {
  await cancelPreapproval(storeRow.mp_subscription_id).catch((e) => {
    console.warn('[billing] cancelPreapproval al pasar a anual:', e)
  })
  await db.from('stores').update({ mp_subscription_id: null }).eq('id', ctx.store_id)
}
```

### 5.2 Marketing / Landing
1. **Slot counter siempre visible:** hoy solo aparece si `max_stores_total != null`. Para "social proof" mostrar `X tiendas activas` aún sin cap.
2. **Pricing calculator en home:** ya existe (`PricingCalculator`); chequear que respete el bundle de 3 packs (descuento $5.000) — el cliente del landing debería ver el mismo precio que pagará en `/admin/billing`.
3. **Dashboard público de uptime / deliverability** — para B2B argentino, cualquier "trust" extra (badge SSL, "1.234 pedidos procesados este mes") aumenta conversión.

### 5.3 Operacional
1. **Dashboard de webhooks failed en `/superadmin`:** filtrar `billing_webhook_log` y `order_webhook_log` con `status='failed'`, mostrar payload + reintento manual.
2. **Sentry + Vercel Log Drains:** integrar antes del primer cliente real.
3. **Backups automáticos:** Supabase ya hace daily, pero un dump semanal exportado a Cloudflare R2 / S3 con retención 30 días da otro nivel de seguridad.
4. **Healthcheck `/api/health`:** que valide DB ping + Redis ping + MP API reachable. Útil para Vercel monitoring.

### 5.4 Internacionalización (futuro)
- Todo el código tiene strings en español hard-codeadas (toasts, validation messages, copy de UI). Si la meta es LATAM, **agregar `next-intl` ahora** — el costo de retrofit crece con cada commit.

### 5.5 Limpieza arquitectónica
1. **Centralizar pricing:** unificar `computeMonthlyTotal`, `calculateAnnualPrice`, `computePackTotal` y los cálculos sueltos en un solo `quote(input)` que devuelva `{ items[], subtotal, discount, total }`. El **precio base self-serve** sigue siendo el de la suscripción actual (~$20k hasta 100 productos); la tabla `commercial-tiers` es referencia para ampliaciones manuales, no para auto-cobro.
2. **Tipar `supabaseServiceRole`:** punto 2.3.
3. **Helper `getSlotsAvailable`** está duplicado en `src/app/page.tsx:12` y `src/app/api/stores/capacity/route.ts:19`. Extraer a `src/lib/db/queries/stores.ts`.
4. **Helper `getCatalogUrl`** está en `admin-shell.tsx:48` pero el patrón se repite en 3 lugares más (search "isDev" en webhook + onboarding). Extraer.
5. **`getStoreOwnerEmail`** está duplicado en `webhooks/mercadopago/route.ts:86`, `cron/check-billing/route.ts:13` y `db/queries/billing.ts:70` (este último con join distinto). Consolidar.
6. **Folder `src/lib/payments/`** existe en paralelo a `src/lib/billing/` — confuso. `payments/` es para checkout de órdenes (MP por tienda); `billing/` es para suscripción de la app. Renombrar `payments/` → `order-payments/` o `mp/orders.ts`.

---

## 6. Plan de acción sugerido (ordenado por impacto/esfuerzo)

> **Ver `START.md` en la raíz para el plan completo fase a fase con checkboxes, referencias de código y guía para agentes IA.**

### FASE 0 — Hotfixes P0 (bloqueantes para vender) — **ejecutar primero**
| # | Acción | Esfuerzo | Archivo |
|---|---|---|---|
| 1 | Fix bug pricing hero billing | 15 min | `billing-panel.tsx:118` |
| 2 | Decidir y arreglar módulo `checkout` (mover a pack operations) | 1 h | `packs.ts` |
| 3 | Eliminar archivos legacy (`admin-layout.tsx`, `superadmin-layout.tsx`, `echo/`, `fixes.md` refs) | 30 min | varios |
| 4 | Fix webhook doble cobro mensual→anual + defensa en webhook | 1 h | `actions/billing.ts`, `webhooks/mercadopago/route.ts` |
| 5 | Limpiar `.env.example` + `README.md` | 15 min | raíz |
| 6 | Helper precio base self-serve: `getBaseMonthlyProductCents()` = $20k (o leer de `plans`) para unificar hero/resumen | 30 min | `lib/billing/` |

### FASE 1 — Cupo 100 + tabla comercial + ampliación manual (sin auto-upgrade MP)
| # | Acción | Esfuerzo | Archivo |
|---|---|---|---|
| 7 | `src/lib/billing/commercial-tiers.ts`: tabla de referencia + `getSuggestedMonthlyCents(max_products)` **solo UI** | 1 h | nuevo |
| 8 | Default `limits.max_products = 100`; executor rechaza alta de producto si cupo lleno; copy “Contactá soporte” | 2 h | executor, handlers productos, UI |
| 9 | `billing-panel` + landing: mostrar tabla comercial y “incluye hasta 100 productos”; sin cron de cobro por volumen | 1 h | billing-panel, `page.tsx` |
| 10 | Documentar + UI superadmin: flujo para subir `max_products` y acordar nuevo monto MP (manual) | 2 h | superadmin, `START.md` |
| 11 | (Opcional P1) `quote()` unifica base + packs usando precio base fijo hasta próxima negociación | 2 h | `calculator.ts` |

### FASE 2 — Flujo Demo + Onboarding IA
| # | Acción | Esfuerzo | Archivo |
|---|---|---|---|
| 12 | Rediseñar pasos de onboarding (nombre+descripción, logo+color, sin pago) | 2 h | `onboarding/` |
| 13 | Crear `src/lib/actions/ai-onboarding.ts` — genera producto+categoría via OpenAI | 2 h | nuevo |
| 14 | Crear ruta pública `/demo/[slug]` con overlay flotante | 3 h | nuevo |
| 15 | Adaptar middleware: `/demo` público, admin `demo` → lectura (no redirect) | 1 h | `middleware.ts` |
| 16 | Banner demo + deshabilitar CTAs primarios en admin (productos, etc.) | 2 h | admin layout + páginas clave |
| 17 | Cron: expiración de demos en 14 días | 1 h | `cron/check-billing` |
| 18 | Flujo de pago post-demo: botón CTA → onboarding/payment | 1 h | varios |

### FASE 3 — Calidad (P1)
| # | Acción | Esfuerzo |
|---|---|---|
| 19 | Regenerar `database.ts` con CLI + tipar `supabaseServiceRole` + remover `as any` masivamente | 1 día |
| 20 | Tests críticos: HMAC, executor, calculator, commercial-tiers, webhook (~20 tests) | 1 día |
| 21 | CI con GitHub Actions: `pnpm lint && pnpm tsc --noEmit && pnpm test` | 2 h |
| 22 | Encriptar `payment_methods.config.access_token` | 3 h |
| 23 | CSP report-only en `next.config.ts` | 1 h |
| 24 | Sentry + Vercel Log Drains | 2 h |

### FASE 4 — Preparación para crecer (P2)
| # | Acción |
|---|---|
| 25 | Cache `StoreContext` en Redis (60s TTL) en middleware |
| 26 | Dashboard de webhooks failed en `/superadmin` |
| 27 | Healthcheck `/api/health` |
| 28 | Empty states con CTA a pack en cada módulo OFF |
| 29 | Migración switch `@radix-ui/react-switch` → `@base-ui` |

---

## 7. Resumen de riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Cliente ve $200.000 en lugar de $20.000 en panel | 🔴 Crítico | Fix 2.1 |
| Comerciante "compra" Pack Operations y el carrito web no funciona | 🔴 Crítico | Fix 2.2 |
| Doble cobro mensual+anual al cambiar billing_period | 🔴 Crítico | Fix 5.7 |
| Renombre de columna en DB rompe runtime sin error de TS | 🟠 Alto | Fix 2.3 |
| MP tokens de tiendas en cleartext | 🟠 Alto | Encrypt at rest |
| Sin tests = cualquier refactor mete bugs | 🟠 Alto | Suite mínima |
| Demo expirada no eliminada si cron falla | 🟡 Medio | Retry logic en cron + log |
| Welcome email duplicado en race condition | 🟡 Medio | `welcome_email_sent_at` flag |
| `events` sin FK = posibles huérfanos en limpieza manual | 🟡 Medio | FK + `ON DELETE SET NULL` |
| Tienda activa sin validación de cupo permite >100 productos con precio desactualizado | 🟡 Medio | Enforce `limits.max_products` en executor + tests |
| Doc/code drift (`fixes.md`, `SUPERADMIN_ALLOWED_IPS`) | 🟢 Bajo | Limpieza |
| Sin CSP, Sentry, healthcheck | 🟢 Bajo | Deuda operacional |

---

## 8. Notas finales

- El **núcleo arquitectónico está bien resuelto**: middleware multi-tenant, executor centralizado, schema con RLS sólido, idempotencia en webhooks, packs comerciales modelados. Esto es base para escalar a 1000 catálogos sin reescribir nada.
- El **código está sucio en los bordes**: `as any` masivos, archivos legacy, doc desactualizada, tests inexistentes. Eso no impide vender, pero hace que cada cambio venga con riesgo de regresión.
- La **UX premium está casi lograda**: Sheet uniforme, AlertDialog en destructivas, design system con tokens. Quedan 2 outliers (Dialog en ventas, switch en Radix) y un bug visible en pricing.
- **Para vender 100 catálogos**: terminar P0 + agregar tests del flujo de pago + Sentry. Eso da la confianza para soportar a los primeros 20 clientes sin que se rompa todo.

**Próximo paso recomendado:** ejecutar **FASE 0** de la sección 6 (y `START.md`) en orden; luego FASE 1 (cupo + soporte) y FASE 2 (demo + IA).
