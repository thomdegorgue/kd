# Variables de Entorno — Referencia Completa

> Todas las variables del proyecto con descripción y dónde obtenerlas.
> Crear `.env.local` en la raíz del proyecto con estos valores.
> **`.env.local` nunca va al repositorio** (está en `.gitignore`).

---

## `.env.local` completo

```env
# ─── SUPABASE ─────────────────────────────────────────────────────────────────
# Dashboard → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://{ref}.supabase.co

# Dashboard → Settings → API → anon public
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Dashboard → Settings → API → service_role ⚠️ NUNCA exponer al cliente
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ─── MERCADO PAGO ─────────────────────────────────────────────────────────────
# Dashboard MP → Mis aplicaciones → KitDigital → Credenciales
# En desarrollo: usar credenciales de TEST
# En producción: usar credenciales de PRODUCCIÓN (cambiar en Vercel)
MP_ACCESS_TOKEN=TEST-xxx  # o APP_USR-xxx en producción
MP_PUBLIC_KEY=TEST-xxx    # o APP_USR-xxx en producción

# Webhook secret — Dashboard MP → Webhooks → Secret del webhook
MP_WEBHOOK_SECRET=xxx

# ─── CLOUDINARY ───────────────────────────────────────────────────────────────
# Dashboard Cloudinary → Settings → Access Keys
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=kitdigital_products

CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# ─── UPSTASH REDIS ────────────────────────────────────────────────────────────
# Console Upstash → Redis → tu database → REST API
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ─── OPENAI ───────────────────────────────────────────────────────────────────
# platform.openai.com → API Keys
OPENAI_API_KEY=sk-xxx

# ─── APP ──────────────────────────────────────────────────────────────────────
# Desarrollo local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_DOMAIN=localhost

# Producción (cambiar en Vercel env vars)
# NEXT_PUBLIC_APP_URL=https://kitdigital.ar
# NEXT_PUBLIC_APP_DOMAIN=kitdigital.ar
```

---

## Descripción detallada

| Variable | Scope | Descripción | Dónde obtener |
|----------|-------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente + Servidor | URL del proyecto Supabase | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente + Servidor | Key pública de Supabase (RLS activo) | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo Servidor | Key con permisos de admin (bypasea RLS) | Supabase Dashboard → Settings → API |
| `MP_ACCESS_TOKEN` | Solo Servidor | Token de acceso de Mercado Pago | MP Dashboard → Credenciales |
| `MP_PUBLIC_KEY` | Cliente (futuro) | Key pública de MP | MP Dashboard → Credenciales |
| `MP_WEBHOOK_SECRET` | Solo Servidor | Secret para verificar firma HMAC de webhooks | MP Dashboard → Webhooks |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cliente + Servidor | Nombre del cloud en Cloudinary | Cloudinary Dashboard |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cliente | Preset de upload sin firma | Cloudinary → Settings → Upload Presets |
| `CLOUDINARY_CLOUD_NAME` | Solo Servidor | Mismo que `NEXT_PUBLIC_` pero para SDK server | Cloudinary Dashboard |
| `CLOUDINARY_API_KEY` | Solo Servidor | API Key de Cloudinary | Cloudinary → Settings → Access Keys |
| `CLOUDINARY_API_SECRET` | Solo Servidor | API Secret de Cloudinary | Cloudinary → Settings → Access Keys |
| `UPSTASH_REDIS_REST_URL` | Solo Servidor | URL de la instancia Redis de Upstash | Upstash Console → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Solo Servidor | Token REST de Upstash | Upstash Console → REST API |
| `OPENAI_API_KEY` | Solo Servidor | API Key de OpenAI | platform.openai.com → API Keys |
| `NEXT_PUBLIC_APP_URL` | Cliente + Servidor | URL base de la aplicación | Manual |
| `NEXT_PUBLIC_APP_DOMAIN` | Cliente + Servidor | Dominio base (sin `https://`) | Manual |

---

## Reglas de seguridad

**NUNCA:**
- Poner `SUPABASE_SERVICE_ROLE_KEY` en una variable `NEXT_PUBLIC_*`
- Poner `MP_ACCESS_TOKEN` en una variable `NEXT_PUBLIC_*`
- Poner `OPENAI_API_KEY` en una variable `NEXT_PUBLIC_*`
- Commitar `.env.local` al repositorio
- Loggear variables de entorno sensibles con `console.log`

**Las variables `NEXT_PUBLIC_*`** son embebidas en el bundle del browser en build time. Cualquier usuario puede verlas en el código fuente del navegador.

---

## `.gitignore` mínimo requerido

```gitignore
# Variables de entorno
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Next.js
.next/
out/

# Node
node_modules/
```

---

## Verificación de variables en código

```typescript
// Para verificar en startup que todas las vars están configuradas
// src/lib/env.ts
function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Variable de entorno requerida no configurada: ${key}`)
  }
  return value
}

// Usar en lugar de process.env directamente para errores descriptivos
export const env = {
  supabaseUrl:     requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  // ... solo las que se necesitan
}
```

---

## Estados de configuración por fase

| Fase | Variables necesarias para arrancar |
|------|-----------------------------------|
| F0 — Fundación | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| F1 — Producto base | + `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `CLOUDINARY_*` |
| F3 — Billing | + `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET` |
| F5 — Performance | + `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| F6 — IA | + `OPENAI_API_KEY` |
