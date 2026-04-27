-- ============================================================
-- KitDigital.ar — Limpieza completa (preserva superadmin y plans)
-- Borra todos los stores, usuarios normales y datos asociados.
-- SAFE: no toca auth.users ni el row de superadmin en users.
-- ============================================================

BEGIN;

-- 1. billing_payments y billing_webhook_log no tienen ON DELETE CASCADE
--    desde stores, así que hay que borrarlos primero.
DELETE FROM billing_payments;
DELETE FROM billing_webhook_log;

-- 2. events: store_id es UUID sin FK formal, se puede borrar directo.
DELETE FROM events;

-- 3. Borrar todos los stores.
--    Esto cascadea automáticamente a (gracias a ON DELETE CASCADE):
--      store_users, store_invitations,
--      products → variants, variant_attributes, variant_values,
--                 stock_items, wholesale_prices, product_categories
--      categories, banners, shipping_methods,
--      customers → orders → order_items, shipments, payments,
--      finance_entries → expenses,
--      savings_accounts → savings_movements,
--      tasks, assistant_sessions → assistant_messages
DELETE FROM stores;

-- 4. Borrar usuarios que NO son superadmin.
--    Es seguro después del paso anterior porque store_users ya fue
--    eliminado en cascada (evita el FK store_users.user_id → users.id).
DELETE FROM users WHERE role != 'superadmin';

-- plans NO se borra: es configuración global, no datos de usuario.

COMMIT;
