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