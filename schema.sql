-- ============================================================
-- KitDigital.ar — Schema SQL Centralizado
-- Ejecutar en Supabase SQL Editor en una sola transacción
-- gen_random_uuid() es nativo en Supabase (PostgreSQL 14+), no requiere extensión
-- EXECUTE FUNCTION es la sintaxis estándar desde PostgreSQL 11.
-- Supabase (PostgreSQL 15) lo soporta nativamente. No usar EXECUTE PROCEDURE.
-- ============================================================

BEGIN;

-- ============================================================
-- TRIGGER DE UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLAS GLOBALES (sin store_id)
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
  banned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_superadmin ON users(role) WHERE role = 'superadmin';

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  max_products INTEGER NOT NULL,
  max_orders INTEGER NOT NULL,
  ai_tokens INTEGER NOT NULL,
  available_modules JSONB NOT NULL DEFAULT '[]',
  module_prices JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TIENDA
-- ============================================================

CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'demo' CHECK (status IN ('demo', 'active', 'past_due', 'suspended', 'archived')),
  plan_id UUID REFERENCES plans(id),
  modules JSONB NOT NULL DEFAULT '{}',
  config JSONB NOT NULL DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  custom_domain TEXT UNIQUE,
  custom_domain_verified BOOLEAN NOT NULL DEFAULT false,
  custom_domain_verified_at TIMESTAMPTZ,
  custom_domain_verification_token TEXT,
  logo_url TEXT,
  cover_url TEXT,
  whatsapp TEXT,
  description TEXT,
  billing_status TEXT NOT NULL DEFAULT 'demo' CHECK (billing_status IN ('demo', 'active', 'past_due', 'suspended', 'archived')),
  trial_ends_at TIMESTAMPTZ,
  billing_cycle_anchor INTEGER,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  mp_subscription_id TEXT UNIQUE,
  mp_customer_id TEXT,
  ai_tokens_used INTEGER NOT NULL DEFAULT 0,
  cancelled_at TIMESTAMPTZ,
  last_billing_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_custom_domain ON stores(custom_domain);
CREATE INDEX idx_stores_status ON stores(status);
CREATE INDEX idx_stores_billing_status ON stores(billing_status);
CREATE INDEX idx_stores_mp_subscription ON stores(mp_subscription_id);

CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Mantiene status y billing_status siempre sincronizados.
-- El campo canónico para billing es billing_status; el canónico para executor/RLS es status.
-- Este trigger garantiza que siempre tengan el mismo valor sin depender de la aplicación.
CREATE OR REPLACE FUNCTION sync_store_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.billing_status IS DISTINCT FROM OLD.billing_status THEN
    NEW.status = NEW.billing_status;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.billing_status = NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stores_sync_status
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION sync_store_status();

-- ---

CREATE TABLE store_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'collaborator')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_users_store ON store_users(store_id);
CREATE INDEX idx_store_users_user ON store_users(user_id);

CREATE TRIGGER trg_store_users_updated_at BEFORE UPDATE ON store_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE store_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'collaborator')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE INDEX idx_store_invitations_token ON store_invitations(token);
CREATE INDEX idx_store_invitations_email ON store_invitations(email);
CREATE INDEX idx_store_invitations_store ON store_invitations(store_id);

-- ---

CREATE TABLE billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  mp_payment_id TEXT NOT NULL UNIQUE,
  mp_subscription_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending', 'refunded')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_payments_store ON billing_payments(store_id);
CREATE INDEX idx_billing_payments_store_status ON billing_payments(store_id, status);
CREATE INDEX idx_billing_payments_mp_payment ON billing_payments(mp_payment_id);
CREATE INDEX idx_billing_payments_mp_sub ON billing_payments(mp_subscription_id);

-- ---

CREATE TABLE billing_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_event_id TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  store_id UUID REFERENCES stores(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  raw_payload JSONB NOT NULL,
  error TEXT,
  processing_time_ms INTEGER,
  result TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_billing_webhook_event ON billing_webhook_log(mp_event_id);
CREATE INDEX idx_billing_webhook_status ON billing_webhook_log(status);
CREATE INDEX idx_billing_webhook_store ON billing_webhook_log(store_id);
CREATE INDEX idx_billing_webhook_created ON billing_webhook_log(created_at);

-- ============================================================
-- CATÁLOGO
-- ============================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_store_active ON products(store_id, is_active);
CREATE INDEX idx_products_store_featured ON products(store_id, is_featured);
CREATE INDEX idx_products_store_deleted ON products(store_id, deleted_at);

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_store ON categories(store_id);
CREATE INDEX idx_categories_store_active ON categories(store_id, is_active);

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_product_categories_store_cat ON product_categories(store_id, category_id);
CREATE INDEX idx_product_categories_store_prod ON product_categories(store_id, product_id);

-- ---

CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  link_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banners_store ON banners(store_id);
CREATE INDEX idx_banners_store_active ON banners(store_id, is_active);

CREATE TRIGGER trg_banners_updated_at BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- MÓDULOS DE PRODUCTO
-- ============================================================

CREATE TABLE variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price INTEGER,
  sku TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variants_store_product ON variants(store_id, product_id);

CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE variant_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variant_attrs_store_product ON variant_attributes(store_id, product_id);

-- ---

CREATE TABLE variant_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES variant_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variant_values_store_variant ON variant_values(store_id, variant_id);

-- ---

CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 0,
  track_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, variant_id)
);

CREATE INDEX idx_stock_items_store ON stock_items(store_id);
CREATE INDEX idx_stock_items_store_product ON stock_items(store_id, product_id);

CREATE TRIGGER trg_stock_items_updated_at BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE wholesale_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, variant_id)
);

CREATE INDEX idx_wholesale_prices_store ON wholesale_prices(store_id);

CREATE TRIGGER trg_wholesale_prices_updated_at BEFORE UPDATE ON wholesale_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE shipping_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipping_methods_store ON shipping_methods(store_id);
CREATE INDEX idx_shipping_methods_store_active ON shipping_methods(store_id, is_active);

CREATE TRIGGER trg_shipping_methods_updated_at BEFORE UPDATE ON shipping_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CLIENTES Y PEDIDOS
-- ============================================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_store_phone ON customers(store_id, phone);

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  total INTEGER NOT NULL CHECK (total >= 0),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_store_status ON orders(store_id, status);
CREATE INDEX idx_orders_store_created ON orders(store_id, created_at);
CREATE INDEX idx_orders_store_customer ON orders(store_id, customer_id);

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_store_order ON order_items(store_id, order_id);
CREATE INDEX idx_order_items_store_product ON order_items(store_id, product_id);

-- ============================================================
-- ENVÍOS CON SEGUIMIENTO
-- ============================================================

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  tracking_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'in_transit', 'delivered', 'cancelled')),
  shipping_method_id UUID REFERENCES shipping_methods(id),
  recipient_name TEXT,
  recipient_phone TEXT,
  notes TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_store ON shipments(store_id);
CREATE INDEX idx_shipments_order ON shipments(store_id, order_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_code);
CREATE INDEX idx_shipments_status ON shipments(store_id, status);

CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PAGOS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
  method TEXT NOT NULL CHECK (method IN ('cash', 'transfer', 'card', 'mp', 'other')),
  mp_payment_id TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_store ON payments(store_id);
CREATE INDEX idx_payments_store_order ON payments(store_id, order_id);
CREATE INDEX idx_payments_store_status ON payments(store_id, status);
CREATE INDEX idx_payments_store_created ON payments(store_id, created_at);

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FINANZAS
-- ============================================================

CREATE TABLE finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT,
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finance_entries_store ON finance_entries(store_id);
CREATE INDEX idx_finance_entries_store_type ON finance_entries(store_id, type);
CREATE INDEX idx_finance_entries_store_date ON finance_entries(store_id, date);

CREATE TRIGGER trg_finance_entries_updated_at BEFORE UPDATE ON finance_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  supplier TEXT,
  date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_period TEXT CHECK (recurrence_period IN ('monthly', 'weekly', 'annual')),
  receipt_url TEXT,
  finance_entry_id UUID REFERENCES finance_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_store ON expenses(store_id);
CREATE INDEX idx_expenses_store_category ON expenses(store_id, category);
CREATE INDEX idx_expenses_store_date ON expenses(store_id, date);

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  goal_amount INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_savings_accounts_store ON savings_accounts(store_id);

CREATE TRIGGER trg_savings_accounts_updated_at BEFORE UPDATE ON savings_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---

CREATE TABLE savings_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  savings_account_id UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT,
  finance_entry_id UUID REFERENCES finance_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_savings_movements_store_account ON savings_movements(store_id, savings_account_id);

-- ============================================================
-- TAREAS
-- ============================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  due_date DATE,
  assigned_to UUID REFERENCES users(id),
  order_id UUID REFERENCES orders(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_store ON tasks(store_id);
CREATE INDEX idx_tasks_store_status ON tasks(store_id, status);
CREATE INDEX idx_tasks_store_assigned ON tasks(store_id, assigned_to);

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- IA
-- ============================================================

CREATE TABLE assistant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_assistant_sessions_store_user ON assistant_sessions(store_id, user_id);
CREATE INDEX idx_assistant_sessions_expires ON assistant_sessions(expires_at);

-- ---

CREATE TABLE assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assistant_messages_session ON assistant_messages(session_id, created_at);
CREATE INDEX idx_assistant_messages_store ON assistant_messages(store_id, session_id);

-- ============================================================
-- SISTEMA DE EVENTOS
-- ============================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'superadmin', 'system', 'ai')),
  actor_id UUID,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_store ON events(store_id);
CREATE INDEX idx_events_store_type ON events(store_id, type);
CREATE INDEX idx_events_store_created ON events(store_id, created_at);
CREATE INDEX idx_events_type_created ON events(type, created_at);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wholesale_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_webhook_log ENABLE ROW LEVEL SECURITY;

-- Helper: permite escrituras solo en tiendas con status demo o active.
-- Bloquea automáticamente writes cuando la tienda está past_due, suspended o archived.
CREATE OR REPLACE FUNCTION store_allows_writes(sid UUID) RETURNS BOOLEAN AS $$
  SELECT status IN ('demo', 'active') FROM stores WHERE id = sid
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Plans: SELECT público (para pricing page, sin autenticar); mutaciones solo via service_role
CREATE POLICY plans_public_select ON plans FOR SELECT USING (is_active = true);

-- Users: pueden ver y editar su propio perfil
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- Store users: pueden ver los store_users de tiendas a las que pertenecen
CREATE POLICY store_users_select ON store_users FOR SELECT
  USING (user_id = auth.uid() OR store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY store_users_insert ON store_users FOR INSERT
  WITH CHECK (store_id IN (SELECT su.store_id FROM store_users su WHERE su.user_id = auth.uid() AND su.role IN ('owner', 'admin')));

-- Store invitations: owner y admin pueden ver, crear y eliminar
CREATE POLICY store_invitations_select ON store_invitations FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY store_invitations_insert ON store_invitations FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY store_invitations_delete ON store_invitations FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Tablas de dominio: acceso por store_id del usuario
-- Patrón genérico: SELECT/INSERT/UPDATE/DELETE donde store_id coincide con alguna tienda del usuario

CREATE POLICY stores_select ON stores FOR SELECT
  USING (id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY stores_update ON stores FOR UPDATE
  USING (id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY products_select ON products FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY products_insert ON products FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY products_update ON products FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY products_delete ON products FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Catálogo público: los productos activos de tiendas activas se pueden ver sin autenticación
CREATE POLICY products_public_select ON products FOR SELECT
  USING (is_active = true AND deleted_at IS NULL AND store_id IN (SELECT id FROM stores WHERE status IN ('demo', 'active', 'past_due')));

CREATE POLICY categories_select ON categories FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY categories_public_select ON categories FOR SELECT
  USING (is_active = true AND store_id IN (SELECT id FROM stores WHERE status IN ('demo', 'active', 'past_due')));
CREATE POLICY categories_insert ON categories FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY categories_update ON categories FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY categories_delete ON categories FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Banners: lectura pública + escritura para owner/admin de la tienda
CREATE POLICY banners_public_select ON banners FOR SELECT
  USING (is_active = true AND store_id IN (SELECT id FROM stores WHERE status IN ('demo', 'active', 'past_due')));
CREATE POLICY banners_select ON banners FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY banners_insert ON banners FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY banners_update ON banners FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY banners_delete ON banners FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Variants
CREATE POLICY variants_select ON variants FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY variants_insert ON variants FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY variants_update ON variants FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY variants_delete ON variants FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Variant attributes
CREATE POLICY variant_attributes_select ON variant_attributes FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY variant_attributes_insert ON variant_attributes FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY variant_attributes_delete ON variant_attributes FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Variant values
CREATE POLICY variant_values_select ON variant_values FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY variant_values_insert ON variant_values FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY variant_values_delete ON variant_values FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Stock items
CREATE POLICY stock_items_select ON stock_items FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY stock_items_insert ON stock_items FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY stock_items_update ON stock_items FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY stock_items_delete ON stock_items FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Wholesale prices
CREATE POLICY wholesale_prices_select ON wholesale_prices FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY wholesale_prices_insert ON wholesale_prices FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY wholesale_prices_update ON wholesale_prices FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY wholesale_prices_delete ON wholesale_prices FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Shipping methods
CREATE POLICY shipping_methods_select ON shipping_methods FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY shipping_methods_insert ON shipping_methods FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY shipping_methods_update ON shipping_methods FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY shipping_methods_delete ON shipping_methods FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Shipments (lectura pública por tracking_code: solo vía backend con service_role + DTO mínimo;
-- no hay política SELECT anónima: USING (true) expondría todas las filas a cualquier cliente)
CREATE POLICY shipments_select ON shipments FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY shipments_insert ON shipments FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY shipments_update ON shipments FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY shipments_delete ON shipments FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Customers
CREATE POLICY customers_select ON customers FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY customers_update ON customers FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY customers_delete ON customers FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Orders
CREATE POLICY orders_select ON orders FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY orders_insert ON orders FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY orders_update ON orders FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY orders_delete ON orders FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Order items (sin DELETE directo; se eliminan en cascada desde orders)
CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY order_items_insert ON order_items FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));

-- Payments
CREATE POLICY payments_select ON payments FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY payments_insert ON payments FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY payments_update ON payments FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Finance entries
CREATE POLICY finance_entries_select ON finance_entries FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY finance_entries_insert ON finance_entries FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY finance_entries_update ON finance_entries FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY finance_entries_delete ON finance_entries FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Expenses
CREATE POLICY expenses_select ON expenses FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY expenses_insert ON expenses FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY expenses_update ON expenses FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY expenses_delete ON expenses FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Savings accounts
CREATE POLICY savings_accounts_select ON savings_accounts FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY savings_accounts_insert ON savings_accounts FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY savings_accounts_update ON savings_accounts FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY savings_accounts_delete ON savings_accounts FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Savings movements
CREATE POLICY savings_movements_select ON savings_movements FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY savings_movements_insert ON savings_movements FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY savings_movements_delete ON savings_movements FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Tasks
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY tasks_insert ON tasks FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY tasks_update ON tasks FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'collaborator'))
    AND store_allows_writes(store_id));
CREATE POLICY tasks_delete ON tasks FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Assistant sessions
CREATE POLICY assistant_sessions_select ON assistant_sessions FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY assistant_sessions_insert ON assistant_sessions FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())
    AND store_allows_writes(store_id));
CREATE POLICY assistant_sessions_delete ON assistant_sessions FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Assistant messages
CREATE POLICY assistant_messages_select ON assistant_messages FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY assistant_messages_insert ON assistant_messages FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())
    AND store_allows_writes(store_id));

-- Product categories
CREATE POLICY product_categories_select ON product_categories FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY product_categories_insert ON product_categories FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY product_categories_delete ON product_categories FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Eventos: usuarios solo pueden insertar (via executor); superadmin lee todo via service role
CREATE POLICY events_insert ON events FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));

-- billing_payments y billing_webhook_log: solo service_role accede directamente.
-- Sin policies para usuarios normales: cualquier acceso autenticado es bloqueado por RLS.
-- El backend usa supabaseServiceRole para leer y escribir estas tablas.

-- ============================================================
-- DATOS INICIALES
-- ============================================================

INSERT INTO plans (name, price, max_products, max_orders, ai_tokens, available_modules, module_prices) VALUES
('starter', 0, 30, 100, 0, '["catalog","products","categories","cart","orders"]', '{}'),
('growth', 0, 200, 500, 1000, '["catalog","products","categories","cart","orders","stock","payments","banners","social","product_page","shipping"]', '{"variants": 0, "wholesale": 0, "finance": 0}'),
('pro', 0, 1000, 99999, 5000, '["catalog","products","categories","cart","orders","stock","payments","variants","wholesale","shipping","finance","banners","social","product_page","multiuser","custom_domain","tasks","savings_account","expenses","assistant"]', '{}');

-- NOTA: los precios (price) están en 0 como placeholder. El superadmin debe
-- configurar los precios reales desde el panel. Los precios están en centavos ARS/mes.

COMMIT;
