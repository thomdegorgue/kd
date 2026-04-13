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

## 2. Mercado Pago

1. Crear aplicación en [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Copiar `Access Token` → `MP_ACCESS_TOKEN`
3. Copiar `Public Key` → `MP_PUBLIC_KEY`
4. Configurar webhook:
   - URL: `https://{tu-dominio}/api/webhooks/mercadopago/billing`
   - Eventos: `payment`, `subscription_preapproval`
5. Copiar el secret del webhook → `MP_WEBHOOK_SECRET`

## 3. Cloudinary

1. Crear cuenta en [cloudinary.com](https://cloudinary.com)
2. Copiar `Cloud Name` → `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
3. Ir a Settings → Upload → Upload presets
4. Crear preset **unsigned** con nombre `kitdigital`
5. Configurar carpeta base: `kitdigital`
6. `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` = `kitdigital`

## 4. Upstash Redis

1. Crear base de datos en [upstash.com](https://upstash.com)
2. Región: **São Paulo** (sa-east-1)
3. Copiar `UPSTASH_REDIS_REST_URL`
4. Copiar `UPSTASH_REDIS_REST_TOKEN`

## 5. OpenAI

1. Crear API key en [platform.openai.com](https://platform.openai.com)
2. Copiar → `OPENAI_API_KEY`
3. Configurar límites de uso en el dashboard de OpenAI

## 6. Resend (Email Transaccional)

1. Crear cuenta en [resend.com](https://resend.com)
2. Agregar y verificar dominio de envío (ej: `kitdigital.ar`) en Settings → Domains
3. Crear API key → `RESEND_API_KEY`
4. Usos: invitaciones multiusuario, confirmación de email, notificaciones de billing

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

## 11. Legal y Cumplimiento

Checklist obligatorio antes del lanzamiento público:

- [ ] Redactar **Términos y Condiciones del Servicio** (KitDigital como plataforma SaaS)
- [ ] Redactar **Política de Privacidad** (datos de usuarios, tiendas, clientes finales)
- [ ] Incluir datos de contacto para reclamos según **Defensa del Consumidor Argentina** (Ley 24.240)
- [ ] Evaluar si se necesita emitir **factura electrónica (AFIP)** por las suscripciones SaaS cobradas en ARS
- [ ] Incluir cláusula de **procesamiento de datos por terceros** (Supabase, Cloudinary, Mercado Pago, OpenAI)
- [ ] Páginas legales accesibles desde el footer del sitio institucional y la vitrina
