# KitDigital.ar — CLAUDE.md

## Overview

SaaS multitenant modular para catálogos digitales con carrito WhatsApp, orientado a emprendedores y PyMEs de Argentina y Latinoamérica. Cada tienda tiene vitrina pública (`{slug}.kitdigital.ar`) y un panel de gestión con módulos activables por plan.

---

## Tech Stack

| Capa | Tecnología |
|------|------------|
| Runtime | Node 22 + **pnpm** (nunca npm ni yarn) |
| Framework | Next.js 15, App Router, TypeScript estricto |
| UI | **Tailwind CSS v3** (fijar `"tailwindcss": "^3"`), shadcn/ui, next-themes |
| Data fetching | TanStack Query v5 |
| Estado UI | Zustand |
| Formularios | React Hook Form + Zod |
| Base de datos | Supabase (PostgreSQL 15 + Auth + RLS + Realtime) |
| Caché | Upstash Redis |
| Imágenes | Cloudinary (upload unsigned, path `kitdigital/{store_id}/...`) |
| Billing | Mercado Pago Suscripciones |
| Email | Resend |
| IA | OpenAI (GPT-4o-mini) |
| Deploy | Vercel, wildcard subdomains `*.kitdigital.ar` |

---

## Project Structure

```
src/
├── app/
│   ├── (public)/[slug]/          # Vitrina pública (SSR + ISR)
│   ├── (admin)/admin/            # Panel de gestión (SPA, Client Components)
│   ├── (superadmin)/superadmin/  # Panel interno
│   └── api/webhooks/mercadopago/ # Webhook handler billing
├── components/
│   ├── ui/          # shadcn/ui base
│   ├── admin/       # Componentes del panel
│   ├── public/      # Componentes de la vitrina
│   └── shared/      # DataTable, EmptyState, ErrorState, ModuleGate, etc.
├── lib/
│   ├── supabase/    # client.ts | server.ts | service-role.ts
│   ├── executor/    # index.ts (pipeline 10 pasos) | registry.ts
│   ├── hooks/       # TanStack Query hooks por módulo
│   ├── stores/      # Zustand stores (cart, modal, etc.)
│   ├── validations/ # Zod schemas
│   ├── db/queries/  # Queries de lectura directa
│   └── types/       # database.ts (generado) + index.ts (tipos derivados)
└── middleware.ts    # Resolución multitenant + protección de rutas
```

---

## Architecture & Decisions

### Multitenant
- En **prod**: tienda resuelta por subdominio (`Host` header → `{slug}.kitdigital.ar`) o `custom_domain`.
- En **dev** (`NODE_ENV=development`): resolución por path (`localhost:3000/{slug}/*`). Sin hosts file, sin lvh.me.
- `store_id` se resuelve **siempre en servidor**. Nunca del cliente.

### Executor — Motor Central
Toda operación de dominio pasa por `executor({ name, store_id, actor, input })`. Pipeline de 10 pasos:
`resolver handler → validar tienda → validar actor → validar módulos → validar límites → validar input → ejecutar (transacción) → emitir evento → invalidar caché → retornar`.
- Si falla cualquier paso, retorna error y se detiene.
- El executor usa `supabaseServiceRole` para insertar en `events` (necesario por RLS nullable).
- Registry en `src/lib/executor/registry.ts` es la única fuente ejecutable de actions.

### RLS
- Todas las tablas de dominio tienen RLS habilitado.
- Política base: `store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())`.
- Vitrina pública: SELECT sin auth en productos/categorías/banners activos de tiendas `demo|active|past_due`.
- Superadmin bypasea RLS via `service_role`.

### Módulos
- 20 módulos, agrupados en CORE (siempre activos) y opcionales.
- Cada módulo escribe **solo en sus propias tablas**.
- `system/modules.md` es la referencia de diseño; el registry es la referencia ejecutable.

### Eventos
- Los eventos son **inmutables**. Una vez insertados, no se modifican.
- Siempre registran `actor_type` (`user | superadmin | system | ai`).

---

## Coding Standards

- **Sin `any` en TypeScript.** Siempre.
- **Mobile-first** en todos los componentes UI.
- Toda entidad de dominio tiene `store_id`. Toda query filtra por `store_id`.
- Server Actions invocan el executor, nunca la DB directamente.
- Nombres de actions en snake_case: `create_product`, `update_order_status`.
- Hooks de TanStack Query con `queryKey: [entidad, store_id, filtros]`.
- Invalidaciones declaradas en el handler (campo `invalidates`), no en la UI.
- Commits: mensajes en español o inglés, descriptivos, en presente (`Add`, `Fix`, `Update`).
- `pnpm-lock.yaml` siempre commiteado.

---

## Workflow Rules

> Seguir siempre, sin excepción.

1. **Inicio de sesión:** leer `ESTADO.md` → identificar fase/paso actual → leer el paso en `PLAN.md` → leer los archivos de `system/` que el paso referencia → recién entonces implementar.
2. **Antes de cualquier tarea que toque más de 3 archivos:** entrar en Plan Mode, mostrar el plan completo y esperar confirmación.
3. **Nunca avanzar al siguiente paso** sin cumplir los criterios de aceptación del paso actual.
4. **Fin de sesión:** verificar `pnpm build` + `pnpm exec tsc --noEmit` sin errores → actualizar `ESTADO.md` (pasos completados, decisiones, blockers, qué sigue).
5. **El paso 0.4** (ejecutar `schema.sql`) es manual y bloqueante — el agente no avanza a 0.5 hasta que el humano confirme en `ESTADO.md`.
6. **La IA no ejecuta acciones de dominio directamente**; siempre pasa por el executor.
7. **`system/` es la Single Source of Truth.** Si algo no está ahí, no existe.
8. **No hacer cambios especulativos.** Solo lo que el paso actual indica. Sin features extra, sin refactors no pedidos.

---

## Documentation Management

| Archivo | Rol |
|---------|-----|
| `START.md` | Protocolo de inicio/fin, reglas innegociables, plantillas de código |
| `PLAN.md` | Orden de ejecución con criterios de aceptación |
| `ESTADO.md` | Estado vivo del progreso — actualizar al terminar cada sesión |
| `PASOS-MANUALES.md` | Tareas que solo puede hacer el humano (servicios externos, SQL, DNS) |
| `schema.sql` | Fuente de verdad del esquema de DB (30 tablas, RLS, triggers, seeds) |
| `system/` | Especificación canónica por dominio (executor, modules, auth, billing, frontend, realtime, tools, domain, superadmin) |
| `CLAUDE.md` | Este archivo — contexto de sesión para el agente IA |

**Regla de conflicto:** ante contradicción entre documentos, la prioridad es `system/` > `PLAN.md` > `ESTADO.md` > todo lo demás.
