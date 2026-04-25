# Auditoría Final — KitDigital.ar

**Fecha:** 2026-04-25  
**Objetivo:** revisión general de arquitectura, coherencia de producto/UI, seguridad, performance (incluyendo memoria), operación y riesgos antes/durante producción.  
**Fuente de verdad consultada:** `CLAUDE.md`, `ESTADO.md`, `PLAN.md`, `PASOS-MANUALES.md`, `schema.sql`, `system/*`, `PRODUCCION.md`, `auditory.md`.

---

## 1) Resumen ejecutivo (estado general)

- **Arquitectura**: sólida y consistente con el modelo SaaS multi-tenant (Supabase + RLS) y el patrón **Executor** como “motor” central de acciones.
- **Producto**: admin y vitrina quedaron bastante **unificados en diseño/UX** (EntityToolbar, Sheets, mobile-first, cards en mobile / tablas en desktop, dnd-kit para reorder).
- **Operación**: ya tenés completados los **blockers pre-launch** (secrets, superadmin, email confirm, migrations, OG, E2E) y quedó reflejado en `ESTADO.md`.
- **Build/Typecheck**: el repo viene pasando `pnpm build` + `pnpm exec tsc --noEmit` en el loop de trabajo.

Riesgos residuales más relevantes (no bloqueantes, pero a monitorear):
- **Warning de Next**: deprecación de convención `middleware` → “proxy” (cosmético hoy, pero conviene planearlo para un upgrade).
- **Memoria/perf**: evitar “cargar todo” en lists públicas o admin grandes; preferir paginación/virtualización y filtros server-side donde crezca el dataset.
- **Higiene repo**: hay artefactos de build (`.next/`) apareciendo como no trackeados en tu status inicial; asegurar `.gitignore` correcto.

---

## 2) Coherencia de arquitectura (multi-tenant + seguridad)

### Multi-tenant
- **Resolución de tienda** correcta:
  - **Prod**: por subdominio `{slug}.kitdigital.ar` o `custom_domain` verificado.
  - **Dev**: por path `/{slug}/*` (mejor DX, sin hosts file).
- **Aislamiento**: el diseño exige que todo dato de dominio vaya con `store_id` y toda query filtre por `store_id`. Está alineado a `CLAUDE.md`.

### RLS (Row Level Security)
- El enfoque “store_id ∈ store_users(auth.uid())” es el patrón correcto.
- Uso de **service_role** donde corresponde (bootstrap, joins delicados en middleware, inserción de `events`, etc.) es consistente.

### Middleware (rutas y sesión)
- En `/admin` se valida sesión y se inyecta `x-store-context`.
- Ya existe el manejo de **email no confirmado** redirigiendo a `/onboarding/done` (consistente con F17).
- Recomendación: mantener una lista explícita y testeada de rutas públicas (ya la tienen), y agregar un smoke-test manual post-deploy cada vez que Next cambie su routing.

---

## 3) Executor: coherencia de acciones y side-effects

- El Executor como único “gateway” de acciones de dominio es el mayor acierto: centraliza
  - permisos/roles,
  - módulos activos,
  - límites,
  - validación zod,
  - invalidación de caché/queries,
  - eventos de auditoría.
- Sugerencia de hardening (opcional, pero pro): estandarizar “contratos” de retorno por handler (shape estable) para reducir casts `Record<string, unknown>[]` en UI.

---

## 4) Unificación de diseño (admin + vitrina) y consistencia UX

### Admin
- Patrón consistente: **listado + Sheet create/edit** + confirmaciones (AlertDialog) + toolbar.
- Mobile-first: card views para entidades con mucha densidad en desktop.
- Drag & drop: coherente donde hay “orden” como concepto (banners/categorías).

### Vitrina pública
- Mejora notable en:
  - product cards con precio comparativo,
  - detalle premium con variantes,
  - carrito drawer premium y preview WhatsApp.

### Recomendación de coherencia “final”
- Definir 3–5 “primitives” UI y forzar su uso:
  - `EntityToolbar` (búsqueda/filtros),
  - `EmptyState` / `ErrorState`,
  - `Sheet` para create/edit,
  - “card grid” para mobile,
  - `Badge`/`Pill` de estado (misma paleta y semántica).
- Esto reduce divergencias visuales en nuevas features.

---

## 5) Performance y optimización de memoria (puntos reales a vigilar)

### En el cliente (React)
- Evitar listas que crezcan sin límite en memoria.
  - En admin, cuando crezcan órdenes/productos/eventos: **paginación + virtualización**.
  - En público, preferir **paginación** o “cargar más” para catálogos grandes.
- Preferir `useMemo`/derivados para filtros client-side cuando ya hay dataset local, y mover a server-side cuando el dataset crezca.

### Data fetching / cache
- TanStack Query está bien aplicado.
- Pro tip: para contadores (ej. tokens) invalidar también `store-config` cuando el server cambia estado global; esto ya se corrigió para assistant.

### Redis / ISR
- Redis como caché de resolución (`custom_domain`) y catálogo es correcto.
- ISR y revalidación están integrados; mantener consistencia: “lo público” debe tener estrategia clara de cache/invalidación para que no haya datos stale perceptibles.

---

## 6) Assistant (IA): seguridad, UX y costos

Lo actual está bien encaminado:
- Respuesta del modelo forzada a JSON (`response_format: json_object`).
- Lista blanca de acciones (`ALLOWED_AI_ACTIONS`) para evitar propuestas peligrosas.
- Contador de tokens y límite mensual por plan.
- Render de mensajes con **Markdown** para legibilidad (GFM).

Sugerencias pro:
- Añadir telemetría mínima: tokens por request + latencia + error rate (aunque sea en `events`).
- UX: mostrar “qué pasó” después de ejecutar una acción (link profundo al producto/orden/tarea creada).

---

## 7) Billing / Webhooks / Crons (operación)

- Buen patrón: firma HMAC + idempotencia + logging + rate limit.
- Crons protegidos por `CRON_SECRET`.
- Checklist operativo recomendado (para rutina semanal):
  - revisar `billing_webhook_log` (fallos),
  - revisar eventos `past_due/suspended`,
  - revisar “tokens IA usados” (costos).

---

## 8) Higiene del repo y riesgos de mantenimiento

### `.next/` y archivos generados
- Asegurarse de **no versionar** `.next/` ni artefactos de build (tu status inicial mostraba muchos `?? .next/...`).
- Acción recomendada: revisar/fortalecer `.gitignore` y limpiar working tree antes de PRs.

### Warning de Next: `middleware` deprecated
- Hoy es cosmético, pero a futuro conviene planificar un cambio controlado (con test manual de rutas).

### Dependencias
- Mantener `pnpm-lock.yaml` consistente.
- Para cambios UI grandes: idealmente snapshots visuales/manual QA en mobile (375px) y desktop.

---

## 9) Checklist de “post-lanzamiento” (proactivo)

Durante las primeras 48–72h de producción:
- Verificar que llegan webhooks MP (y que el secreto coincide).
- Verificar que crons responden 200 y afectan estados como corresponde.
- Hacer 2–3 flujos completos reales de punta a punta (usuario nuevo y usuario existente).
- Revisión de performance: Lighthouse en catálogo público (home + category + product detail).
- Monitorear “crecimiento de dataset”: si una tienda supera ~200 productos, priorizar paginado/SSR optimizado.

---

## 10) Recomendaciones priorizadas (sin nuevas features, solo hardening)

Prioridad alta (calidad/operación):
- Consolidar `.gitignore` y asegurar working tree limpio.
- Documentar un “smoke test” de 10 minutos post-deploy (y repetir cada release).
- Agregar tracking básico de errores (aunque sea en `events`) para assistant/webhooks/crons.

Prioridad media (perf/memoria):
- Paginación “load more” en catálogo si alguna tienda crece mucho.
- Virtualización en listados admin grandes (si no está aplicado en esa entidad).

Prioridad baja (mantenimiento):
- Planificar migración `middleware`→`proxy` cuando actualices Next (con QA de rutas).

