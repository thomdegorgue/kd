# DECISIONES.md — Saneamiento por fases (fixes.md)

Este archivo sirve como “memoria” del trabajo ejecutado siguiendo `fixes.md`, dado que `MODULOS.md` y `AUDITORIA.md` fueron eliminados.

## Alcance actual

- **Incluido**: Fase 0, 1, 4 y 6.
- **Saltado** (por falta de docs): Fase 2 (billing packs vs legacy), Fase 3 (auditoría seguridad/bugs), Fase 5 (polish UI por módulos).

## FASE 0 — DB source of truth (`schema.sql`)

- **Archivo canónico**: `schema.sql`
- **Criterio**: idempotente, aditivo, sin pérdida de datos (sin `DROP TABLE`/`TRUNCATE`).
- **Checks cubiertos en `schema.sql`**:
  - `CREATE TABLE IF NOT EXISTS`
  - Migraciones de columnas con `DO $$ ... information_schema.columns ... $$`
  - Índices con `CREATE INDEX IF NOT EXISTS`
  - Triggers idempotentes (`DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`)
  - RLS habilitado y policies recreadas (drop masivo + recreate)
  - FKs “faltantes” agregadas con `DO $$` + `pg_constraint` (incluye `order_items_store_fk`, `assistant_messages_store_fk`, `savings_movements_store_fk`)
  - UNIQUE parciales para `variant_id IS NULL` + unique parcial de `payments(mp_payment_id)` cuando no es null
  - Checks: `compare_price > price`, recurrencia en gastos

### Verificación rápida (solo lectura)

- **Archivo**: `verify_schema.sql`
- **Uso**: pegar y ejecutar en Supabase SQL Editor luego de correr `schema.sql` para confirmar:
  - tablas mínimas presentes
  - RLS habilitado en tablas esperadas
  - policies críticas de UPDATE/DELETE presentes
  - FKs e índices mínimos presentes

## FASE 1 — Normalización de paths

- Se verificó que no hay **imports con backslashes** (`\\`) en el código.
- No se detectaron duplicados case-insensitive en `git ls-files`.

## FASE 4 — Tipos TS ↔ Supabase

- **Archivo**: `src/lib/types/database.ts`
- Se agregó un comando reproducible para regenerar tipos:
  - `pnpm types:db`
  - Script: `scripts/gen-supabase-types.mjs`
  - Usa `SUPABASE_PROJECT_ID` (default: `vqkvqowvmdwabelpiiil`)
  - Requiere `SUPABASE_ACCESS_TOKEN` (o `supabase login`)

## FASE 6 — Checks locales

Comandos corridos localmente:

- `pnpm tsc --noEmit`
- `pnpm lint` (warnings, sin errores)
- `pnpm build`

## Pendientes recomendados (siguientes iteraciones)

- Reconstruir una `AUDITORIA.md` mínima (o checklist equivalente) desde el código para ejecutar Fase 3.
- Definir/recuperar definición de “packs” (para Fase 2) y módulos/UI target (Fase 5).

