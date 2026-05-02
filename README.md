# KitDigital.ar

SaaS multitenant modular para catálogos digitales + carrito WhatsApp, mobile-first, para emprendedores y PyMEs de Argentina y Latinoamérica.

## Stack Tecnológico
- Runtime: Node 22 + pnpm (lockfile: `pnpm-lock.yaml`)
- Framework: Next.js (App Router) + TypeScript estricto
- UI: Tailwind CSS v3 + componentes UI internos
- Data fetching: TanStack Query v5
- Estado UI: Zustand
- Formularios: React Hook Form + Zod
- Base de datos: Supabase (PostgreSQL + Auth + RLS + Realtime)
- Caché: Upstash Redis
- Imágenes: Cloudinary
- Billing: Mercado Pago
- Deploy: Vercel

## Navegación del Repo
- Guía maestra de desarrollo y fases: `START.md`
- Schema idempotente para Supabase SQL Editor: `schema.sql`

## Comandos útiles

```bash
pnpm install
pnpm dev
pnpm tsc --noEmit
pnpm lint
```

## Variables de Entorno

| Variable | Servicio |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `MP_ACCESS_TOKEN` | Mercado Pago |
| `MP_PUBLIC_KEY` | Mercado Pago |
| `MP_WEBHOOK_SECRET` | Mercado Pago |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary |
| `UPSTASH_REDIS_REST_URL` | Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash |
| `OPENAI_API_KEY` | OpenAI |
| `RESEND_API_KEY` | Resend (email transaccional) |
| `NEXT_PUBLIC_APP_URL` | App |
| `NEXT_PUBLIC_APP_DOMAIN` | App (ej: kitdigital.ar) |

## Nombres Oficiales del Producto

- **Producto**: kitdigital.ar
- **Catálogo público**: Catálogo
- **Banner principal**: Portada
- **Módulos activables**: Módulos
- **Panel de gestión**: Panel

## Estado Actual
Ver `START.md` para el plan de trabajo actualizado.

## Licencia

Privado — Todos los derechos reservados.
