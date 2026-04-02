# Template — Migración SQL + RLS

> Leer antes: `/system/database/schema.md`, `/system/constraints/global-rules.md` (R1, R2)
> Ejecutar en: Supabase Dashboard → SQL Editor

---

## Template de tabla nueva

```sql
-- ═══════════════════════════════════════════════════════════════════
-- TABLA: {entidades}
-- Módulo propietario: {modulo}
-- Referencia: /system/modules/{modulo}.md → Data Impact → Entities owned
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS {entidades} (
  -- Campos universales obligatorios (no omitir ninguno)
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id    UUID        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- {ADAPTAR}: campos específicos de la entidad
  -- Ver /system/modules/{modulo}.md → Data Impact → Fields
  name        TEXT        NOT NULL CHECK (char_length(name) > 0),
  description TEXT,
  price       INTEGER     NOT NULL CHECK (price >= 0),  -- en centavos SIEMPRE
  image_url   TEXT,
  is_active   BOOLEAN     DEFAULT true NOT NULL,
  sort_order  INTEGER     DEFAULT 0 NOT NULL,
  metadata    JSONB       DEFAULT '{}'::jsonb            -- solo para extensiones opcionales
);

-- ─── TRIGGER updated_at ──────────────────────────────────────────────────────
-- (La función trigger_set_updated_at ya existe desde la migración inicial)
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON {entidades}
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────
-- OBLIGATORIO: índice en store_id (toda tabla de dominio)
CREATE INDEX idx_{entidades}_store_id ON {entidades}(store_id);

-- {ADAPTAR}: índices adicionales según queries más frecuentes
-- Regla: crear índice en columnas usadas en WHERE o ORDER BY de queries de producción
CREATE INDEX idx_{entidades}_store_active ON {entidades}(store_id, is_active);
CREATE INDEX idx_{entidades}_store_sort   ON {entidades}(store_id, sort_order);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
ALTER TABLE {entidades} ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento: usuarios solo ven datos de su tienda
CREATE POLICY "{entidades}_store_isolation" ON {entidades}
  USING (
    store_id = (
      SELECT store_id FROM store_users
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );
```

---

## Template de tabla de relación (many-to-many)

```sql
-- ═══════════════════════════════════════════════════════════════════
-- TABLA DE RELACIÓN: {entidad_a}_{entidad_b}s
-- Sin store_id directo — hereda el scope por la FK a {entidad_a}
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS {entidad_a}_{entidad_b}s (
  {entidad_a}_id UUID NOT NULL REFERENCES {entidad_a}s(id) ON DELETE CASCADE,
  {entidad_b}_id UUID NOT NULL REFERENCES {entidad_b}s(id) ON DELETE CASCADE,
  PRIMARY KEY ({entidad_a}_id, {entidad_b}_id)
  -- Sin updated_at: tabla inmutable (solo insert/delete)
  -- Sin trigger de updated_at
);

CREATE INDEX idx_{entidad_a}_{entidad_b}s_{entidad_a} ON {entidad_a}_{entidad_b}s({entidad_a}_id);
CREATE INDEX idx_{entidad_a}_{entidad_b}s_{entidad_b} ON {entidad_a}_{entidad_b}s({entidad_b}_id);

-- RLS en tabla de relación: accesible si el usuario puede acceder a {entidad_a}
ALTER TABLE {entidad_a}_{entidad_b}s ENABLE ROW LEVEL SECURITY;
CREATE POLICY "{entidad_a}_{entidad_b}s_isolation" ON {entidad_a}_{entidad_b}s
  USING (
    {entidad_a}_id IN (
      SELECT id FROM {entidad_a}s
      WHERE store_id = (
        SELECT store_id FROM store_users WHERE user_id = auth.uid() LIMIT 1
      )
    )
  );
```

---

## Template: función y trigger updated_at (crear UNA sola vez)

```sql
-- Solo ejecutar si no existe aún (migración inicial)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Template: agregar columna a tabla existente

```sql
-- ═══════════════════════════════════════════════════════════════════
-- MIGRACIÓN: agregar columna {columna} a {entidades}
-- Fecha: {YYYY-MM-DD}
-- Motivo: {descripción breve del por qué}
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE {entidades}
  ADD COLUMN IF NOT EXISTS {columna} {TIPO} {DEFAULT} {CONSTRAINT};

-- Ejemplos:
-- ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
-- ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
-- ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb NOT NULL;
-- ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0 NOT NULL;
```

---

## Políticas RLS especiales

### Tabla de eventos (solo INSERT para usuarios normales)
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_insert_only" ON events
  FOR INSERT
  WITH CHECK (true);  -- cualquier usuario autenticado puede insertar

-- NO política de SELECT para usuarios: solo service role puede leer todos los eventos
```

### Tabla de webhooks (sin políticas — solo service role)
```sql
-- billing_webhook_log: sin políticas RLS
-- Solo accesible con SUPABASE_SERVICE_ROLE_KEY desde el servidor
ALTER TABLE billing_webhook_log ENABLE ROW LEVEL SECURITY;
-- No crear ninguna política: acceso denegado para todos los roles normales
```

### Tabla de planes (lectura pública)
```sql
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON plans
  FOR SELECT
  USING (true);  -- cualquiera puede ver los planes disponibles
```

---

## Verificación post-migración

```sql
-- 1. Verificar que la tabla existe con sus columnas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = '{entidades}'
ORDER BY ordinal_position;

-- 2. Verificar que RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = '{entidades}';

-- 3. Verificar que las políticas existen
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = '{entidades}';

-- 4. Verificar los índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = '{entidades}';

-- 5. Test de aislamiento (simular usuario sin tienda - debe retornar 0 filas)
SET LOCAL role = authenticated;
SELECT COUNT(*) FROM {entidades};
RESET role;
```

---

## Checklist de migración SQL

- [ ] Todos los campos obligatorios: `id UUID`, `store_id UUID`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- [ ] `store_id` tiene FK a `stores(id) ON DELETE CASCADE`
- [ ] Precios en `INTEGER` (centavos), no en `DECIMAL` ni `FLOAT`
- [ ] Trigger `set_updated_at` aplicado (si la tabla tiene `updated_at`)
- [ ] Índice en `store_id` creado
- [ ] RLS habilitado (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Política de aislamiento creada con `store_users` lookup
- [ ] Verificación post-migración ejecutada en SQL Editor
- [ ] 0 errores en la ejecución del script
