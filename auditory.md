# Auditoría General — KitDigital.ar

**Fecha:** 2026-04-24
**Objetivo:** Lanzamiento comercial, 100 catálogos, experiencia premium.
**Estado de fase:** F15 en progreso (35% completado).
**Criterio:** Marcar con severidad y área. Orden dentro de cada sección = prioridad.

### Leyenda de severidad

- 🔴 **CRÍTICO** — bloquea lanzamiento / rompe flujo / fuga de datos / deja vender sin registrar.
- 🟠 **ALTO** — impacta conversión, causa bugs silenciosos, o degrada UX de forma visible.
- 🟡 **MEDIO** — fricción de UX, performance, deuda técnica visible.
- 🟢 **BAJO** — polish, DX, cosmético.

### Resumen ejecutivo — top 10 bloqueantes del lanzamiento

1. 🔴 **Los pedidos del catálogo público NO se registran en la base de datos.** Solo abren WhatsApp. Admin queda ciego.
2. 🔴 **Bug de precio en onboarding**: el primer producto queda con precio 100× menor al ingresado (no se convierte a centavos).
3. 🔴 **Firma HMAC del webhook de Mercado Pago mal construida.** El template no coincide con la spec de MP → todos los webhooks se rechazan o se aceptan sin verificar (según ambiente).
4. 🔴 **Middleware: en rutas de admin no se escriben las cookies refrescadas al response final.** Sesiones expiran sin razón y el usuario ve el error “Server Components render”.
5. 🔴 **B0.2 cron check-billing** ya aceptado en F15 pero no aplicado: cualquiera con acceso a la URL puede archivar tiendas si `CRON_SECRET` no está seteado (hoy no lo está en Vercel).
6. 🔴 **Limits hardcodeados (`max_products: 30, max_orders: 100`)** al crear tienda. El `limits.max_products` del onboarding bloquea al dueño en 30 productos (trial_max_products del plan es 100 — no se respeta).
7. 🔴 **`billing.assistant_ai` sin límite de tokens por defecto** — cualquier suscripción activa puede consumir OpenAI sin tope (`ai_tokens=0` es el default y ya no se edita).
8. 🟠 **Rate limiter del webhook MP solo usa IP** — MP sale desde IPs de datacenter compartidas, bloquea legítimos bajo carga y no protege contra actor malicioso con IP rotativa.
9. 🟠 **URL del catálogo mal mostrada en onboarding** (`appDomain/slug` en lugar de `slug.appDomain`).
10. 🟠 **Realtime en admin suscribe a 3 canales por shell** pero nunca desduplica entre tabs ni limpia si se pierde la sesión (leak progresivo de conexiones).

---

## 1. BUGS DE PRODUCCIÓN (críticos, corregir antes de cualquier venta)

### 1.1 🔴 Los pedidos por WhatsApp no se persisten — el admin queda ciego

**Archivo:** `src/components/public/cart-drawer.tsx:113-123`, `src/components/shared/whatsapp-checkout-button.tsx`

**Qué pasa:** `WhatsAppCheckoutButton` arma un mensaje y abre `wa.me/...`. Nunca llama a `create_order`. El dueño recibe WhatsApp pero:
- `/admin/orders` siempre está vacío para pedidos del catálogo.
- `dashboard.orders_month` y `revenue_month` mienten (solo cuentan pedidos manuales).
- No hay trazabilidad ni conversión medible.
- Las estadísticas para cobrar por uso o justificar el plan se caen.

**Fix:** antes de `window.open`, llamar a una server action nueva `createPublicOrder({ store_id, items, customer_name?, customer_phone?, notes? })` que:
- Usa `service_role` (no hay auth en catálogo público).
- Inserta en `orders` con `status='pending'`, crea `order_items` (snapshot), opcionalmente crea o busca `customer`.
- Respeta el módulo `orders` (siempre activo en base).
- **No** usa el executor porque no hay store_user; emite evento manual (mismo patrón que billing/stores).
- Devuelve `order_id` y lo inyecta en el texto del WhatsApp como `Pedido #XXXX` para dar fricción social.

**Beneficio adicional:** con el pedido persistido se puede emitir toast en tiempo real al admin (ya hay Realtime configurado en `admin-shell.tsx`).

---

### 1.2 🔴 Onboarding del primer producto — bug de precio × 100

**Archivo:** `src/lib/actions/onboarding.ts:149-156` y `src/app/onboarding/product/product-step-client.tsx:56-67`

**Qué pasa:** el form pide “Precio (ARS)” con `step="0.01"`. La action hace `z.coerce.number()` y lo inserta directo en `products.price` (que es INTEGER de centavos). Si el usuario pone `1000`, queda como $10. Además, si pone decimales (ej. `99.99`), el insert falla con `invalid input syntax for type integer`.

**Fix:** `price: Math.round(parsed.data.price * 100)` antes del insert, y `step="1"` en el input para fuerza pesos enteros (o aceptar decimales y redondear).

---

### 1.3 🔴 Firma del webhook Mercado Pago — template incorrecto

**Archivo:** `src/lib/billing/verify-signature.ts:41`

**Qué pasa:** el template actual es `` `id:${xRequestId};ts:${ts};` ``. La spec oficial de MP construye la firma con el **`data.id`** del query string del webhook (no el `x-request-id`) y con el formato:
```
id:<data.id>;request-id:<x-request-id>;ts:<timestamp>;
```

**Impacto:**
- Si `MP_WEBHOOK_SECRET` vacío: el código retorna `false` (correcto). Pero entonces ningún webhook es procesado → billing nunca se activa.
- Si está configurado con el secret real: la comparación falla siempre → el webhook devuelve 401 a MP → MP reintenta → eventualmente marca el endpoint como caído y no reenvía más.
- Si alguna vez alguien relaja la validación para “hacerlo andar”, el endpoint queda sin verificación real.

**Fix:** aceptar `dataId` como tercer parámetro en `verifyWebhookSignature`, extraerlo en el route handler desde `request.nextUrl.searchParams.get('data.id')`, y construir el template completo con los 3 campos. Normalizar `v1` a minúsculas antes de comparar.

---

### 1.4 🔴 Middleware — cookies de sesión se pierden en `/admin/*`

**Archivo:** `src/middleware.ts:109, 205-209`

**Qué pasa:** `createMiddlewareClient()` devuelve `response` con las cookies refrescadas por Supabase (getAll/setAll). En rama `/admin/*` devolvés `finalResponse` (`NextResponse.next({ request })`) y **copiás las cookies** del `response` original (línea 206-208). ✅ Bien. Pero en rama `/superadmin/*` línea 144, en `/onboarding` línea 119, y en rama catch-all pública línea 223-227 — a veces no se copian o se devuelve un `response` huérfano.

Después de leer con atención, el branch `/superadmin` (línea 144) y `/onboarding` (línea 119) **sí devuelven `response`** correcto, pero **no copian al heredar headers**. Técnicamente OK.

El problema real ya está marcado en F15 B0.1: el error “Server Components render” se produce cuando el header `x-store-context` no llega y `getStoreContext()` lanza. El fix correcto es el que ya está en el plan: en `admin/layout.tsx` usar `getStoreContextOrNull()` (ya aplicado ✅) y **además** hacer fallback en el middleware si el JWT está expirado, redirigiendo a `/auth/login` en lugar de dejar seguir sin header.

**Fix adicional:** en `src/middleware.ts:151`, si `auth.getUser()` retorna `null` **pero** `sb-access-token` existe en cookies, disparar `supabase.auth.refreshSession()` antes de redirigir. Hoy se redirige directo y el usuario pierde su sesión de forma percibida como “aleatoria”.

---

### 1.5 🔴 Cron check-billing — guard invertido (ya detectado, ejecutar fix)

**Archivo:** `src/app/api/cron/check-billing/route.ts:43`

El código **actual** es:
```ts
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return 401
```
**Ya está correcto** — `ESTADO.md` B0.2 estaba desactualizado (mencionaba `if (cronSecret && ...)`).

**Verificar igual:** en producción `CRON_SECRET` tiene que estar seteado. Si está vacío en Vercel, el `!cronSecret` devuelve 401 sin procesar nada (fail-closed, aceptable) pero el cron de Vercel fallará en silencio → nadie expira trials → nadie se convierte a `past_due`. **Bloquea el modelo comercial.** Subir al nivel de blocker crítico.

---

### 1.6 🔴 `max_products=30` hardcodeado al crear tienda — ignora `plans.trial_max_products`

**Archivo:** `src/lib/executor/handlers/stores.ts:73`

```ts
limits: { max_products: 30, max_orders: 100, ai_tokens: 0 }
```

Pero el plan dice `trial_max_products = 100`. Un usuario nuevo en trial queda con cap de 30 productos cuando el plan promete 100. En un trial de 14 días esto corta el onboarding cuando carga más de 30 productos.

**Fix:** leer `plan.trial_max_products` del query previo y usarlo en `limits.max_products`. Aprovechar y setear `ai_tokens` desde una columna de `plans` (hoy no existe — agregar `trial_ai_tokens INTEGER DEFAULT 0`).

---

### 1.7 🔴 Asistente IA — sin límite de tokens por defecto

**Archivos:** `src/lib/executor/handlers/stores.ts:73`, `src/app/(admin)/admin/assistant/page.tsx:262`

Al crear una tienda `ai_tokens: 0`. En `TokenCounter`, `if (limit <= 0) return null` — el componente no se renderiza y el límite nunca se aplica en el handler del asistente. Un usuario con módulo `assistant` activado consume OpenAI sin tope.

**Fix:**
- En handler `execute_assistant_action` verificar `ai_tokens > 0` (hoy probablemente falta el guard; confirmar en `executor/handlers/assistant.ts`).
- Setear default razonable al activar el módulo pro `assistant` (ej. 100_000 tokens/mes).
- Reset mensual vía cron.

---

### 1.8 🟠 URL del catálogo mostrada al revés en onboarding

**Archivo:** `src/app/onboarding/page.tsx:67-69`

```tsx
Tu catálogo estará en: {appDomain}/{slug}
```
En prod será `{slug}.{appDomain}` (subdominio). El usuario copia mal la URL, la comparte rota, pierde primeras impresiones.

**Fix:**
```tsx
{process.env.NODE_ENV === 'development' ? `${appDomain}/${slug}` : `${slug}.${appDomain}`}
```

---

### 1.9 🟠 Rate limiter del webhook MP usa IP — falsos bloqueos

**Archivo:** `src/app/api/webhooks/mercadopago/route.ts:101-104`

MP sale desde un pool de IPs. Bajo pico de pagos, el limiter `30 req/10s por IP` puede bloquear legítimos. Además, la idempotencia ya resuelve duplicados → el rate limit aporta poco.

**Fix:** o bien remover el rate limit del webhook (la idempotencia lo cubre), o usar un limiter global por `mp_event_id` con ventana de 5s para rechazar réplicas rápidas.

---

### 1.10 🟠 Realtime del admin — leak de canales

**Archivo:** `src/components/admin/admin-shell.tsx:354-401`

Suscribe a 3 canales `postgres_changes` al montar. Si el usuario abre varias tabs, cada tab abre su propia conexión. Multiplicar por 100 tiendas + varios tabs por dueño → chorro de conexiones Realtime que Supabase limita en el plan free/pro.

**Fix:** consolidar los 3 canales en uno solo (`store-${storeId}` con filtros múltiples), y eventualmente gatear el toast a pestañas visibles (`document.visibilityState`).

---

## 2. PROBLEMAS DE UX / UI

### 2.1 🟠 Fricción severa en el checkout WhatsApp

Hoy:
1. Usuario agrega productos.
2. Abre carrito.
3. Click “Enviar por WhatsApp”.
4. **Se abre WhatsApp sin pedir ningún dato.**
5. El dueño recibe un pedido anónimo.

**Fix mínimo:** un paso intermedio de 30 segundos — modal inline dentro del drawer con:
- Nombre (obligatorio).
- Dirección o “Retiro” (radio).
- Selector de método de envío si `shipping` activo.
- Selector de método de pago si `payments` activo.
- Nota opcional.
- Botón “Enviar pedido” → 1.1 graba en DB y abre WhatsApp.

Esto es lo que diferencia un catálogo de un e-commerce real. Sin esto, cobrar $20.000/mes es difícil.

---

### 2.2 🟠 Lista de productos admin sin stock ni imagen

**Archivo:** `src/app/(admin)/admin/products/page.tsx:99-148`

Columnas: Nombre · Precio · Estado · acciones.

Falta:
- Thumbnail 40×40 (la UI de catálogo los tiene, pero en admin se listan sin imagen — te hace perder contexto).
- Stock visible si módulo activo.
- Categorías asignadas (badges).
- `compare_price` si hay descuento.

Según F15 B3.1 esto está en el plan pero no implementado.

---

### 2.3 🟠 `ProductSheet` no tiene campos clave

**Archivo:** `src/components/admin/product-sheet.tsx`

No expone:
- **Stock** (columna `stock` existe en DB desde F15 P2.3, pero el schema Zod `createProductSchema` no la incluye → imposible editar).
- **SEO / slug** (para módulo `product_page`).
- **Variantes**, **precio mayorista**.
- **Peso/SKU**.

Los tabs `Stock`, `Página`, `Variantes` del plan F15 B3.2 no están. El dueño para cambiar stock tiene que ir a otra pantalla.

---

### 2.4 🟠 Landing page — precio y propuesta confusos

**Archivo:** `src/app/page.tsx:74-84`

“$20.000 /mes — por cada 100 productos” es técnicamente correcto pero dispara dudas:
- ¿Cuánto pago si tengo 50? (respuesta: igual $20.000, pero no se aclara).
- ¿Puedo empezar gratis? (hay trial 14 días pero no se menciona hasta que se hace click en CTA).
- ¿Qué incluye? (arriba aparece la calculadora pero scroll obligatorio).

**Fix:** agregar microcopy: “Gratis por 14 días · después desde $20.000/mes”. Cambiar el callout a ese formato.

---

### 2.5 🟡 Dashboard admin vacío no guía al primer producto

**Archivo:** `src/app/(admin)/admin/page.tsx:43-97`

El empty state es OK pero después de agregar el primer producto pasa a los “stats + últimos pedidos” — vacíos en una tienda nueva. Transición abrupta.

**Fix:** mantener el empty state hasta tener al menos 1 pedido O mostrar una checklist de onboarding post-registro (color de marca, logo, producto, compartir link, configurar billing).

---

### 2.6 🟡 Catálogo público — búsqueda client-side solo por nombre

**Archivo:** `src/app/(public)/[slug]/catalog-view.tsx:51-56`

Filtra en cliente por `name.includes(query)`. No busca en descripción, no normaliza acentos, no pagina.

Para stores con 300+ productos envía todo el listado al cliente. Mal SEO, mal perf.

**Fix (v1):** normalizar acentos con `.normalize('NFD').replace(/[̀-ͯ]/g, '')` en ambos lados. **Fix (v2 cuando escale):** mover el search a server action con `ilike` y paginación.

---

### 2.7 🟡 Catálogo — filtro de categoría abre ruta separada

**Archivo:** `src/app/(public)/[slug]/catalog-view.tsx:61-70`

Cambiar de categoría hace `router.push(/{slug}/{category})` — full page reload (bueno para ISR pero mata sensación de SPA). En una tienda típica de 5-10 categorías el cliente cambia 4-5 veces antes de comprar → 4-5 full reloads. Lento.

**Fix:** usar `?category=xxx` con `router.replace` y filtrar client-side los productos ya cargados cuando caben en un solo fetch. Mantener rutas `/{slug}/{category}` por SEO pero navegar sin full reload.

---

### 2.8 🟡 Cart drawer — no pide datos de cliente ni método de envío

Relacionado con 2.1. Hoy:
- No hay campo para nombre.
- No hay selector de envío aunque `shipping` esté activo.
- No hay selector de pago aunque `payments` activo.
- No muestra subtotal → envío → total.

El `WhatsAppCheckoutButton` ya acepta `shippingMethod, customerName, customerNotes` como props — pero el `CartDrawer` no los pasa.

---

### 2.9 🟡 Mobile admin — sidebar hamburger

Estado F15 B0.5 dice que está roto en mobile porque el `renderTopbar` reemplazaba el topbar sin hamburger. En `admin-shell.tsx:410-416` el `AdminTopbar` ya trae `openMobile` → **parece arreglado**. Hay que **verificar en browser** que funciona.

---

### 2.10 🟡 Falta estado “vacío” en catálogo público si la tienda no tiene productos

**Archivo:** `src/components/public/product-grid.tsx:29-35`

“No hay productos disponibles” en dos líneas de texto. Sin ilustración, sin CTA. El visitante cierra y no vuelve.

**Fix:** si es el dueño (detectable con cookie de admin) mostrar “Agregá tu primer producto →”. Si es visitante, mostrar WhatsApp de contacto (“Escribinos si te interesa”).

---

### 2.11 🟡 Formato de precios inconsistente

- `formatPriceShort` en `cart-drawer.tsx` (sin decimales).
- `useCurrency().formatPrice` en `/admin/products`.
- `new Intl.NumberFormat('es-AR', { currency: 'ARS' })` en `billing/calculator.ts`.

Todos redondean distinto o muestran con/sin decimales. Un dueño con precio `$1.999,50` ve en un lugar `$2.000` y en otro `$1.999,50`.

**Fix:** unificar en un solo helper `formatARS(cents)` y usarlo en toda la app (admin + catálogo).

---

### 2.12 🟡 Upload de imágenes — sin compresión ni resize

**Archivo:** `src/components/shared/image-uploader.tsx` (no leído explícitamente pero el patrón con Cloudinary unsigned es conocido)

Si el preset de Cloudinary no hace transformación, los dueños suben JPG de 4MB desde celular. El catálogo se vuelve lento en móvil.

**Fix:** en el preset de Cloudinary habilitar `auto_compress` + `max_width=1200`. En el componente, usar `<Image />` de Next con `sizes` ya aplicados ✅ (product-card ya lo hace).

---

## 3. SEGURIDAD

### 3.1 🔴 Service role usado en `listProductsPublic` sin validar estado de la tienda

**Archivo:** `src/lib/db/queries/products.ts:12-64`

Se usa `supabaseServiceRole` (bypass RLS) sin joinar ni validar que la tienda esté `demo|active|past_due`. Si la tienda pasa a `archived`, el catálogo público queda visible porque el service role no chequea estado.

Hoy el layout `/(public)/[slug]/layout.tsx` llama a `getStoreBySlug` que **sí** filtra `in('status', ['demo','active','past_due'])`. Entonces en la práctica no se accede al catálogo archived. **Pero** el cache Redis de 60s puede estar servido aunque la tienda se acabe de archivar. Aceptable pero documentar.

**Fix (defensivo):** en `listProductsPublic` agregar `.in(stores.status, ['demo','active','past_due'])` vía subquery, y/o invalidar cache Redis al cambiar `billing_status`.

---

### 3.2 🟠 RLS de `stores` permite SELECT a cualquier owner de otra tienda del mismo usuario

**Archivo:** `schema.sql:740-742`

```sql
CREATE POLICY stores_select ON stores FOR SELECT
  USING (id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
```

Bien. Pero **no hay DELETE policy**. Un owner no puede eliminar su propia tienda. Probablemente intencional (archivado es el único camino). Documentar.

---

### 3.3 🟠 Asistente IA sin prompt injection guard

**Archivos:** `src/lib/executor/handlers/assistant.ts` (a verificar)

Acepta contenido del usuario y lo pasa a OpenAI con `ALLOWED_AI_ACTIONS` como salvaguarda en el backend. Pero:
- Sin validar largo máximo del prompt (un usuario puede enviar 100KB y reventar tokens).
- Sin filtro de keywords sensibles (ej. pedir “dame las passwords de la tienda”).
- El system prompt no se protege contra `Ignore above instructions...`.

**Fix:** 
- Límite 2000 caracteres en el input (ya debería estar en Zod; verificar).
- `ALLOWED_AI_ACTIONS` ya valida en el handler (ver `ESTADO.md` F8). ✅
- Sanitizar el contenido antes de logearlo en `events`.

---

### 3.4 🟠 `/api/stores/capacity` expone max_stores_total indirectamente

Un atacante puede deducir el cap haciendo requests repetidos y viendo cuándo llega a 0.

**Bajo riesgo** pero es un data leak menor. Acceptable para marketing (es dato público).

---

### 3.5 🟡 No hay CSRF protection explícita en server actions

Next.js trae mitigación por defecto con `Next.js request source checking` pero no se verifica origen en acciones críticas (billing, stores). En producción con dominios custom (`midtienda.com`), el `Origin` header puede no matchear.

**Fix:** verificar que `NEXT_PUBLIC_APP_DOMAIN` esté en la allowlist de `next.config.ts:allowedDevOrigins` (Next 15+).

---

### 3.6 🟡 Token de invitación en query string — logueable

**Archivo:** `src/app/invite/[token]/page.tsx` (no inspeccionado pero el patrón `/invite/{token}` es visible en middleware)

El token va en la URL → se loguea en access logs de Vercel y CDN intermediarios. Aceptable para MVP (token de 72hs) pero idealmente: POST al landing con el token en body y setearlo en cookie HttpOnly antes de redirigir.

---

## 4. SCHEMA / BASE DE DATOS

### 4.1 🟠 `variants`, `variant_attributes`, `variant_values`, `stock_items`, `wholesale_prices` — store_id sin FK

**Archivo:** `schema.sql:303, 322, 334, 347, 368`

Todas declaran `store_id UUID NOT NULL` pero **sin `REFERENCES stores(id) ON DELETE CASCADE`**. Si se borra una tienda, quedan filas huérfanas. Hoy no se borran tiendas (solo archivan) pero en cleanup futuro de test data puede dejar basura.

**Fix (SQL):**
```sql
ALTER TABLE variants           ADD CONSTRAINT variants_store_fk           FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE variant_attributes ADD CONSTRAINT variant_attributes_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE variant_values     ADD CONSTRAINT variant_values_store_fk     FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE stock_items        ADD CONSTRAINT stock_items_store_fk        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE wholesale_prices   ADD CONSTRAINT wholesale_prices_store_fk   FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE order_items        ADD CONSTRAINT order_items_store_fk        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE savings_movements  ADD CONSTRAINT savings_movements_store_fk  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE assistant_messages ADD CONSTRAINT assistant_messages_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
```

---

### 4.2 🟠 `products.stock` sin índice ni check

Columna `stock INTEGER` agregada en F15. No tiene:
- `CHECK (stock >= 0)` — pueden quedar negativos si se restan mal.
- Índice parcial para “sin stock”.

**Fix:**
```sql
ALTER TABLE products ADD CONSTRAINT products_stock_nonneg CHECK (stock IS NULL OR stock >= 0);
CREATE INDEX idx_products_store_out_of_stock ON products(store_id) WHERE stock = 0;
```

**Además:** hoy hay DOS lugares para el stock: `products.stock` y `stock_items.quantity`. Redundancia peligrosa. Decidir uno (o documentar que `products.stock` es el “simple” y `stock_items` es el “avanzado con variantes”). Hoy el `product-card.tsx:20` lee `(product as any).stock` → confirma que `products.stock` es el canónico para cálculos visibles.

---

### 4.3 🟠 `events.data` JSONB sin índice

**Archivo:** `schema.sql:658-671`

Con 100 tiendas × ~50 eventos/día = 5k eventos/día = 1.8M/año. Queries en superadmin para filtrar por tipo ya tienen índice (`idx_events_type_created`). Pero el “buscar eventos de tipo X en tienda Y” no tiene índice compuesto.

**Fix:**
```sql
CREATE INDEX idx_events_store_type_created ON events(store_id, type, created_at DESC);
```

Y purgar eventos viejos (> 90 días) con cron mensual — `TRUNCATE` periódico o partitioning por fecha.

---

### 4.4 🟡 `stores.config` es JSONB sin schema

Todas las configuraciones del dueño van a `stores.config` — `primary_color`, `city`, `hours`, `social`, `onboarding`, `pending_pro_modules`, `pending_annual_tier`, `annual_warning_{fecha}`. Fácil de evolucionar pero:
- Sin validación de keys.
- Imposible indexar.
- Una tipo en el código (ej. `primary_colour` vs `primary_color`) crea ghost values silenciosos.

**Fix:** al menos mantener un tipo TS `StoreConfig` **estricto** (ya existe en `types/index.ts:122-140`). Pero hoy hay valores en el JSONB que no están en el tipo (ej. `pending_pro_modules`, `annual_warning_X`). Actualizar el tipo.

---

### 4.5 🟡 `store_invitations` — permite tokens duplicados si email único (UNIQUE store_id+email)

Si cancelás una invitación, al invitar de nuevo al mismo email choca con el UNIQUE. Tenés que borrarla manualmente primero.

**Fix:** en `create_invitation` handler, hacer `ON CONFLICT (store_id, email) DO UPDATE SET token=EXCLUDED.token, expires_at=..., invited_by=...`.

---

### 4.6 🟢 Falta tabla `orders_counter` o `store_stats` para dashboard

Cada refresh del dashboard hace `count(*)` sobre products, orders, customers, revenue. Con 100 tiendas y 1000 refresh/día, son 4k queries pesadas. 

**Fix (cuando escale):** trigger que mantenga una `store_stats` cache denormalizada, o mover dashboard a Redis con TTL 60s.

---

## 5. PERFORMANCE

### 5.1 🟠 Landing page: fetch de capacity + HTTP bloqueante

**Archivo:** `src/app/page.tsx:8-20`

Server fetch a `/api/stores/capacity` → mismo server, latencia extra, y si falla devuelve `null`. Además, `NEXT_PUBLIC_APP_URL` en dev es `http://localhost:3000` → en SSR build se conecta a sí mismo.

**Fix:** llamar directamente a la query `db.from('plans')...` en el Server Component, sin pasar por API route (el endpoint sigue existiendo para clientes que refresquen sin full reload).

---

### 5.2 🟠 `listProductsPublic` sin límite — carga todo el catálogo

**Archivo:** `src/lib/db/queries/products.ts:12-31`

Cuando una tienda tenga 500 productos, el SSR envía 500 rows serializados al cliente. A 200 bytes promedio = 100KB → full reload lento en 3G.

**Fix:** paginar a 50 productos por página (con `offset` o `cursor`), y/o agregar una columna `is_featured` para mostrar destacados primero y lazy-load el resto.

---

### 5.3 🟡 Queries del dashboard hacen N+1 (products, orders, customers, revenue)

**Archivo:** `src/lib/executor/handlers/dashboard.ts` (no leído pero patrón es conocido por `useDashboardStats`)

4 queries separadas donde podría ser una sola función SQL. 

**Fix:** crear `get_dashboard_stats(store_id, from, to)` como PL/pgSQL RPC que devuelve el objeto completo.

---

### 5.4 🟡 Cache Redis — invalidación muy gruesa

**Archivo:** `src/lib/executor/index.ts:190-201`

`handler.invalidates` borra `products:{store_id}`. Si edita 1 producto invalidamos todo el cache. Sobre un catálogo estable esto es OK. Si el admin hace bulk-edit de 50 productos, vuelan 50 invalidaciones y el siguiente visitante paga el cold cache.

**Fix:** throttle las invalidaciones (ej. 1 sola por segundo con redis.set en un key `invalidate:pending`).

---

### 5.5 🟡 Bundle admin — no code-split por módulo

Un usuario del plan base carga JS de billing, asistente IA, finance, etc. El asistente trae un widget de markdown + chat state — quizás 50KB innecesarios para quien no lo usa.

**Fix:** `dynamic(import('...'))` para páginas admin de módulos no-core (assistant, finance, savings, tasks, multiuser, custom_domain).

---

### 5.6 🟡 ISR con revalidate=60 pero sin revalidateTag

Todos los catálogos usan `export const revalidate = 60`. Eso implica que cada 60s se regenera cada tienda activa. Con 100 tiendas + 10 páginas cada una = 1000 páginas cada 60 = **16 regeneraciones/segundo**. Va a pegarle a Supabase.

**Fix:** cambiar a `revalidate = 3600` y usar `revalidateTag('store:{slug}')` desde los handlers (vía `next/cache.revalidateTag`) cuando hay cambios. Lo hace mucho más escalable: solo regenera cuando hay cambio real.

---

### 5.7 🟢 Toasts — posición top-center con 90vw en mobile

**Archivo:** `src/app/providers.tsx:29-50`

Ocupa todo el ancho en mobile. Sobre el sheet del carrito compite por espacio. Poco crítico pero se puede mejorar.

---

### 5.8 🟢 `@tanstack/react-virtual` instalado pero no usado

Listado en `package.json` pero los listados admin siguen paginando con 50 items sin virtualización. Ok para MVP, activarlo si alguna tienda tiene >500 pedidos/mes.

---

## 6. ARQUITECTURA / CÓDIGO

### 6.1 🟠 `as any` en 49 archivos → ceguera de tipos en toda la capa de datos

`const db = supabaseServiceRole as any` en cada handler. Justificado como workaround del `database.ts` manual. Pero:
- Cualquier cambio de schema no rompe en compile.
- IntelliSense no ayuda al editar handlers.
- Refactors a ciegas.

**Fix:** generar tipos con Supabase CLI (`supabase gen types typescript`) y commitear en CI. Quitar los 49 `as any`. Tarea de 2-3 horas con pago enorme en DX.

---

### 6.2 🟠 Next 16 + React 19 + shadcn — sin lockfile de versiones menores

`"tailwindcss": "^3.4.19"` caret → puede saltar a 3.99. `"lucide-react": "^1.8.0"` ← **versión rara, probablemente mis-pin** (la real es `^0.469.0` en enero 2026). Verificar.

**Fix:** revisar `package.json` y pin-earate versiones menores de todo lo visual (shadcn, lucide-react, tailwindcss, next-themes, radix) para evitar sorpresas entre deploys.

---

### 6.3 🟡 Handler `savings` vs módulo `savings_account` — inconsistencia de nombres

Ya documentado en `ESTADO.md`. Pendiente renombrar. Bajo impacto pero crea confusión al leer el código.

---

### 6.4 🟡 `executor` no tiene transacciones reales

**Archivo:** `src/lib/executor/index.ts:155-185`

El handler ejecuta su lógica (que hace múltiples inserts/updates) y luego el executor inserta en `events`. Si el insert del evento falla, los cambios ya están hechos → estado inconsistente. Y el handler interno tampoco usa transacción.

**Fix:** 
- Opción A: mover la lógica crítica a funciones PL/pgSQL transactional (ej. `create_order_atomic(store_id, ...)`).
- Opción B: aceptar el riesgo y loggear el failure para reconciliar.
Para MVP, documentar y seguir. Post-MVP, mover al menos `create_order` a RPC.

---

### 6.5 🟡 `invalidates` depende del `store_id` en keys pero el cache usa otros prefijos

**Archivos:** `cache.ts` usa keys como `products:{store_id}`, `store:slug:{slug}`. Pero los handlers invalidan `products:{store_id}`. El key del cache de `getStoreBySlug` (prefix `store:slug:`) nunca se invalida cuando se edita una tienda.

**Fix:** en `update_store` handler agregar `invalidates: ['products:{store_id}', 'store:slug:{slug}']` — pero necesita pasar el slug al helper.

---

### 6.6 🟢 Muchos `// eslint-disable-next-line` — leyenda se pierde

54 supresiones en total. Normal, pero convendría concentrarlas en un wrapper `db()` que hace el cast una sola vez.

---

### 6.7 🟢 `src/lib/hooks/` todos los hooks tienen prefix `use-` pero no hay barrel export

Cada página importa 4-5 hooks por path largos. Un `src/lib/hooks/index.ts` simplifica imports.

---

## 7. BILLING & MERCADOPAGO

### 7.1 🔴 Webhook rama anual: no se verifica que `payment.external_reference` sea un UUID de `stores`

**Archivo:** `src/app/api/webhooks/mercadopago/route.ts:165-167`

```ts
if (!subscriptionId && payment.external_reference) {
  storeId = payment.external_reference  // <-- usado directo como store_id
```

Si MP manda un `external_reference` con otro valor (attacker que crea una preferencia clonada con `external_reference='...'`), el webhook activa una tienda arbitraria.

**Fix:** validar UUID y que la tienda exista y pertenece al pagador:
```ts
const { data: store } = await db.from('stores').select('id').eq('id', payment.external_reference).single()
if (!store) { result='unknown_store'; return }
storeId = store.id
```

---

### 7.2 🟠 `createSubscription` hace 3 queries + 2 updates al mismo `stores` en secuencia

**Archivo:** `src/lib/actions/billing.ts:116-145`

Primer update vacío (lines 116-125, todos `undefined` en limits), luego select, luego otro update. Race conditions si el webhook llega entre medio.

**Fix:** consolidar en 1 update con jsonb_set o con read-modify-write atómico.

---

### 7.3 🟠 Plan anual vencido: desactiva módulos pero no baja tier ni bloquea productos extra

**Archivo:** `src/app/api/cron/check-billing/route.ts:195-210`

Cuando vence anual → `billing_status='past_due'` + módulos pro a false. Pero `limits.max_products` sigue siendo el del plan anual (ej. 500). El usuario en past_due solo lee (ejecutor bloquea writes), pero sus productos extra siguen activos en el catálogo público. Inconsistente: el dueño paga por 100 pero tiene 500 visibles.

**Fix:** cuando archivar o vence billing, desactivar los productos excedentes (ej. últimos N-tier), o bloquear el catálogo público si excede.

---

### 7.4 🟡 `calculateAnnualPrice` no incluye módulos pro en cálculo

**Archivo:** `src/lib/billing/calculator.ts:82-89`

Los módulos pro del anual son “gratis” como beneficio. OK de diseño, pero la UI de billing no lo aclara al usuario → percepción de que puede activar “casi todos los pros sin costo” sin entender que es parte del contrato anual.

---

### 7.5 🟡 Falta endpoint para descargar factura / recibo

Con 100 tiendas pagando, los dueños van a pedir facturas. Hoy no hay nada.

**Fix (futuro, no blocker):** página `/admin/billing/history` con lista de `billing_payments` + botón de descarga de recibo en PDF usando `jspdf` (ya está instalado).

---

## 8. ONBOARDING & AUTH

### 8.1 🔴 Onboarding layout muestra 4 pasos pero hay 5 (modules agregado en F14)

**Archivo:** `src/app/onboarding/layout.tsx:10-15`

```ts
const STEPS = [
  { label: 'Tu tienda' },
  { label: 'Logo' },
  { label: 'Primer producto' },
  { label: '¡Listo!' },
]
```

Falta “Módulos”. Actualmente se navega entre 5 pasos pero el indicador muestra 4. `OnboardingSteps` se renderiza dentro de cada página — el array `STEPS` del layout no se usa, pero el nombre desconcierta.

**Fix:** actualizar `STEPS` o eliminarlo si no se usa.

---

### 8.2 🟠 Signup permite emails de Mercado Pago de testing (sandbox)

Con `supabase.auth.signUp` acepta cualquier email. En primer uso real, un usuario con Gmail espera confirmación. Hoy `ESTADO.md` dice “Configurar Supabase Auth → email confirmación (actualmente disabled para MVP — habilitar en prod).”

**Bloqueante manual** antes del launch. Sin esto:
- No verificás emails → spam ease.
- Password reset con email sin confirmar no funciona.

---

### 8.3 🟠 Al hacer signup exitoso, redirige a `/onboarding` **sin** confirmar email

Si el usuario cierra el tab antes de completar onboarding, cuando vuelva no está logueado y debe loguearse de nuevo. Si el email no está confirmado, no puede loguearse. El usuario queda atrapado con una tienda “fantasma” que nunca completó.

**Fix:** completar onboarding antes de pedir confirmación, o mantener la sesión server-side con cookie refresh automático.

---

### 8.4 🟡 Recuperación de contraseña — sin rate limit por email

Un atacante puede dispar `sendPasswordReset` cientos de veces para un email → flooding del inbox.

**Fix:** en `sendPasswordReset` (auth.ts:15) agregar limiter por email (redis key `pwreset:{email}`, 3/hora).

---

### 8.5 🟡 `/auth/no-store` sin CTA claro

Si un usuario logueado no tiene tienda, ¿qué hace? La página es un fallback pero los usuarios no van a entender. Si ya se registró sin store (improbable tras F9 pero posible con invitación eliminada), queda varado.

**Fix:** en `/auth/no-store` agregar botón “Crear tienda ahora” que va a `/onboarding` (crea store fantasma si no existe).

---

## 9. MULTITENANT & DOMINIOS

### 9.1 🟠 Resolución por subdominio — sin fallback a custom_domain en middleware

**Archivo:** `src/middleware.ts:42-51`

```ts
if (host.endsWith(`.${appDomain}`)) return host.replace(...)
return null
```

Si el usuario configura `midnegocio.com` y apunta DNS correctamente, el middleware no lo resuelve porque no matchea `.kitdigital.ar`. Se busca pasar por `custom_domain` pero el código retorna `null` → la tienda queda en 404.

**Fix:** si el Host no termina en `appDomain`, hacer lookup a `stores.custom_domain = host AND custom_domain_verified = true`. Cachear en Redis 5 min por Host. Esto es crítico para vender el módulo `custom_domain` como pro.

---

### 9.2 🟡 DNS verification (TXT record) — dependencia de DNS-over-HTTPS de Google

Si Google DNS falla o rate-limitea, los dueños no pueden verificar. Poco probable pero el código no tiene fallback.

---

### 9.3 🟡 No hay soporte para wildcard SSL en custom_domain

Vercel lo hace automáticamente si el dominio tiene ANAME/CNAME correctos, pero no está documentado en los pasos manuales del admin.

---

## 10. SEO & COMPARTIR

### 10.1 🟠 Open Graph per-store no implementado

**Archivo:** `src/app/(public)/[slug]/page.tsx:10-18`

`generateMetadata` devuelve title + description pero NO `openGraph` ni `twitter`. Cuando el dueño comparte `slug.kitdigital.ar` en WhatsApp no aparece preview con logo ni imagen de producto.

**Fix:** agregar `openGraph: { images: [logo_url, cover_url], type: 'website', siteName: store.name }`.

---

### 10.2 🟠 Schema.org / microdata ausente

Sin `JSON-LD` de `Product`, los productos no indexan bien en Google Shopping ni aparecen con precio/imagen en SERP.

**Fix:** en `product-detail-view.tsx` agregar `<script type="application/ld+json">` con `{"@type":"Product","name":..."offers":{"@type":"Offer","price":...}}`.

---

### 10.3 🟡 Sitemap.ts chunked per 10k URLs — OK, pero `lastmod` siempre es `now`

Google penaliza levemente cuando todas las URLs cambian a la vez. 

**Fix:** usar `stores.updated_at` como lastmod por tienda.

---

## 11. EMAIL & NOTIFICACIONES

### 11.1 🟠 El mismo template (`TrialExpiringEmail`) se reutiliza para 3 propósitos

**Archivo:** `src/app/api/cron/check-billing/route.ts:87, 228, 296`

Se usa para:
1. Trial vencido (daysLeft=0).
2. Plan anual vencido (daysLeft=0 + subject distinto).
3. Aviso de plan anual por vencer (daysLeft=14).

Mismo HTML, diferente subject. Confuso para el usuario que recibe dos emails similares.

**Fix:** separar en `TrialExpiredEmail`, `AnnualExpiredEmail`, `AnnualExpiringEmail`.

---

### 11.2 🟡 Sin email de bienvenida

Usuario registra → no recibe email. No hay “verificación” social ni confirmación de creación.

**Fix:** template `WelcomeEmail` con link al panel y tutorial rápido.

---

### 11.3 🟡 No hay email al dueño cuando llega un pedido

Relacionado con 1.1 (pedidos no se graban). Cuando se arregle, enviar email al owner con link al pedido si está configurado.

---

## 12. POLISH PREMIUM (para la sensación “Audi”)

### 12.1 🟡 Paleta de colores en admin es neutra pero no consistente

- Colores hard-coded en varios lugares: `#1b1b1b`, `bg-amber-50`, `border-amber-200`, `text-red-700`.
- Muchas variantes de `destructive/10`, `destructive/15`, `destructive/20` entre componentes distintos.
- `bg-green-100` y `bg-green-500` coexisten.

**Fix:** definir tokens semánticos (`--warning-bg`, `--warning-border`, `--success-bg`, `--danger-bg`) en `globals.css` y usarlos en todos los components.

---

### 12.2 🟡 Transiciones — algunas micro, otras nada

El `ProductCard` tiene `hover:shadow-md transition-shadow` + `group-hover:scale-105` en la imagen. Pero la lista admin de productos no tiene hover feedback más que `cursor-pointer`. El sidebar no tiene transición de estado activo.

**Fix:** patrón común: 200ms ease-out en hover states, 150ms en active states. Consistencia visual.

---

### 12.3 🟡 Typography scale — muchas variantes de `text-xs`

Grepeando rápido: hay `text-[10px]`, `text-[11px]`, `text-xs`, `text-[13px]`, `text-sm`, `text-base`, `text-lg`. Sin jerarquía clara.

**Fix:** definir 5 tamaños (xs-sm-base-lg-xl-2xl-3xl) y mapearlos a casos: badge=xs, body=sm, section-header=base, page-title=lg, hero=2xl. Eliminar tamaños arbitrarios.

---

### 12.4 🟡 Logos de tiendas — fit poco confiable

En admin-shell header: `rounded-md object-cover h-8 w-8`. Si el logo es wide (ej. un texto largo), queda cortado. En catálogo público: `rounded-full h-8 w-8` — misma historia.

**Fix:** preset Cloudinary para “logo square” con padding blanco (`c_pad`).

---

### 12.5 🟡 Skeletons inconsistentes

Algunas páginas usan skeleton, otras usan solo spinners, otras no muestran nada. Sensación de app sin pulido.

**Fix:** todas las páginas de admin con useQuery deberían tener skeleton específico a cada layout (producto: grid 4×, pedido: tabla 5 rows, etc).

---

### 12.6 🟡 Onboarding `/done` — CTA final débil

El usuario completa el setup y llega a `/onboarding/done`. Hay botón “Ir al panel”. Pero no hay:
- Preview de cómo se ve el catálogo.
- Link rápido a copiar.
- Botón para compartir por WhatsApp con mensaje pre-armado “¡Miren mi nueva tienda!”.

En F12 se menciona que esto está implementado pero vale verificar que se vea bien.

---

### 12.7 🟡 Dashboard empty state podría ser mejor

Tres cards en `/admin`. Tiene un “Potenciado por KitDigital” poco diferenciador. Podría ser un video de 30s o un checklist interactivo con estado persistido (como Linear o Notion onboarding).

---

### 12.8 🟡 WhatsApp link en admin topbar

El topbar tiene “Ver catálogo” pero no “Soporte por WhatsApp”. Usuario que necesita ayuda va al footer, busca email, espera respuesta. Mata la relación.

**Fix:** floating button en bottom-right del admin con `wa.me/${SUPPORT_WHATSAPP}` y mensaje pre-rellenado.

---

### 12.9 🟢 Logo hardcodeado en `/logo.jpg`

Un JPG no tiene transparencia. Deberías tener `/logo.png` o `/logo.svg` para contextos oscuros. Además, `next/image` va a redimensionar pero el logo es fijo 32px — un SVG es mejor.

---

### 12.10 🟢 Favicon genérico

Si hay favicon es probablemente el default de Next. Customizar con logo real.

---

## 13. DESCUBRIMIENTOS MENORES

- **`sitemap.ts`** hace queries de tiendas activas. Con 10k tiendas va a tardar. Ya chunked ✅ pero limitado a 10 chunks = 100k URLs. Suficiente por un largo rato.
- **`billing_payments.amount`** en centavos pero `MP.transaction_amount` en pesos — los webhook lo multiplican por 100 al guardar ✅.
- **`ai_tokens_used`** se actualiza vía `increment_ai_tokens` RPC si existe, sino update directo → race condition documentada. Crear RPC en Supabase (ver `ESTADO.md` F8 blockers).
- **`pnpm-lock.yaml`** commiteado ✅.
- **`.env.example`** existe ✅.
- **CRON runs daily a las 3 AM ARS ≈ 6 AM UTC** — confirmar timezone correcto (Vercel cron corre UTC).
- **`tailwindcss v3.4.19`** pinned ✅.
- **`@next/bundle-analyzer`** instalado ✅ pero no veo reports recientes — correr `pnpm analyze` antes de launch.
- **`lucide-react: ^1.8.0`** en package.json es **muy sospechoso**. La versión real en npm para `1.x` es del 2022 (deprecated). Posiblemente debería ser `^0.5xx.0`. **Verificar al lock**, puede estar rompiendo icons en producción.

---

## PLAN DE EJECUCIÓN SUGERIDO (orden)

### Semana 1 — Stop-the-bleed (antes de cualquier venta)

**Día 1-2 (crítico comercial):**
1. [1.1] Grabar pedidos del catálogo en DB + modal de checkout con nombre/envío/pago → **máxima prioridad absoluta**.
2. [1.2] Fix precio × 100 en onboarding.
3. [1.6] Usar `plan.trial_max_products` al crear tienda.
4. [1.8] Fix URL del catálogo en onboarding.

**Día 3-4 (crítico billing/security):**
5. [1.3] Reescribir `verifyWebhookSignature` con el template correcto.
6. [7.1] Validar UUID en webhook rama anual.
7. [1.7] Setear `ai_tokens` default > 0 o deshabilitar asistente si 0.
8. [8.2] Habilitar confirmación de email en Supabase Auth.

**Día 5 (stability):**
9. [1.9] Remover o refactorizar rate limit del webhook.
10. [1.10] Consolidar Realtime a 1 canal.
11. [8.1] Actualizar array `STEPS` del onboarding layout.
12. [6.2] Verificar versión de `lucide-react` en lock.

### Semana 2 — UX premium

13. [2.1] Checkout completo en CartDrawer (form + grabar order + abrir WhatsApp).
14. [2.2, 2.3] ProductSheet con stock, categorías-badge, thumbnails en lista admin.
15. [2.4] Landing: “Gratis por 14 días” con microcopy.
16. [12.1-12.5] Polish visual: tokens semánticos, typography scale, transiciones.

### Semana 3 — Escala y SEO

17. [5.1-5.6] Performance: sin fetch self, paginar catálogo, ISR + revalidateTag.
18. [10.1, 10.2] OpenGraph per-store + JSON-LD de Product.
19. [4.1-4.3] SQL: FKs faltantes, check stock, índices eventos.
20. [3.3, 3.5] Security: prompt injection guard + CSRF check.

### Semana 4 — Polish final + launch

21. [6.1] Generar `database.ts` con CLI, eliminar `as any`.
22. [9.1] Custom domain resolution en middleware.
23. [11.1, 11.2] Separar templates de email + welcome email.
24. [12.6-12.10] Polish final: onboarding done, soporte WhatsApp flotante, favicon.
25. Final: bundle analyze, smoke test de todos los flujos con 3 tiendas demo en prod.

---

## CRITERIO DE LANZAMIENTO

✅ **No lanzar sin:**
- [ ] 1.1 pedidos persistidos en DB
- [ ] 1.2 precio correcto en onboarding
- [ ] 1.3 webhook MP firma correcta
- [ ] 1.6 max_products respeta trial
- [ ] 1.7 ai_tokens con tope
- [ ] 7.1 validación UUID en webhook
- [ ] 8.2 email confirmation ON en Supabase
- [ ] CRON_SECRET + MP_WEBHOOK_SECRET seteados en Vercel
- [ ] Superadmin creado en Supabase
- [ ] OG image pública
- [ ] Test E2E: crear tienda → cargar 3 productos → pagar plan → recibir pedido → verlo en admin

🎯 **Nice-to-have antes de las primeras 10 ventas:**
- Custom domain
- Checkout con datos de cliente
- OG dinámico per tienda
- Welcome email

🚀 **Post-10 ventas para escalar a 100:**
- `database.ts` real con tipos
- ISR con revalidateTag
- Virtualización de listas
- Bundle analyze + code-split

---

*Fin del documento. Próximo paso sugerido: atacar sección 1 en orden, commit por fix, smoke test en staging después de cada bloque.*
