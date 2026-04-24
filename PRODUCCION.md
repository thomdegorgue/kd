# KitDigital — Producción Checklist & Roadmap

**Última actualización:** 2026-04-24  
**Estado:** F14 completada. Listo para auditoría y polish final antes de primer lanzamiento.

---

## RESUMEN EJECUTIVO

El sistema tiene arquitectura sólida y funciona end-to-end. Los bugs críticos de onboarding están corregidos. Antes de vender los primeros 100 spots, hay que completar los ítems de la sección P0 y verificar la configuración de producción.

---

## 1. CONFIGURACIÓN DE PRODUCCIÓN (Verificar todo)

### Variables de entorno en Vercel

| Variable | Estado | Notas |
|----------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | |
| `MP_ACCESS_TOKEN` | ✅ | Token de producción de MP |
| `MP_PUBLIC_KEY` | ✅ | |
| `MP_WEBHOOK_SECRET` | ✅ | Configurado en MP Dashboard |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | ✅ | |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | ✅ | Unsigned preset configurado |
| `UPSTASH_REDIS_REST_URL` | ✅ | |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | |
| `OPENAI_API_KEY` | ✅ | |
| `RESEND_API_KEY` | ✅ | |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://kitdigital.ar` |
| `NEXT_PUBLIC_APP_DOMAIN` | ✅ | `kitdigital.ar` |
| `CRON_SECRET` | ✅ | Secreto para Vercel Cron |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | ⚠️ | Número real de soporte |
| `NEXT_PUBLIC_SLOTS_AVAILABLE` | N/A | Ya reemplazado por API |

### Supabase

- [ ] **SQL Migration 13.0** ejecutada en Supabase (`billing_period`, `annual_paid_until`, `annual_discount_months`, `max_stores_total`)
- [ ] **Auth → Email Confirm** configurado → redirect a `https://kitdigital.ar/auth/callback`
- [ ] **Auth → Password Reset** → redirect a `https://kitdigital.ar/auth/callback?type=recovery`
- [ ] **Auth → Site URL** = `https://kitdigital.ar`
- [ ] **Superadmin** creado (ver PASOS-MANUALES.md §13)
- [ ] **RPC `increment_ai_tokens`** creada (opcional pero recomendado)

### Mercado Pago

- [ ] **Webhook URL** configurada en MP Dashboard: `https://kitdigital.ar/api/webhooks/mercadopago`
- [ ] **Eventos habilitados:** `payment`, `subscription_preapproval`
- [ ] **Firma HMAC** habilitada con el secreto correcto
- [ ] **Modo producción** activo (no sandbox)
- [ ] Ejecutar test de webhook manual: crear suscripción demo y verificar que `billing_status` cambia a `active`

### Vercel

- [ ] **Dominio wildcard** `*.kitdigital.ar` configurado con DNS
- [ ] **Cron job** `/api/cron/check-billing` activado (actualmente `0 3 * * *`)
- [ ] **Cron `Authorization` header** usa `CRON_SECRET` correctamente
- [ ] **Cron limpieza asistente** `/api/cron/clean-assistant-sessions` activo
- [ ] **Redirect www** → apex 301 (ya en vercel.json)

---

## 2. BUGS CORREGIDOS (F14 + audit)

| Bug | Archivo | Fix aplicado |
|-----|---------|-------------|
| `stock: null` en products insert | `onboarding.ts:121` | ✅ Removido |
| Logo roto (Cloudinary bloqueado) | `next.config.ts` | ✅ `remotePatterns` agregado |
| "No store assigned" tras login | `middleware.ts` | ✅ Service role para store query |
| Módulos hardcodeados en cron anual | `check-billing/route.ts` | ✅ Usa `ANNUAL_INCLUDED_PRO_MODULES` |
| Auth callback faltante (password reset roto) | — | ✅ `/auth/callback/route.ts` creado |
| Política contraseña inconsistente (6 vs 8) | `auth.ts` | ✅ Unificado a 8 chars |

---

## 3. FLUJO COMPLETO DEL USUARIO — Estado y Gaps

### 3.1 Registro (`/auth/signup`)
- **Estado:** Funcional ✅
- **Gaps:**
  - El formulario no deshabilita inputs durante `pending` (solo el botón). Minor.
  - Sin `autoFocus` en el primer campo. Minor.
- **Verificar:** Crear cuenta real en prod, confirmar email, aterrizar en `/admin`.

### 3.2 Login (`/auth/login`)
- **Estado:** Funcional ✅
- **Verificar:** Login con cuenta existente → `/admin`. Login fallido → error claro.

### 3.3 Recuperación de contraseña (`/auth/forgot-password` + `/auth/reset-password`)
- **Estado:** Corregido ✅ (callback route agregado en F14)
- **Verificar:** Solicitar reset → email recibido → link redirige a `/auth/callback?type=recovery` → nueva contraseña → login exitoso.
- **⚠️ ACCIÓN MANUAL:** En Supabase Dashboard > Auth > Email Templates > Reset Password, asegurarse que la URL de redirect sea `https://kitdigital.ar/auth/callback?type=recovery`.

### 3.4 Onboarding (`/onboarding/*`)
- **Estado:** Mejorado ✅ (4 pasos: tienda → diseño → módulos → producto)
- **Gaps:**
  - No hay redirect automático al onboarding si `config.onboarding.completed = false`. Usuario podría bypasear.
  - La validación de WhatsApp acepta solo dígitos sin `+`. El hint `+54` es confuso — debería ser placeholder tipo "5491155555555".
  - Si el usuario completa el onboarding pero cierra el browser antes del paso 4, retoma desde el principio (no recuerda dónde quedó). Aceptable para MVP.
- **Verificar:** Flujo completo signup → onboarding 4 pasos → admin panel.

### 3.5 Panel Admin (`/admin`)
- **Estado:** Funcional ✅
- **Gaps:**
  - **Dashboard vacío** para tiendas nuevas: no hay estado "empty state" con guía de próximos pasos. Impacta la primera impresión.
  - El nombre de la tienda no aparece en el header del sidebar (muestra "Admin").
  - El billing banner de trial no muestra cuántos días quedan (solo aparece cuando son ≤3 días).
  - Sin notificación de nuevo pedido en mobile (solo toast en desktop).

### 3.6 Configuración de tienda (`/admin/settings`)
- **Estado:** Funcional pero incompleto
- **Gaps:**
  - **No hay campo de color primario** en la configuración de tienda (solo se configura en onboarding). El owner no puede cambiar el color después.
  - **Logo no se previsualiza** antes de subir.
  - **Sin campo de descripción de tienda** visible en el form actual.
  - **WhatsApp hint confuso** (mismo problema que onboarding).

### 3.7 Catálogo Público (`/{slug}`)
- **Estado:** Funcional ✅ (SSR + ISR + carrito WhatsApp)
- **Gaps críticos:**
  - **La búsqueda es client-side**: carga TODOS los productos en memoria. Con más de 200 productos se vuelve lento.
  - **El filtro por categoría navega** a `/{slug}/{cat}` en vez de filtrar inline. Inconsistente con la búsqueda.
  - El carrito no valida precios ni stock contra el servidor antes de generar el link de WhatsApp.
  - Sin badge "Destacado" en ProductCard aunque `is_featured` existe en el schema.
- **Verificar:** Abrir `{slug}.kitdigital.ar` (o `kitdigital.ar/{slug}` en dev) → productos cargados → agregar al carrito → link WhatsApp correcto.

### 3.8 Checkout WhatsApp
- **Estado:** Funcional ✅
- **Gaps:**
  - El número de WhatsApp del dueño debe estar configurado o el botón no aparece. Agregar estado de error claro si no hay WhatsApp.
  - El mensaje no es editable antes de enviarlo.
  - Moneda hardcodeada a `es-AR`. Ignora `config.currency`.

### 3.9 Billing (`/admin/billing`)
- **Estado:** Funcional (mensual + anual implementados)
- **Gaps:**
  - **Tab activo no es suficientemente visible**: mejorar el indicador de plan activo actual.
  - **Plan anual no muestra que `assistant` está excluido** en la lista de módulos incluidos.
  - Módulo `assistant` no tiene UI de contratación como add-on separado.
  - Sin historial de pagos fallidos en la UI (la tabla `billing_webhook_log` existe pero no se expone).
- **Verificar:** Crear suscripción mensual en sandbox → módulos activos → cambiar tier → cancelar.

---

## 4. ROADMAP PRIORIZADO

### P0 — Antes del primer lanzamiento (esta sesión / próximas 48h)

1. **[ ] Agregar color primario en settings de tienda** (`/admin/settings`)
   - Mismo color picker que onboarding, guardado en `stores.config.primary_color`
   - Actualmente el dueño no puede cambiar el color después del onboarding
   - **Archivo:** `src/components/admin/store-settings-form.tsx`

2. **[ ] Empty state del dashboard con guía de acción**
   - Cuando hay 0 pedidos y 0 productos, mostrar tarjetas con CTAs: "Agregá tu primer producto", "Configurá tu tienda", "Compartí tu catálogo"
   - **Archivo:** `src/app/(admin)/admin/page.tsx`

3. **[ ] Nombre de tienda en el header del sidebar**
   - Reemplazar "Admin" por el nombre real de la tienda
   - **Archivo:** `src/components/admin/admin-shell.tsx:269`

4. **[ ] WhatsApp placeholder claro en onboarding y settings**
   - Cambiar hint de "+54" a placeholder con ejemplo: "5491155555555" (sin guiones, sin +, con código de país)
   - **Archivos:** `onboarding/page.tsx`, `store-settings-form.tsx`

5. **[ ] Badge "Destacado" en ProductCard del catálogo público**
   - Si `is_featured = true`, mostrar badge naranja/amarillo "Destacado"
   - **Archivo:** `src/components/public/product-card.tsx`

6. **[ ] Verificar que billing mensual activa módulos pro**
   - Revisar el flujo `createSubscription → MP → webhook → módulos activos`
   - El bug #3 del audit (pending_pro_modules en rama mensual) puede estar ya manejado por la rama `subscription_preapproval` del webhook
   - **Acción:** Test manual en staging con módulo pro seleccionado

7. **[ ] SQL Migration 13.0 ejecutada** (si no fue hecha)

8. **[ ] Verificar auth callback en Supabase Dashboard**
   - Auth Templates → Email Confirm → URL redirect = `https://kitdigital.ar/auth/callback`
   - Auth Templates → Reset Password → URL redirect = `https://kitdigital.ar/auth/callback?type=recovery`

---

### P1 — Primera semana de producción

9. **[ ] Store-settings-form: agregar descripción de tienda**
   - El campo `description` existe en el schema pero no está en el form
   - Se muestra en `store-header.tsx` si tiene contenido

10. **[ ] Billing banner más visible para trial**
    - Mostrar siempre durante demo period, no solo últimos 3 días
    - Incluir link claro a contratar y días restantes

11. **[ ] Validación de precio antes de WhatsApp checkout**
    - Server action que verifica precios actuales antes de generar el link
    - Evita que productos actualizados (precio/eliminados) generen mensajes con datos stale

12. **[ ] Swipe en banner carousel (mobile)**
    - Touch events en `banner-carousel.tsx`
    - Los banners se usan como primer punto de impresión del catálogo

13. **[ ] Filter de categorías inline** (sin navegación)
    - Actualmente navega a `/{slug}/{cat}`, debería filtrar client-side
    - Alinear con el comportamiento de la búsqueda

14. **[ ] Paginación o infinite scroll en catálogo público**
    - Actualmente carga todos los productos. Con catálogos grandes (>100 items) = lento
    - Agregar `Load more` button o paginación simple

15. **[ ] Error boundary en catálogo público**
    - Si la carga de productos falla, mostrar mensaje amigable

16. **[ ] Log de emails fallidos visible en superadmin**
    - La tabla `events` tiene `email_send_failed`. Agregar filtro en `/superadmin/events`

---

### P2 — Primer mes post-lanzamiento

17. **[ ] Búsqueda server-side con full-text**
    - Usar `to_tsvector` + `to_tsquery` en Supabase
    - Endpoint paginado `/api/stores/[slug]/products?q=`
    - Con cache Redis por query

18. **[ ] Variantes en el catálogo público**
    - Selector de variante (talle, color) en `product-detail-view.tsx`
    - Agregar variante seleccionada al carrito

19. **[ ] Stock indicator en ProductCard**
    - Badge "Sin stock" si `quantity_available = 0`
    - Deshabilitar "Agregar" si sin stock

20. **[ ] Analytics básico**
    - Google Analytics 4 o Plausible en el catálogo público
    - Evento por "pedido enviado por WhatsApp"

21. **[ ] Plan anual: badge claro + fecha de vencimiento**
    - En `/admin/billing`: resaltar "Plan anual activo hasta DD/MM/YYYY"
    - Botón "Renovar" visible 30 días antes del vencimiento

22. **[ ] Módulo assistant como add-on mensual**
    - UI para contratar/cancelar solo el assistant
    - Precio separado, no incluido en plan anual

23. **[ ] Dashboard con gráfico de pedidos (últimos 30 días)**
    - Chart simple de barras con pedidos/ingresos diarios
    - TanStack Query con staleTime razonable

24. **[ ] TTL en carrito (localStorage)**
    - Expirar carrito después de 7 días automáticamente
    - Evitar que usuarios vean precios viejos de meses atrás

25. **[ ] Retry de webhook desde superadmin**
    - Botón "Reintentar" en `/superadmin/webhooks` para webhooks fallidos

---

## 5. CHECKLIST GO / NO-GO para lanzamiento

### Crítico — NO lanzar sin esto:
- [ ] SQL Migration 13.0 ejecutada
- [ ] Auth redirect URL configurada en Supabase
- [ ] Webhook MP configurado y verificado (test en staging)
- [ ] Superadmin creado y accesible
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` configurado
- [ ] Deploy en Vercel activo con dominio wildcard funcionando
- [ ] Test de flujo completo: signup → onboarding → admin → crear producto → catálogo público → carrito → WhatsApp

### Recomendado antes de lanzar:
- [ ] OG image `public/og-image.jpg` (1200×630) para previews en redes sociales
- [ ] Color primario editable en `/admin/settings`
- [ ] Empty state del dashboard
- [ ] Trial banner más visible
- [ ] Nombre de tienda en header del sidebar

### Puede esperar (P1/P2):
- [ ] Búsqueda server-side
- [ ] Variantes en catálogo público
- [ ] Analytics
- [ ] Stock indicator

---

## 6. DEUDA TÉCNICA DOCUMENTADA

| Ítem | Descripción | Impacto | Prioridad |
|------|-------------|---------|-----------|
| `savings` vs `savings_account` | Handler registrado como `savings`, módulo llamado `savings_account` | Confusión de nombres | Baja |
| `as any` en 43+ lugares | Supabase relationship types workaround | Reduce type safety | Media |
| Búsqueda client-side | Todo el catálogo se carga en memoria | Performance con >100 items | Alta |
| Sin cache invalidation explícita | Admin updates no invalidan caché Redis inmediatamente | Stale data hasta TTL | Media |
| Sin error reporting (Sentry) | Errores en producción son silenciosos | Debugging difícil | Alta |
| Cart sin TTL | Precios stale pueden persistir meses | Data incorrecta | Media |
| Webhook idempotencia parcial | Webhooks fallidos pueden duplicarse | Billing inconsistente | Alta |

---

## 7. MÉTRICAS A MONITOREAR EN PRODUCCIÓN

- **Tasa de conversión:** signup → tienda activa (billing activado)
- **Churn:** tiendas que pasan a `past_due` y no renuevan
- **MRR:** visible en `/superadmin` dashboard
- **Errores de webhook:** tabla `billing_webhook_log` con status `failed`
- **Emails fallidos:** tabla `events` con type `email_send_failed`
- **Uso de IA:** `stores.ai_tokens_used` promedio
