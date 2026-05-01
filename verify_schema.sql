-- ============================================================
-- KitDigital.ar — Verificación rápida del schema (solo lectura)
-- Útil para pegar en Supabase SQL Editor tras correr `schema.sql`.
-- No modifica datos ni estructura.
-- ============================================================

-- Tablas mínimas esperadas
SELECT t.table_name
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN (
    'stores',
    'store_users',
    'products',
    'orders',
    'order_items',
    'payments',
    'finance_entries',
    'assistant_sessions',
    'assistant_messages'
  )
ORDER BY t.table_name;

-- RLS habilitado donde corresponde (relrowsecurity=true)
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'users','plans','stores','store_users','store_invitations',
    'products','categories','product_categories','banners',
    'variants','variant_attributes','variant_values',
    'stock_items','wholesale_prices','shipping_methods','shipments',
    'customers','orders','order_items','payments',
    'finance_entries','expenses','savings_accounts','savings_movements',
    'tasks','assistant_sessions','assistant_messages','events',
    'billing_payments','billing_webhook_log'
  )
ORDER BY c.relname;

-- Policies críticas de escritura esperadas (según fixes.md)
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (tablename = 'assistant_sessions' AND cmd = 'UPDATE')
    OR (tablename = 'variant_attributes' AND cmd = 'UPDATE')
    OR (tablename = 'variant_values' AND cmd = 'UPDATE')
    OR (tablename = 'store_users' AND cmd IN ('UPDATE','DELETE'))
  )
ORDER BY tablename, cmd, policyname;

-- FKs de multi-tenancy que antes podían faltar
SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND conname IN (
    'order_items_store_fk',
    'assistant_messages_store_fk',
    'savings_movements_store_fk'
  )
ORDER BY conname;

-- Índices/performance mínimos
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_finance_entries_order_id',
    'idx_finance_entries_payment_id',
    'idx_store_invitations_expires_at',
    'idx_tasks_order_id',
    'idx_payments_mp_payment_id_unique',
    'idx_stock_items_store_product_variant_null_unique',
    'idx_wholesale_prices_store_product_variant_null_unique'
  )
ORDER BY indexname;

