# KitDigital.ar

SaaS multitenant modular para catálogos digitales + carrito WhatsApp, mobile-first, para emprendedores y PyMEs de Argentina y Latinoamérica.

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Runtime | Node 22 + pnpm (lockfile: `pnpm-lock.yaml`, siempre commitear) |
| Framework | Next.js 15 (App Router), TypeScript estricto |
| UI | Tailwind CSS v3, shadcn/ui, next-themes |
| Data fetching | TanStack Query v5 |
| Estado UI | Zustand |
| Formularios | React Hook Form + Zod |
| Íconos | Lucide React |
| Base de datos | Supabase (PostgreSQL + Auth + RLS + Realtime) |
| Caché | Upstash Redis |
| Imágenes | Cloudinary (upload unsigned) |
| Billing SaaS | Mercado Pago Suscripciones |
| Deploy | Vercel (wildcard subdomains) |

## Navegación del Repo

| Si necesitás... | Leé... |
|----------------|--------|
| Empezar a trabajar como agente IA | `START.md` |
| Saber en qué fase/paso estamos | `ESTADO.md` |
| Entender qué construir y en qué orden | `PLAN.md` |
| Configurar servicios externos manualmente | `PASOS-MANUALES.md` |
| Ejecutar el SQL en Supabase | `schema.sql` |
| Entender el dominio, reglas y naming | `system/domain.md` |
| Ver los 20 módulos del sistema | `system/modules.md` |
| Ver herramientas reutilizables | `system/tools.md` |
| Entender la reactividad y caché | `system/realtime.md` |
| Entender el executor (motor central) | `system/executor.md` |
| Reglas de frontend y estructura | `system/frontend.md` |
| Billing, planes y Mercado Pago | `system/billing.md` |
| Roles, permisos y autenticación | `system/auth.md` |
| Panel de superadmin | `system/superadmin.md` |

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
| `SUPERADMIN_ALLOWED_IPS` | Opcional: IPs permitidas para `/superadmin/*` (lista separada por comas) |
| `NEXT_PUBLIC_APP_URL` | App |
| `NEXT_PUBLIC_APP_DOMAIN` | App (ej: kitdigital.ar) |

## Nombres Oficiales del Producto

- **Producto**: KitDigital.ar
- **Catálogo público**: Catálogo
- **Banner principal**: Portada
- **Módulos activables**: Módulos
- **Panel de gestión**: Panel

## Estado Actual

Ver `ESTADO.md` para el estado actualizado del proyecto.

## Licencia

Privado — Todos los derechos reservados.
