# Vercel — Restricciones y Configuración

> Guía operativa de Vercel para este stack específico.
> Lo que no sabe un agente IA sobre Vercel que puede romper el deploy.

---

## Stack en producción

| Servicio | URL | Plan requerido |
|---------|-----|---------------|
| Vercel (frontend + API) | kitdigital.ar | Hobby (dev) / Pro (prod wildcard) |
| Dominio principal | kitdigital.ar | DNS configurado → Vercel |
| Wildcard de tiendas | *.kitdigital.ar | **Pro plan** de Vercel obligatorio |

---

## ⚠️ Gotcha crítico: Wildcard Domains requieren Pro

Los subdominios `{slug}.kitdigital.ar` para las vitrinas públicas **no funcionan en el plan Hobby de Vercel**.

**En desarrollo local:** usar el patrón `/{slug}` como ruta en vez de subdominios.
**En producción:** configurar en Vercel:
1. Dashboard → Project → Settings → Domains
2. Agregar `*.kitdigital.ar` como dominio wildcard
3. Configurar en el DNS del dominio: `CNAME *.kitdigital.ar → cname.vercel-dns.com`

---

## Runtimes: Edge vs. Node.js

Vercel tiene dos runtimes para funciones serverless:

| Runtime | Middleware | API Routes | Límite |
|---------|-----------|-----------|--------|
| **Edge** (V8 isolates) | ✅ Por defecto | Opcional con `export const runtime = 'edge'` | Sin `fs`, sin `crypto` nativo, sin Buffer |
| **Node.js** | ❌ | ✅ Por defecto | Acceso completo a Node APIs |

### Reglas para este proyecto

**Middleware (`src/middleware.ts`) → Edge Runtime (obligatorio)**
- El middleware de Next.js siempre corre en Edge
- NO puede usar `fs`, `child_process`, ni importar módulos que los usen
- El cliente de Supabase para middleware (`@supabase/ssr`) es compatible con Edge
- `@upstash/redis` también es compatible con Edge

**API Routes (`src/app/api/**`) → Node.js Runtime (default)**
- El webhook handler de Mercado Pago necesita `crypto` → usa Node.js
- NO agregar `export const runtime = 'edge'` al webhook handler

**Server Actions y Server Components → Node.js Runtime (default)**
- El cliente de Supabase para servidor (`@supabase/ssr` con `cookies()`) requiere Node.js
- El executor central requiere Node.js

---

## Timeouts de funciones serverless

| Plan Vercel | Timeout máximo |
|------------|---------------|
| Hobby | 10 segundos |
| Pro | 60 segundos |
| Enterprise | 900 segundos |

**Implicaciones para este proyecto:**
- El webhook handler de Mercado Pago: puede tardar 3-5s (llamada a MP API + DB). OK en Hobby.
- El endpoint del asistente IA (`/api/assistant`): puede tardar 8-15s (OpenAI). **Requiere Pro o streaming.**
- Los Server Actions normales: < 3s. OK en Hobby.

**Solución para el asistente IA:** usar streaming con `ReadableStream` para no llegar al timeout.

---

## Variables de entorno en Vercel

### Configurar en Dashboard

1. Ir a Project → Settings → Environment Variables
2. Agregar TODAS las variables de `/dev/infra/env-vars.md`
3. Configurar para los environments correspondientes:

| Variable | Development | Preview | Production |
|----------|------------|---------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ |
| `MP_ACCESS_TOKEN` | Test key | Test key | **Live key** |
| `MP_PUBLIC_KEY` | Test key | Test key | **Live key** |
| `MP_WEBHOOK_SECRET` | Test secret | Test secret | **Live secret** |
| `CLOUDINARY_*` | ✅ mismo | ✅ mismo | ✅ mismo |
| `UPSTASH_*` | ✅ mismo | ✅ mismo | ✅ mismo |
| `OPENAI_API_KEY` | ✅ mismo | ✅ mismo | ✅ mismo |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://preview-*.vercel.app` | `https://kitdigital.ar` |
| `NEXT_PUBLIC_APP_DOMAIN` | `localhost` | `vercel.app` | `kitdigital.ar` |

### Regla de `NEXT_PUBLIC_*`

Solo las variables que el **browser** necesita llevan el prefijo `NEXT_PUBLIC_`.
**NUNCA** usar `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — ese key es solo servidor.

---

## `next.config.ts` recomendado

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudinary — imágenes de productos y logos
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Supabase Storage — si se usa para avatares u otros assets
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },

  // Logging de fetch en desarrollo
  logging: {
    fetches: { fullUrl: true },
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ]
  },
}

export default nextConfig
```

---

## ISR (Incremental Static Regeneration) en la vitrina

Las páginas de vitrina pública usan ISR para que Vercel las cachee:

```typescript
// src/app/(public)/[slug]/page.tsx y layout.tsx
export const revalidate = 60 // segundos
```

**Implicación:** un cambio en productos o config de la tienda puede tardar hasta 60 segundos en verse en la vitrina. Esto es intencional para el rendimiento.

**Invalidación on-demand (Fase 5):** cuando se use Redis cache + `revalidatePath`, los cambios se propagan más rápido.

---

## Deploy manual vs. automático

**Automático (recomendado):**
- Conectar el repo de GitHub a Vercel
- Cada push a `main` → deploy a producción
- Cada pull request → deploy de preview

**Manual:**
```bash
npx vercel --prod
```

---

## Checklist pre-deploy a producción

- [ ] Todas las env vars configuradas en Vercel (Production environment)
- [ ] `MP_ACCESS_TOKEN` y `MP_PUBLIC_KEY` son las **credenciales de producción** de MP
- [ ] Dominio `kitdigital.ar` apunta a Vercel en el DNS
- [ ] Wildcard `*.kitdigital.ar` configurado en Vercel (plan Pro) y DNS
- [ ] URL de webhook de MP apunta a `https://kitdigital.ar/api/webhooks/mercadopago/billing`
- [ ] `NEXT_PUBLIC_APP_URL=https://kitdigital.ar` en las env vars de Production
- [ ] `NEXT_PUBLIC_APP_DOMAIN=kitdigital.ar` en las env vars de Production
- [ ] `npm run build` pasa localmente antes de hacer push
- [ ] Sin errores en los logs del primer deploy
