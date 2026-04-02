# Pasos Manuales — KitDigital.AR

Este documento lista todas las acciones que el desarrollador debe realizar manualmente (fuera del código).
No es código: es configuración de plataformas externas, credenciales y operaciones en dashboards.

**Regla de uso:** ejecutar en el orden indicado. Los pasos anteriores son prerequisitos de los siguientes.

---

## BLOQUE 0 — Cuentas y Servicios Externos

Realizar **una sola vez**, antes de cualquier código.

---

### 0.1 — Supabase

1. Ir a [supabase.com](https://supabase.com) → crear cuenta (o iniciar sesión)
2. Crear nuevo proyecto:
   - **Name:** `kitdigital` (o similar)
   - **Database Password:** elegir una contraseña fuerte y guardarla
   - **Region:** South America (São Paulo)
   - **Plan:** Free tier alcanza para desarrollo
3. Esperar que el proyecto inicialice (~2 minutos)
4. Ir a **Settings → API** y copiar:
   - `Project URL` → será `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → será `SUPABASE_SERVICE_ROLE_KEY` ⚠️ nunca exponer al cliente

---

### 0.2 — Supabase Auth — Configuración inicial

En el dashboard de Supabase:

1. Ir a **Authentication → Providers → Email**:
   - `Enable Email provider`: ON
   - `Confirm email`: ON (obligatorio para producción)
   - `Secure email change`: ON

2. Ir a **Authentication → URL Configuration**:
   - `Site URL`: `http://localhost:3000` (en desarrollo)
   - `Redirect URLs` — agregar:
     - `http://localhost:3000/auth/callback`
     - `https://kitdigital.ar/auth/callback` *(agregar al tener dominio)*
     - `https://*.kitdigital.ar/auth/callback` *(para vitrina pública)*

3. Ir a **Authentication → Email Templates**:
   - `Confirm signup`: personalizar el asunto y remitente si se desea
   - Template de confirmación usa `{{ .ConfirmationURL }}` — mantener ese token

---

### 0.3 — Mercado Pago

1. Ir a [developers.mercadopago.com](https://developers.mercadopago.com) → crear cuenta o iniciar sesión
2. Ir a **Mis aplicaciones → Crear aplicación**:
   - Nombre: `KitDigital`
   - Solución: `Pagos online`
   - Modelo de integración: `Suscripciones`
3. En la aplicación creada, ir a **Credenciales**:
   - **Test credentials** (para desarrollo):
     - `Public Key` → `MP_PUBLIC_KEY`
     - `Access Token` → `MP_ACCESS_TOKEN`
   - **Production credentials** (para producción — ver Bloque 3)
4. En **Webhooks**:
   - URL de notificación: `https://kitdigital.ar/api/webhooks/mercadopago/billing` *(solo para producción)*
   - Para desarrollo local, ver nota en Bloque 2 sobre tunneling
   - Copiar el `Secret` generado → será `MP_WEBHOOK_SECRET`
5. Eventos a activar:
   - `subscription_preapproval`
   - `payment`

---

### 0.4 — Cloudinary

1. Ir a [cloudinary.com](https://cloudinary.com) → crear cuenta gratuita
2. En el **Dashboard**, copiar:
   - `Cloud name` → `CLOUDINARY_CLOUD_NAME` y `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `API Key` → `CLOUDINARY_API_KEY`
   - `API Secret` → `CLOUDINARY_API_SECRET`
3. Ir a **Settings → Upload → Upload presets → Add upload preset**:
   - `Preset name`: `kitdigital_unsigned`
   - `Signing mode`: **Unsigned** *(permite upload desde el navegador sin exponer secrets)*
   - `Folder`: `kitdigital` *(las subcarpetas se crearán por tienda: `kitdigital/{store_id}/products/`)*
   - `Allowed formats`: `jpg,jpeg,png,webp,gif`
   - `Max file size`: `5000000` (5 MB)
   - Guardar → copiar el nombre del preset → será `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

---

### 0.5 — Upstash Redis

1. Ir a [upstash.com](https://upstash.com) → crear cuenta gratuita
2. Ir a **Redis → Create Database**:
   - `Name`: `kitdigital-cache`
   - `Type`: Regional
   - `Region`: South America — São Paulo (o la más cercana a Supabase)
3. Una vez creada, en **Details**:
   - `REST URL` → `UPSTASH_REDIS_REST_URL`
   - `REST Token` → `UPSTASH_REDIS_REST_TOKEN`

---

### 0.6 — OpenAI

1. Ir a [platform.openai.com](https://platform.openai.com) → crear cuenta
2. Ir a **API keys → Create new secret key**:
   - Nombre: `kitdigital-production`
   - Copiar → `OPENAI_API_KEY` ⚠️ solo se muestra una vez
3. Ir a **Billing → Payment methods** → agregar tarjeta de crédito
4. Ir a **Billing → Limits** → configurar:
   - `Monthly budget`: un límite razonable (ej: $50 USD) para evitar sorpresas
   - `Email alerts at`: 75% del límite

---

### 0.7 — Crear el archivo `.env.local`

En la raíz del proyecto, crear el archivo `.env.local` con todos los valores recopilados:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# Mercado Pago
MP_ACCESS_TOKEN=TEST-000000000000000-000000-xxxxxxxxxxxx
MP_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=kitdigital_unsigned
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=000000000000000
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxx

# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=localhost
```

⚠️ **Agregar `.env.local` al `.gitignore`** — nunca debe subir al repositorio.

---

## BLOQUE 1 — Pre-Fase 0 (Base de datos)

Estos pasos se ejecutan **antes del Paso 0.6** del Plan de Desarrollo.

---

### 1.1 — Agregar campo `role` a la tabla `users` en el schema

El middleware de Next.js verifica `users.role === 'superadmin'` para proteger las rutas `/superadmin/*`. Este campo no está en el schema original porque Supabase Auth no lo incluye por defecto.

**En el SQL del schema (Paso 0.6 del Plan), agregar al `CREATE TABLE users`:**
```sql
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'superadmin'));
CREATE INDEX idx_users_role ON users (role) WHERE role = 'superadmin';
```

*(O incluirlo directamente en el `CREATE TABLE users` antes de ejecutar el script)*

---

### 1.2 — Ejecutar el SQL del schema en Supabase

Una vez generado el script SQL en el Paso 0.6 del Plan:

1. Ir a **Supabase Dashboard → SQL Editor → New query**
2. Pegar el script SQL completo
3. Hacer click en **Run**
4. Verificar que no haya errores en los resultados

**Verificación post-ejecución:**
- Ir a **Table Editor** — deben verse las 28 tablas
- Ir a **Authentication → Policies** — deben verse políticas RLS en todas las tablas de dominio
- Verificar específicamente que `billing_webhook_log` **no tiene política RLS** (solo service role)

---

### 1.3 — Crear el trigger para sincronizar `users` con `auth.users`

Supabase Auth crea registros en `auth.users`. Necesitamos sincronizar automáticamente con nuestra tabla `users`:

En **Supabase → SQL Editor**, ejecutar:

```sql
-- Trigger: al crear un usuario en auth.users, crear el perfil en public.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### 1.4 — Ejecutar el seed de planes

La tabla `plans` es la fuente de verdad de los planes de KitDigital. Debe tener datos antes de que cualquier tienda pueda activarse.

En **Supabase → SQL Editor**, ejecutar el seed inicial:

```sql
INSERT INTO plans (id, name, price, max_products, max_orders, ai_tokens, available_modules, module_prices, is_active)
VALUES
  (
    gen_random_uuid(),
    'starter',
    0,        -- demo: gratis
    10,
    20,
    0,
    '["catalog","products","categories","cart","orders"]',
    '{}',
    true
  ),
  (
    gen_random_uuid(),
    'growth',
    1490000,  -- $14.900 ARS/mes (en centavos)
    100,
    500,
    5000,
    '["catalog","products","categories","cart","orders","banners","social","tasks"]',
    '{"stock":49000,"payments":49000,"variants":49000,"finance":99000}',
    true
  ),
  (
    gen_random_uuid(),
    'pro',
    2990000,  -- $29.900 ARS/mes
    -1,       -- ilimitado (-1 = sin límite)
    -1,
    20000,
    '["catalog","products","categories","cart","orders","banners","social","tasks","variants","wholesale","multiuser","custom_domain","product_page"]',
    '{"stock":0,"payments":0,"finance":0,"savings_account":0,"expenses":0,"assistant":0}',
    true
  );
```

⚠️ **Ajustar los precios** según la definición actual del negocio antes de ejecutar en producción.

---

### 1.5 — Crear el usuario superadmin inicial

Una vez implementada la autenticación (Paso 1.1 del Plan):

1. Registrarse normalmente en la app con el email de superadmin
2. Ir a **Supabase → SQL Editor** y ejecutar:

```sql
UPDATE users
SET role = 'superadmin'
WHERE email = 'tu-email@ejemplo.com';
```

3. Verificar que el acceso a `/superadmin` funciona desde la app

---

## BLOQUE 2 — Durante Fase 1 (Development)

---

### 2.1 — Configurar webhook de MP para desarrollo local

MP no puede enviar webhooks a `localhost`. Para testear localmente:

**Opción A — ngrok (recomendado):**
```bash
npx ngrok http 3000
# Copiar la URL pública (ej: https://xxxx.ngrok.io)
```
- Ir a MP → tu aplicación → Webhooks
- URL: `https://xxxx.ngrok.io/api/webhooks/mercadopago/billing`
- ⚠️ La URL de ngrok cambia cada vez que reinicias. Actualizar en MP cada vez.

**Opción B — MP Sandbox:**
- Usar el simulador de pagos de MP en [sandbox.mercadopago.com.ar](https://sandbox.mercadopago.com.ar)
- Las credenciales TEST-xxx son solo para sandbox

---

### 2.2 — Configurar subdominio local para desarrollo

Para que `{slug}.localhost:3000` funcione, **no se necesita configuración en la mayoría de los casos** en macOS/Linux. En Windows, puede requerir editar el archivo `hosts`:

1. Abrir como administrador: `C:\Windows\System32\drivers\etc\hosts`
2. Agregar entradas de prueba:
   ```
   127.0.0.1 mitienda.localhost
   127.0.0.1 otra-tienda.localhost
   ```

Alternativamente, usar `localhost:3000/[slug]` como fallback durante el desarrollo y activar la resolución por subdominio solo en producción.

---

## BLOQUE 3 — Fase 3 (Billing en Producción)

---

### 3.1 — Obtener credenciales de producción de MP

Una vez que el billing está implementado y testeado con el sandbox:

1. Ir a **MP → Mis aplicaciones → KitDigital → Credenciales de producción**
2. Completar el proceso de activación de la cuenta (puede requerir datos fiscales)
3. Copiar las credenciales de producción (reemplazarán las TEST- en producción):
   - `Access Token (production)` → actualizar `MP_ACCESS_TOKEN` en Vercel
   - `Public Key (production)` → actualizar `MP_PUBLIC_KEY` en Vercel

---

### 3.2 — Registrar productos/planes en Mercado Pago

Mercado Pago Suscripciones (PreApproval) **no requiere registrar planes previamente** — la suscripción se crea dinámicamente en cada alta. Sin embargo, puede ser útil:

- Verificar en el sandbox que los cobros recurrentes funcionen
- Realizar un test end-to-end con una tarjeta de prueba de MP antes de ir a producción
- Tarjetas de prueba: [developers.mercadopago.com/es/docs/checkout-api/additional-content/your-integrations/test/cards](https://developers.mercadopago.com/es/docs/checkout-api/additional-content/your-integrations/test/cards)

---

## BLOQUE 4 — Deploy a Producción (Vercel)

---

### 4.1 — Crear proyecto en Vercel

1. Ir a [vercel.com](https://vercel.com) → conectar cuenta de GitHub
2. **Add New → Project → Import Git Repository**
3. Seleccionar el repositorio de KitDigital
4. Configurar:
   - `Framework Preset`: Next.js (auto-detectado)
   - `Root Directory`: `/` (raíz)
   - `Build Command`: `npm run build` (default)
   - `Output Directory`: `.next` (default)
5. **No hacer deploy aún** — primero configurar las variables de entorno (Paso 4.2)

---

### 4.2 — Variables de entorno en Vercel

En **Vercel → Project → Settings → Environment Variables**, agregar todas las variables de producción:

| Variable | Entorno | Valor |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | service role key ⚠️ |
| `MP_ACCESS_TOKEN` | Production | token de producción de MP |
| `MP_PUBLIC_KEY` | Production | public key de producción |
| `MP_WEBHOOK_SECRET` | Production | secret del webhook |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Production, Preview | cloud name |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Production, Preview | preset unsigned |
| `CLOUDINARY_CLOUD_NAME` | Production | cloud name |
| `CLOUDINARY_API_KEY` | Production | API key |
| `CLOUDINARY_API_SECRET` | Production | API secret ⚠️ |
| `UPSTASH_REDIS_REST_URL` | Production | URL de Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Production | token de Redis ⚠️ |
| `OPENAI_API_KEY` | Production | API key ⚠️ |
| `NEXT_PUBLIC_APP_URL` | Production | `https://kitdigital.ar` |
| `NEXT_PUBLIC_APP_DOMAIN` | Production | `kitdigital.ar` |

⚠️ Las marcadas son secretas — activar `Sensitive` en Vercel para que no aparezcan en logs.

---

### 4.3 — Comprar y configurar el dominio

1. Comprar `kitdigital.ar` en [nic.ar](https://nic.ar) u otro registrar argentino
2. En **Vercel → Project → Settings → Domains**:
   - Agregar `kitdigital.ar`
   - Agregar `*.kitdigital.ar` (wildcard para subdominios de las tiendas)
3. En el registrar del dominio, configurar los **DNS records** que Vercel indique:
   - Normalmente: CNAME `cname.vercel-dns.com` o A record a la IP de Vercel
   - Para wildcard: agregar `*.kitdigital.ar` apuntando al mismo destino

4. Verificar propagación DNS (puede tomar hasta 48 horas):
   ```bash
   nslookup tienda-prueba.kitdigital.ar
   # Debe resolver a los IPs de Vercel
   ```

5. Vercel emite certificados SSL automáticamente para el dominio principal y wildcard (Let's Encrypt)

---

### 4.4 — Configurar Supabase Auth para producción

En Supabase Dashboard, actualizar URLs de producción:

1. **Authentication → URL Configuration**:
   - `Site URL`: `https://kitdigital.ar`
   - `Redirect URLs` — agregar:
     - `https://kitdigital.ar/auth/callback`
     - `https://*.kitdigital.ar/auth/callback`

2. **Authentication → SMTP Settings** (opcional pero recomendado):
   - Configurar un SMTP propio (SendGrid, Resend, etc.) para los emails de confirmación
   - Sin SMTP propio, Supabase usa su dominio `supabase.io` con límites bajos (4 emails/hora en free tier)

---

### 4.5 — Actualizar webhook de Mercado Pago para producción

1. Ir a **MP → Mis aplicaciones → KitDigital → Webhooks**
2. Actualizar URL:
   - `https://kitdigital.ar/api/webhooks/mercadopago/billing`
3. Verificar que el `MP_WEBHOOK_SECRET` en Vercel coincide con el secret de MP
4. Usar el botón "Test" del panel de MP para enviar un webhook de prueba y verificar que recibe `200 OK`

---

### 4.6 — Primer deploy y verificación

1. En Vercel, hacer trigger del primer deploy (o hacer push al branch `main`)
2. Verificar el build log — no debe haber errores de TypeScript ni variables de entorno faltantes
3. Checklist de verificación post-deploy:
   - [ ] `https://kitdigital.ar` carga la landing
   - [ ] `https://kitdigital.ar/registro` funciona, llega el email de confirmación
   - [ ] `https://kitdigital.ar/login` funciona, la sesión persiste
   - [ ] Crear una tienda de prueba → `https://mi-tienda.kitdigital.ar` carga la vitrina
   - [ ] `/superadmin` redirige sin sesión, y da 403 con usuario sin rol

---

## BLOQUE 5 — Supabase Edge Functions (Cron Jobs)

Los cron jobs del lifecycle de tiendas se implementan como Supabase Edge Functions.

---

### 5.1 — Instalar Supabase CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref tu-project-ref
```

El `project-ref` se encuentra en **Supabase → Settings → General**.

---

### 5.2 — Deploy de Edge Functions

Una vez implementadas las Edge Functions en el Paso 3.4 del Plan:

```bash
# Deploy de cada función
supabase functions deploy check_trial_expiry
supabase functions deploy archive_inactive_stores
supabase functions deploy cleanup_assistant_sessions
```

---

### 5.3 — Configurar schedules de los cron jobs

En **Supabase Dashboard → Database → Extensions**, habilitar `pg_cron`.

Luego en **SQL Editor**:

```sql
-- Verificar trials vencidos: diario a las 00:00 UTC
SELECT cron.schedule(
  'check-trial-expiry',
  '0 0 * * *',
  $$ SELECT net.http_post(
    url := 'https://tu-project-ref.supabase.co/functions/v1/check_trial_expiry',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);

-- Archivar tiendas inactivas: diario a las 12:00 UTC
SELECT cron.schedule(
  'archive-inactive-stores',
  '0 12 * * *',
  $$ SELECT net.http_post(
    url := 'https://tu-project-ref.supabase.co/functions/v1/archive_inactive_stores',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);

-- Limpiar sesiones del asistente: diario a las 03:00 UTC
SELECT cron.schedule(
  'cleanup-assistant-sessions',
  '0 3 * * *',
  $$ SELECT net.http_post(
    url := 'https://tu-project-ref.supabase.co/functions/v1/cleanup_assistant_sessions',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  ) $$
);
```

Reemplazar `tu-project-ref` y `SERVICE_ROLE_KEY` con los valores reales.

---

## BLOQUE 6 — Monitoreo (Fase 5)

---

### 6.1 — Sentry (o similar)

1. Crear cuenta en [sentry.io](https://sentry.io)
2. Crear nuevo proyecto → Next.js
3. Copiar el `DSN` → agregar a Vercel como `SENTRY_DSN`
4. Instalar y configurar según el Paso 5.4 del Plan

---

### 6.2 — Alertas críticas en Upstash

En **Upstash → tu database → Alerts**:
- Configurar alerta si la latencia supera 500ms
- Configurar alerta si se supera el 80% de la memoria (free tier: 256MB)

---

## Resumen Ejecutivo — Orden de Ejecución

| Momento | Pasos |
|---------|-------|
| Antes de escribir código | Bloque 0 completo (0.1 → 0.7) |
| Antes del Paso 0.6 del Plan | Bloque 1.1 (campo `role` en users) |
| Durante Paso 0.6 del Plan | Bloques 1.2, 1.3 |
| Después del Paso 0.6 | Bloque 1.4 (seed de planes) |
| Después de Paso 1.1 (auth) | Bloque 1.5 (crear superadmin) |
| Durante Fase 1 (desarrollo) | Bloque 2 completo |
| Antes de Fase 3 | Bloque 3 (credenciales MP producción) |
| Al terminar Fase 5 | Bloque 4 completo (deploy) + Bloque 5 (cron jobs) |
| Post-deploy | Bloque 6 (monitoreo) |

---

## Variables de Entorno — Lista Completa

Lista unificada de todas las variables de entorno del proyecto (incluyendo las que faltan en el PLAN-DE-DESARROLLO.md original):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mercado Pago
MP_ACCESS_TOKEN=
MP_PUBLIC_KEY=
MP_WEBHOOK_SECRET=

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=   ← faltaba en PLAN-DE-DESARROLLO.md
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# OpenAI
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=localhost
```

**Total: 16 variables de entorno.**
