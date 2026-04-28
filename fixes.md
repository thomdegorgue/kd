# fixes.md — Plan de saneamiento del repo (guía para agente IA)

> **Objetivo:** dejar el repositorio “producible y mantenible” sin romper producción.  
> **Regla de oro:** cambios **aditivos** primero (no destructivos), con verificación rápida por fase.

## Principios

- **No perder datos**: nada de `DROP TABLE`, `TRUNCATE`, ni migraciones destructivas sin backup y confirmación explícita.
- **SQL idempotente**: todo script debe poder correrse 2+ veces sin fallar.
- **Una fuente de verdad**: evitar duplicados (paths, helpers, lógica de billing).
- **Separar “Fixes críticos” vs “Polish”**: primero seguridad/bugs/consistencia, después UI premium.

## FASE 0 — Dejar `schema.sql` ejecutable y seguro (DB “source of truth”)

**Meta:** poder pegar `schema.sql` en Supabase SQL Editor y que:
- cree lo faltante,
- aplique migraciones aditivas,
- arregle RLS/índices/constraints sin borrar datos,
- no dependa de orden “mágico” ni de migraciones previas.

### 0.1 Checklist técnico de `schema.sql`

- [x] **Extensiones requeridas** (`pgcrypto` para `gen_random_uuid`).
- [x] **Tablas** con `CREATE TABLE IF NOT EXISTS`.
- [x] **Migraciones de columnas** vía `DO $$ ... information_schema.columns ... $$`.
- [x] **Índices** con `CREATE INDEX IF NOT EXISTS`.
- [x] **Triggers**: `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`.
- [x] **RLS**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- [x] **Policies**: drop masivo + recreate.
- [x] **FKs que faltan**: `DO $$ ... pg_constraint ... $$` (sin romper si ya existen).
- [x] **Calidad**: checks compuestos y constraints no destructivos.
- [x] **Seeds**: `INSERT ... WHERE NOT EXISTS`.

### 0.2 Ajustes que esta fase debe incluir (según auditoría)

- [x] **RLS**: agregar `UPDATE` a `assistant_sessions`, `variant_attributes`, `variant_values`; y `UPDATE/DELETE` a `store_users`.
- [x] **Multi-tenancy**: agregar FK `store_id → stores(id)` donde faltaba (`order_items`, `assistant_messages`, `savings_movements`).
- [x] **Índices performance**: `finance_entries(order_id/payment_id)`, `store_invitations(expires_at)`, `tasks(order_id)`, etc.
- [x] **UNIQUE parciales**: evitar duplicados lógicos cuando `variant_id IS NULL` (stock y wholesale); `payments(mp_payment_id)` cuando no es null.
- [x] **Checks**: `compare_price > price`, recurrencia en gastos.

### 0.3 Forma de validación (manual)

- [ ] Crear DB nueva en Supabase → pegar `schema.sql` → debe ejecutar sin errores.
- [ ] En DB con datos existentes → pegar `schema.sql` → debe ejecutar sin borrar datos.
- [ ] Verificar RLS: desde cliente `authenticated` se puede actualizar `assistant_sessions.last_activity_at`.
- [ ] Verificar constraints: no se pueden crear duplicados de stock “sin variante”.

---

## FASE 1 — Normalizar el repo (eliminar duplicados por backslashes)

**Problema:** existen paths duplicados en Windows del tipo `src/app/...` y `src\app\...`. En Linux/CI esto puede explotar o generar builds inconsistentes.

### 1.1 Inventario de duplicados

- [ ] Listar archivos duplicados por path (`src\\` vs `src/`).
- [ ] Identificar cuál es el “canónico” (convención: usar `src/app/...`, `src/components/...`, `src/lib/...` con `/`).

### 1.2 Unificación segura

- [ ] Para cada duplicado: elegir uno, migrar imports, y borrar el otro.
- [ ] Verificar `tsconfig` paths (`@/*`) y que no haya imports con backslashes.
- [ ] Ejecutar build/TS para confirmar.

---

## FASE 2 — Unificar billing (packs vs legacy sin romper tiendas existentes)

Basado en `MODULOS.md`:

- [ ] Confirmar `packs.ts` como fuente canónica.
- [ ] Alinear `calculator.ts` para que no duplique `computePackTotal` con otra lógica.
- [ ] Mantener backwards compatibility: tiendas legacy siguen funcionando hasta migración explícita.
- [ ] Ajustar server actions y webhook MP para soportar ambos modelos (si aplica).

---

## FASE 3 — Fixes críticos del producto (seguridad/bugs) desde `AUDITORIA.md`

**Prioridad 🔴/🟠 (si todavía existen en este repo):**

- [ ] Cron auth: `clean-assistant-sessions` debe requerir secret siempre.
- [ ] `check-billing`: si archiva por mora, sincronizar `stores.status`.
- [ ] `billing.changeTier` downgrade: usar `count` correcto.
- [ ] Query keys: `useStock` incluye filtros en key; `useAssistantSession` incluye `sessionId`.
- [ ] Admin orders search: cablear `search` a backend.
- [ ] Auth callback `next`: validar que sea path relativo seguro.

---

## FASE 4 — Tipos y consistencia TS ↔ Supabase

- [ ] Regenerar `src/lib/types/database.ts` con Supabase CLI.
- [ ] Eliminar `as any` en queries cuando sea posible.
- [ ] Revisar desalineaciones de nombres de columnas (ej. `custom_domain_txt_token`).

---

## FASE 5 — Polish UI premium por módulos (según `MODULOS.md`)

- [ ] Stock / Finance / Expenses / Savings / Payments → migrar dialogs a `Sheet`, toolbars consistentes, empty states, skeletons.
- [ ] Tasks / Wholesale / Shipping / Customers / Banners → polish + features (kanban, drag-drop banners, tracking timeline).
- [ ] Landing pricing calculator → reflejar packs.

---

## FASE 6 — QA y checklist de lanzamiento

- [ ] `pnpm tsc --noEmit`
- [ ] `pnpm lint`
- [ ] Smoke tests de billing/packs, onboarding, catálogo público, admin.

