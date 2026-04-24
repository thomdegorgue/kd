# Pasos Manuales

Estas son las tareas que solo un humano puede realizar. El agente IA no puede ejecutarlas.

---

## 1. Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Región: **São Paulo** (sa-east-1) para menor latencia en Argentina
3. Copiar `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
4. Copiar `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copiar `service_role secret key` → `SUPABASE_SERVICE_ROLE_KEY`
6. Ir a SQL Editor → ejecutar `schema.sql` completo (si Postgres rechaza la sintaxis de triggers, revisar versión; en Supabase hosted debe aplicar sin cambios)
7. Verificar que las 30 tablas existen en Table Editor
8. Verificar que RLS está habilitado en todas las tablas de dominio

## 2. Mercado Pago (Billing Suscripciones)

1. Ir a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Sign in o crear cuenta (usar email empresarial si es posible)
3. Click en tu usuario (arriba a la derecha) → **Mis aplicaciones**
4. Si no existe, crear aplicación nueva:
   - Click **+ Crear aplicación**
   - Nombre: `KitDigital` (o similar)
   - Usar como **Aplicación web integrada** o **Integraciones**
   - Click **Crear**
5. Una vez creada, ir a la aplicación → **Credentials**
6. Copiar (bajo **PRODUCTION**)—
   - `Access Token` → `MP_ACCESS_TOKEN`
   - `Public Key` → `MP_PUBLIC_KEY`
7. Agregar ambas a `.env.local`
8. Configurar Webhook:
   - En la app de MP, ir a **Webhooks** (sidebar)
   - Click **+ Agregar webhook**
   - URL: `https://kitdigital.ar/api/webhooks/mercadopago`
   - **Eventos a escuchar:**
     - ☑️ `payment.created` (cuando se crea un pago)
     - ☑️ `payment.updated` (cuando cambia estado: aprobado, rechazado, etc.)
     - ☑️ `subscription.created` (cuando se crea una suscripción)
     - ☑️ `subscription.updated` (cuando cambia una suscripción)
   - Click **Crear webhook**
9. Copiar el **Webhook Secret** (aparece debajo del webhook creado)
   - Pegar ese valor en `MP_WEBHOOK_SECRET` (Vercel + `.env.local`) — ver también §15.

### Webhook: qué URL poner y cómo funciona el secret (no se “manda el token” al servidor como login)

**URL del webhook:** la pública de tu app en producción, por ejemplo `https://kitdigital.ar/api/webhooks/mercadopago`. Mercado Pago hace un **POST** a esa URL cada vez que ocurre un evento (pago creado, suscripción actualizada, etc.). El cuerpo del POST es un JSON con el evento; **no** va el secret en el body.

**¿Dónde entra el secret entonces?** MP y tu servidor comparten **la misma clave** que vos copiaste del panel de MP (`MP_WEBHOOK_SECRET`). En cada notificación, MP envía **headers HTTP**:

- `x-signature` — contiene timestamp y un hash (`ts=...,v1=...`)
- `x-request-id` — un id único del request

KitDigital **recomputa** el HMAC-SHA256 usando `MP_WEBHOOK_SECRET` + `x-request-id` + el timestamp, y lo compara con `v1`. Si no coincide → **401 Invalid signature**. El secret **nunca sale** de tu entorno (Vercel / `.env.local`); solo MP (al firmar) y tu código (al verificar) lo conocen.

**Resumen:** no tenés que “recibir el token” aparte: configurás el webhook en MP con la URL correcta, copiás el **Webhook Secret** de MP a `MP_WEBHOOK_SECRET` en Vercel, y cada POST que MP envíe vendrá firmado en headers. Sin `MP_WEBHOOK_SECRET` configurado, el código rechaza todo (o en desarrollo podés ver logs de error).

**Para desarrollo local con webhooks:**
- Usar `ngrok http 3000` para exponer puerto local
- Cambiar URL del webhook en MP a `https://xxxxx.ngrok.io/api/webhooks/mercadopago`
- Para testing, usar modo **Sandbox** de MP (automático en credenciales dev)

**Operación de suscripción:**
1. Usuario crea tienda
2. En `/admin/billing`, elige plan (ej: Growth para 300+ productos)
3. Click **Suscribirse** → redirige a MP
4. MP cobra el primer mes
5. Webhook llega → actualiza `stores.billing_status` a `active`
6. Módulos PRO se activan automáticamente
7. Cada mes, MP cobra automáticamente (o falla si medio de pago rechaza)

## 3. Cloudinary

1. Crear cuenta gratuita en [cloudinary.com](https://cloudinary.com)
2. En el dashboard, copiar **Cloud Name** → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
3. Ir a **Settings** (⚙️ abajo a la izquierda) → **Upload**
4. Bajar a **Upload presets** → Click **Add upload preset**
5. Configurar:
   - **Preset name:** `kitdigital`
   - **Signing mode:** `Unsigned` (✓ seleccionar)
   - **Asset folder:** `kitdigital` (carpeta raíz para todos los uploads)
   - **Generated public ID:** `Auto-generate an unguessable public ID value` (más seguro)
   - **Overwrite assets with the same public ID:** OFF
   - Click **Save**
6. Agregar `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=kitdigital` a `.env.local`

**Nota:** El asset folder `kitdigital` no es por tienda. El sistema agrupa todos los uploads en esa carpeta. La carpeta específica por `store_id` se forma en el filename si es necesario (ej: `kitdigital/store-123/product-456.jpg`), pero Cloudinary actualmente maneja esto a nivel de public ID, no de carpeta real. Por ahora, mantener simple con folder `kitdigital`.

## 4. Upstash Redis (Para Caché en Producción)

**⚠️ OPCIONAL para desarrollo local.** Redis es necesario en producción para caché ISR + rate limiting. En dev sin env var, la app funciona (sin caché, más lento pero funcional).

1. Ir a [upstash.com](https://upstash.com)
2. Sign up → crear cuenta (OAuth con GitHub o email)
3. Click **Create Database**
4. Configurar:
   - **Database name:** `kitdigital-cache`
   - **Region:** `South America (São Paulo)` ← elegir esto para Argentina
   - **Eviction:** `NoEviction` (política para no perder datos)
   - Click **Create**
5. En la página de detalles, bajo **REST API**, copiar:
   - `UPSTASH_REDIS_REST_URL` (URL de la API REST)
   - `UPSTASH_REDIS_REST_TOKEN` (token de autenticación)
6. Agregar ambas a `.env.local`

**Testing local sin Redis:** Si no configuras esto, las queries públicas **no se cachean** (ISR funciona, pero cada revalidación golpea Supabase). Acceptable para MVP local. Habilitar en staging/prod.

## 5. OpenAI (Asistente IA)

**⚠️ REQUERIDO para módulo `assistant`.** Sin esto, el asistente IA no funciona pero el resto de la app va normal.

1. Ir a [platform.openai.com](https://platform.openai.com/account/api-keys)
2. Login o Sign up
3. Click **API keys** (en el sidebar izquierdo)
4. Click **+ Create new secret key**
5. Configurar:
   - **Project:** Default (o el que uses)
   - Click **Create secret key**
6. **COPIAR INMEDIATAMENTE** la clave (solo aparece una vez)
7. Agregar a `.env.local`: `OPENAI_API_KEY=sk-...`
8. En [Usage](https://platform.openai.com/account/usage/overview), configurar **Hard limit** (ej: $10/mes) para evitar sorpresas de facturación

**Modelo usado:** `gpt-4o-mini` (barato y rápido, ideal para asistente).

**Testing:** El asistente permite 5 acciones (create_product, update_product, create_category, create_task, update_order_status). Sin API key, el botón del asistente no se muestra.

## 6. Resend (Email Transaccional)

**⚠️ OPCIONAL para MVP.** Sin esto, emails de invitaciones y notificaciones no se envían, pero la app funciona. Recomendado para staging/prod.

1. Ir a [resend.com](https://resend.com)
2. Sign up → crear cuenta
3. En el dashboard, ir a **API Keys** (sidebar)
4. Click **+ Create API Key**
5. Copiar → `RESEND_API_KEY=re_...`
6. Agregar a `.env.local`
7. **(Recomendado)** Ir a **Domains** y agregar tu dominio (`kitdigital.ar`):
   - Click **+ Add Domain**
   - Ingresar `kitdigital.ar`
   - Seguir instrucciones para agregar registros DKIM/SPF en tu DNS
   - Una vez verificado, los emails se enviarán desde `noreply@kitdigital.ar`

**Usos en KitDigital:**
- Invitaciones multiusuario (cuando owner invita colaboradores)
- Confirmación de email (actualmente deshabilitada para MVP, activar en prod)
- Notificaciones de billing (vencimiento, falta de pago)

**Testing sin Resend:** MVP puede funcionar sin emails. Los datos se registran en DB, pero no se notifica al usuario. Aceptable para desarrollo local.

## 7. Vercel

1. Conectar repositorio de GitHub
2. Configurar en Vercel **las mismas variables** que en `.env.local` (sección 8), más las opcionales que documenta `README.md` (ej. `SUPERADMIN_ALLOWED_IPS`). No hay un número fijo: copiar el bloque completo al desplegar.
3. Configurar dominio apex: `kitdigital.ar` (y opcionalmente `www` → redirect al apex; el repo incluye redirect en `vercel.json`).
4. Configurar **subdominio comodín (wildcard)** en DNS y en Vercel (siguiente subsección).
5. En Vercel → **Settings → Domains**: agregar el dominio raíz y el wildcard; seguir las instrucciones de registros DNS que muestra Vercel.

### Qué es un dominio wildcard (`*.kitdigital.ar`)

**Wildcard** = “cualquier subdominio de un nivel”. El asterisco es un comodín.

- Sin wildcard solo resuelve `kitdigital.ar` y quizá `www.kitdigital.ar`.
- Con **`*.kitdigital.ar`** también resuelven, por ejemplo:
  - `mi-tienda.kitdigital.ar`
  - `otra-tienda.kitdigital.ar`

En KitDigital, cada tienda usa su **slug** como subdominio en producción: `{slug}.kitdigital.ar`. Por eso en el DNS del proveedor (donde compraste el dominio) tenés que crear un registro **CNAME** para el nombre `*` (o el host `*.kitdigital.ar` según el panel) apuntando al destino que indique Vercel (típicamente `cname.vercel-dns.com` o similar al agregar el dominio en el dashboard). Luego en Vercel confirmás que `*.kitdigital.ar` está verificado.

Si el wildcard no está bien configurado, los catálogos públicos por subdominio no cargarán aunque el sitio principal sí.

## 8. Variables de Entorno Locales

Crear `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
OPENAI_API_KEY=
RESEND_API_KEY=
CRON_SECRET=
# WhatsApp de soporte (términos, landing, etc.) — internacional sin +, ej: 5491123456789
NEXT_PUBLIC_WHATSAPP_NUMBER=
# Opcional (ver README.md):
# SUPERADMIN_ALLOWED_IPS=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=localhost:3000
```

## 9. Para desarrollo local con webhooks

Usar ngrok o cloudflared para exponer el puerto local:

```bash
ngrok http 3000
# o
cloudflared tunnel --url http://localhost:3000
```

Actualizar la URL del webhook de Mercado Pago con la URL temporal.

## 10. Desarrollo Local — Resolución de Tiendas (sin subdominios)

En producción las tiendas se resuelven por subdominio (`{slug}.kitdigital.ar`) o dominio custom. En desarrollo local no se usan subdominios.

**Estrategia en dev**: el middleware detecta `NODE_ENV=development` y usa resolución por path:
- `http://localhost:3000/{slug}/*` → tienda con ese slug
- `http://localhost:3000/admin/*` → panel admin (sesión requerida)
- `http://localhost:3000/superadmin/*` → superadmin (role requerido)

**No se necesita** configurar `/etc/hosts`, `lvh.me` ni nada externo. El middleware maneja todo.

**En producción** (`NODE_ENV=production`): resolución por `Host` header → subdominio o `custom_domain`. El path-based no aplica.

## 11. Resumen: Qué es Obligatorio vs Opcional para MVP

| Servicio | Obligatorio | Para qué | Si no configuras |
|----------|-------------|----------|-----------------|
| **Supabase** | ✅ SÍ | Base de datos, auth, RLS | La app no funciona |
| **Mercado Pago** | ✅ SÍ | Billing suscripciones | No se pueden crear suscripciones |
| **Cloudinary** | ✅ SÍ | Upload de imágenes (logo, productos) | No se pueden subir imágenes |
| **OpenAI** | ⚠️ NO | Asistente IA (módulo assistant) | Asistente no aparece, resto funciona |
| **Upstash Redis** | ⚠️ NO | Caché en producción, rate limiting | Queries lentas, pero funciona |
| **Resend** | ⚠️ NO | Envío de emails (invitaciones, billing) | Invitaciones no se envían por mail |

**Para MVP local funcional:**
- ✅ Supabase, Mercado Pago, Cloudinary (obligatorios)
- ⚠️ OpenAI, Redis, Resend (opcionales)

---

## 12. Checklist de Setup Inicial (Orden Recomendado)

```
FASE 1: Servicios (2 horas)
☐ 1. Supabase: crear proyecto, obtener keys, ejecutar schema.sql
☐ 2. Mercado Pago: crear app, copiar credenciales, configurar webhook
☐ 3. Cloudinary: crear cuenta, crear unsigned upload preset
☐ 4. OpenAI: crear API key (opcional para MVP)
☐ 5. Upstash Redis: crear DB (opcional para MVP)
☐ 6. Resend: crear cuenta (opcional para MVP)

FASE 2: Configuración Local (15 min)
☐ 7. Crear .env.local con todas las keys
☐ 8. pnpm install (si no está hecho)
☐ 9. pnpm dev

FASE 3: Testing (1 hora)
☐ 10. Signup → crear tienda test
☐ 11. Onboarding: nombre, logo, producto
☐ 12. Catálogo público: ver catálogo, agregar carrito, generar WhatsApp
☐ 13. Panel admin: crear órdenes, ver dashboard
☐ 14. Billing: crear suscripción MP (sandbox), verificar webhook

FASE 4: Validación (30 min)
☐ 15. pnpm build — sin errores
☐ 16. pnpm exec tsc --noEmit — sin errores
☐ 17. Documento qué funciona y qué no (en ESTADO.md)
```

---

## 13. Setup Inicial — Superadmin (OBLIGATORIO antes del lanzamiento)

El rol superadmin no se puede crear desde la UI — requiere una operación SQL directa en Supabase.

**Paso 1: Crear usuario en Supabase Auth**
1. Ir a [supabase.com](https://supabase.com) → tu proyecto → **Authentication** → **Users**
2. Click **+ Add user** → **Create new user**
3. Email: `admin@kitdigital.ar` (o el email que uses para administrar)
4. Password: elegir contraseña fuerte (mínimo 16 caracteres, alfanumérico + símbolos)
5. Click **Create user**

**Paso 2: Promover a superadmin (SQL Editor)**
```sql
-- Verificar que el usuario existe en la tabla pública
SELECT id, email FROM public.users WHERE email = 'admin@kitdigital.ar';

-- Promover a superadmin
UPDATE public.users SET role = 'superadmin' WHERE email = 'admin@kitdigital.ar';

-- Verificar
SELECT id, email, role FROM public.users WHERE role = 'superadmin';
```

**Paso 3: Verificar acceso**
1. Ir a `https://kitdigital.ar/auth/login`
2. Login con las credenciales del superadmin
3. Debe redirigir automáticamente a `https://kitdigital.ar/superadmin`
4. Si redirige a `/admin` → el rol no fue aplicado, revisar el SQL

**Nota:** Solo puede haber uno o pocos superadmins. No crear superadmins para clientes normales.

---

## 14. Configurar CRON_SECRET (REQUERIDO en producción)

### Para qué sirve

En `vercel.json` están definidos dos crons que Vercel invoca por HTTP en horarios fijos:

- `/api/cron/check-billing` — trial vencido, archivo por falta de pago, plan anual vencido, avisos por email, etc.
- `/api/cron/clean-assistant-sessions` — limpieza de sesiones del asistente IA.

Esas URLs son públicas si alguien adivina la ruta. **`CRON_SECRET`** es una contraseña larga que solo vos y Vercel conocen: el código exige el header `Authorization: Bearer <CRON_SECRET>`. Vercel, al disparar el cron, **envía ese header automáticamente** con el valor de la variable de entorno `CRON_SECRET` que configuraste en el proyecto.

- **Con `CRON_SECRET` definido:** un visitante que abra `/api/cron/check-billing` en el navegador recibe **401** (no puede ejecutar la lógica).
- **Sin `CRON_SECRET`:** el código permite la ejecución (comportamiento inseguro pensado solo para dev); en producción **siempre** definir el secret.

### Cómo generar el valor

**Linux / macOS / Git Bash en Windows:**
```bash
openssl rand -base64 32
```

**PowerShell (Windows nativo):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Copiá el string resultante (sin espacios ni comillas raras). Ejemplo de forma: `K8mP3xQzR9vL1nF7wJ2cA5tY6bE0dH4s...`

### Dónde pegarlo

1. **Vercel** → proyecto → **Settings** → **Environment Variables** → nombre `CRON_SECRET`, valor = el string generado → entornos **Production** y **Preview** → Save. Redeploy si hace falta para que tome el valor.
2. **`.env.local`** (local, si probás crons a mano):
```env
CRON_SECRET=el-mismo-valor-que-en-vercel
```

### Probar a mano (opcional)

Con el servidor corriendo y `CRON_SECRET` en `.env.local`:
```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" http://localhost:3000/api/cron/check-billing
```

Sin el header correcto debe responder 401.

---

## 15. Verificar MP_WEBHOOK_SECRET (CRÍTICO para billing)

Sin `MP_WEBHOOK_SECRET` en el servidor, la firma no se puede validar: **todos** los POST del webhook reciben **401** hasta que copies el secret del panel de MP a Vercel (y redeploy si hace falta). Con el secret correcto, solo notificaciones **firmadas por Mercado Pago** pasan la verificación; un atacante que no conozca el secret no puede fabricar un `x-signature` válido.

**Relación con §2 (Webhook):** la misma “Clave secreta” que muestra MP al crear el webhook es la que copiás acá. No viaja en el cuerpo del JSON; MP la usa para firmar los headers (ver §2, subsección *Webhook: qué URL…*).

**Cómo obtener el secret:**
1. Ir a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) → tu aplicación
2. **Webhooks** → seleccionar el webhook configurado para `kitdigital.ar`
3. Debajo del webhook hay un campo **"Clave secreta"** o **"Secret"**
4. Copiar ese valor → `MP_WEBHOOK_SECRET`

**Configurar en Vercel:**
1. Settings → Environment Variables → `MP_WEBHOOK_SECRET` = valor copiado
2. Configurar en Production y Preview

**En `.env.local`:**
```env
MP_WEBHOOK_SECRET=tu-secret-de-mp
```

---

## 16. F13 — Pasos Manuales Go-to-Market

Checklist de producto y operación para billing dual (mensual/anual), DNS y seguridad. El **código** de F13 ya está en el repo; esto es lo que el humano debe hacer en servicios externos.

### 16.1 SQL Migration en Supabase (OBLIGATORIO — BLOCKER)

Ir a [supabase.com](https://supabase.com) → tu proyecto → **SQL Editor** → **New query** → pegar y ejecutar:

```sql
-- Soporte billing dual en stores
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly', 'annual'));

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS annual_paid_until DATE;

-- Configuración de descuento anual y cap global en plans
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS annual_discount_months INTEGER NOT NULL DEFAULT 2;

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_stores_total INTEGER;

-- Asegurar que mp_subscription_id sea nullable en billing_payments
-- (pagos anuales no tienen preapproval_id de MP)
ALTER TABLE billing_payments
  ALTER COLUMN mp_subscription_id DROP NOT NULL;
```

**Verificación:** ir a Table Editor → tabla `stores` → confirmar columnas `billing_period` y `annual_paid_until`. Tabla `plans` → confirmar `annual_discount_months` y `max_stores_total`.

### 16.2 Crear imagen Open Graph (`public/og-image.jpg`)

**Qué es Open Graph (OG):** metadatos que describen una página cuando se comparte el enlace en **WhatsApp, Instagram, X, LinkedIn, Slack**, etc. Muchas redes muestran título, descripción e **imagen de vista previa**. Esa imagen suele llamarse “OG image”.

En este proyecto la imagen por defecto vive en el repo como **`public/og-image.jpg`** (tamaño recomendado **1200×630 px**, JPG calidad 85+).

**Contenido sugerido:**
- Fondo oscuro (puede ser `#1b1b1b`) con logo y tagline
- Texto: "KitDigital — Catálogo digital para tu negocio"

**Cómo subirla:** guardar el archivo en la carpeta `public/` del proyecto, commitear y desplegar; o subir el mismo asset al hosting que uses si el flujo de deploy no incluye `public/` por algún motivo (lo normal en Next.js es commitear `public/og-image.jpg`).

**Verificación:** tras el deploy, pegar `https://kitdigital.ar` en [opengraph.xyz](https://www.opengraph.xyz) y comprobar que la imagen se ve.

### 16.3 Número WhatsApp de soporte (`NEXT_PUBLIC_WHATSAPP_NUMBER`)

La landing y las páginas legales (p. ej. términos) leen el número desde la variable de entorno **`NEXT_PUBLIC_WHATSAPP_NUMBER`**. No hace falta editar el código si configurás el número bien.

**Formato:** internacional **sin** el símbolo `+`, solo dígitos. Ejemplo Argentina: `5491123456789` (código país 54 + código área sin 0 + número).

**Dónde configurarlo:**
1. **Vercel** → Environment Variables → `NEXT_PUBLIC_WHATSAPP_NUMBER` → Production (y Preview si aplica).
2. **`.env.local`** para desarrollo local.

Tras cambiar variables `NEXT_PUBLIC_*` en Vercel, hace falta **nuevo deploy** para que el valor quede baked en el bundle del cliente.

### 16.4 Configurar CRON_SECRET en Vercel (si pendiente)

Ver §14 de este documento.

### 16.5 Configurar MP_WEBHOOK_SECRET en Vercel (si pendiente)

Ver §15 de este documento.

### 16.6 Crear usuario Superadmin (si pendiente)

Ver §13 de este documento.

### 16.7 Habilitar confirmación de email en Supabase Auth (PRODUCCIÓN)

En Supabase → **Authentication** → **Settings** → **Email**:
- Activar **"Enable email confirmations"**
- Configurar el template de confirmación con branding KitDigital
- Verificar que Resend está configurado como SMTP custom (ver §8 de este documento si aplica)

> Solo para producción. Mantener desactivado en proyecto de staging/dev.

---

## 17. Checklist de producción (orden sugerido)

Usar esta lista después de tener Supabase con datos reales o de staging, migración **§16.1** aplicada si la DB era anterior a F13, y superadmin creado (**§13**).

| Orden | Tarea | Documento |
|------|--------|-----------|
| 1 | SQL F13 ejecutado y columnas verificadas | §16.1 |
| 2 | Usuario superadmin | §13 |
| 3 | Dominio `kitdigital.ar` + wildcard `*.kitdigital.ar` en DNS y Vercel | §7 |
| 4 | Todas las env vars en Vercel (alineadas a §8 + `CRON_SECRET` + `NEXT_PUBLIC_WHATSAPP_NUMBER`) | §8, §14, §16.3 |
| 5 | `MP_WEBHOOK_SECRET` en Vercel = secret del webhook en panel MP | §2, §15 |
| 6 | Webhook MP: URL `https://kitdigital.ar/api/webhooks/mercadopago` + eventos del §2 | §2 |
| 7 | `CRON_SECRET` en Vercel (Production + Preview) | §14 |
| 8 | `public/og-image.jpg` 1200×630 en el repo / deploy | §16.2 |
| 9 | Deploy a Production; smoke test: login, admin, billing (sandbox o monto mínimo), compartir link OG | — |
| 10 | Confirmación de email en Auth (cuando abras al público) | §16.7 |
| 11 | Legal / consumidor | §18 |

---

## 18. Legal y Cumplimiento

Checklist obligatorio antes del lanzamiento público:

- [ ] Redactar **Términos y Condiciones del Servicio** (KitDigital como plataforma SaaS)
- [ ] Redactar **Política de Privacidad** (datos de usuarios, tiendas, clientes finales)
- [ ] Incluir datos de contacto para reclamos según **Defensa del Consumidor Argentina** (Ley 24.240)
- [ ] Evaluar si se necesita emitir **factura electrónica (AFIP)** por las suscripciones SaaS cobradas en ARS
- [ ] Incluir cláusula de **procesamiento de datos por terceros** (Supabase, Cloudinary, Mercado Pago, OpenAI)
- [ ] Páginas legales accesibles desde el footer del sitio institucional y el catálogo

---

## 19. F15 — Design Excellence (2026-04-24)

### 19.1 SQL Migrations (OBLIGATORIO — BLOCKER)

Ejecutar en Supabase **SQL Editor** antes de deployar F15. Son las únicas migraciones requeridas para esta fase.

```sql
-- F15: Agregar compare_price a products (precio tachado en vitrine)
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_price INTEGER;

-- Stock en products (si aún no existe en DB anterior)
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER;
```

**Verificación:** ir a **Table Editor** → tabla `products` → confirmar que existen columnas `compare_price` y `stock`.

**schema.sql sincronizado:** ✅ `src/components/admin/product-sheet.tsx` ya incluye ambas columnas en la definición de tabla (línea 223–224).

### 19.2 Pasos de implementación completados (P1.1–P2.4)

✅ **P1.1** — Token counter del asistente (real, no hardcoded a 0)
✅ **P2.1** — `compare_price` end-to-end: validations, handler, ProductSheet, ProductCard
✅ **P2.2** — Trust badges en vitrine (Truck, Shield, RotateCcw)
✅ **P2.3** — Stock badges en ProductCard (Sin stock, Quedan N)
✅ **P2.4** — Ciudad/horarios en settings admin y store-header público

**Build status:** `pnpm build` ✅ sin errores | `pnpm exec tsc --noEmit` ✅ sin errores

### 19.3 Pasos pendientes (P3.1–P5.1 + Bloques 6–9)

**PRIORIDAD 3 — ProductSheet tabs faltantes:**
- [ ] P3.1: Tab Stock (visible si módulo `stock === true`; switch + input numérico)
- [ ] P3.2: Tab Página (visible si módulo `product_page === true`; slug, título SEO, descripción SEO)
- [ ] P3.3: Tab Variantes (visible si módulo `variants === true`; botón link a `/admin/products/{id}/variants`)

**PRIORIDAD 4 — EntityToolbar: conectar filtros**
- [ ] P4.1: Conectar `onApplyFilters` en `orders/page.tsx` (status filter)
- [ ] P4.2: Conectar `onApplyFilters` en `products/page.tsx` (categorías filter)
- [ ] P4.3: Conectar `dateFrom/dateTo` en finance y expenses

**PRIORIDAD 5 — Módulos: toggle grid por grupo**
- [ ] P5.1: Sección Módulos con 7 grupos (Catálogo, Operaciones, Equipo, Comercial, Finanzas, Dominio, IA)

**Bloques 6–9 (sin verificar en F15):**
- [ ] Banners: mejorar UI visual (grid 16:9 con drag-and-drop)
- [ ] Categorías: lista con badge de count + Sheet para crear/editar
- [ ] Asistente: renderizar markdown en mensajes
- [ ] Savings: saldo total + movimientos por cuenta

### 19.4 Testing & Verificación Post-SQL

Después de ejecutar las migraciones en Supabase:

1. Verificar columnas en **Table Editor** (compare_price, stock)
2. `pnpm dev` → navegar a `/admin/products` → crear producto con compare_price > price
3. Verificar vitrine pública: debe mostrar precio tachado + badge % OFF
4. Verificar ProductCard con stock badges (módulo `stock` debe estar activo)
5. Verificar settings admin: campos "Ciudad" y "Horarios" se guardan y aparecen en header público
6. `pnpm build` + `pnpm exec tsc --noEmit` — sin errores

### 19.5 Orden de ejecución recomendado (siguientes sesiones)

1. Ejecutar SQL migration (§19.1) en Supabase ← **BLOCKER para deploy**
2. Implementar P3.1–P3.3 (ProductSheet tabs)
3. Implementar P4.1–P4.3 (EntityToolbar filters)
4. Implementar P5.1 (Módulos grouped)
5. Testing integral en staging
6. Deploy F15 a producción
