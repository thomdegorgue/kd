-- ============================================================
-- KitDigital.ar — Borrado TOTAL del esquema `public`
--
-- NO es lo mismo que clear.sql:
--   clear.sql → borra datos de negocio y deja tablas/policies.
--   Este archivo → elimina TODAS las tablas, funciones, triggers,
--   tipos, vistas, etc. del esquema public.
--
-- Qué NO toca:
--   - Esquema auth (auth.users, sesiones, etc.) — sigue en Supabase.
--   - Otros esquemas (storage, realtime, …).
--
-- Después de ejecutar esto:
--   1. Ejecutá schema.sql desde cero.
--   2. (Opcional) verify_schema.sql para comprobar.
--
-- ⚠️  Solo entornos de desarrollo / staging. Irreversible.
-- ============================================================

BEGIN;

DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

-- Permisos habituales en Supabase (roles del proyecto)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

COMMIT;

-- Si tu Postgres local no tiene roles anon/authenticated/service_role,
-- comentá los GRANT de arriba y usá solo:
--   GRANT ALL ON SCHEMA public TO postgres;
--   GRANT ALL ON SCHEMA public TO PUBLIC;
