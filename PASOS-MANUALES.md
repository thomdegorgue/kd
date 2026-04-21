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
   - `MP_WEBHOOK_SECRET` en `.env.local`

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
3. Configurar dominio: `kitdigital.ar`
4. Configurar wildcard DNS: `*.kitdigital.ar` → CNAME de Vercel
5. Habilitar wildcard subdomains en Vercel (Settings → Domains)

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

## 11. Legal y Cumplimiento

Checklist obligatorio antes del lanzamiento público:

- [ ] Redactar **Términos y Condiciones del Servicio** (KitDigital como plataforma SaaS)
- [ ] Redactar **Política de Privacidad** (datos de usuarios, tiendas, clientes finales)
- [ ] Incluir datos de contacto para reclamos según **Defensa del Consumidor Argentina** (Ley 24.240)
- [ ] Evaluar si se necesita emitir **factura electrónica (AFIP)** por las suscripciones SaaS cobradas en ARS
- [ ] Incluir cláusula de **procesamiento de datos por terceros** (Supabase, Cloudinary, Mercado Pago, OpenAI)
- [ ] Páginas legales accesibles desde el footer del sitio institucional y el catálogo
