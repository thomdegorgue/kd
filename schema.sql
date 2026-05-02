-- ============================================================
-- KitDigital.ar — Schema SQL (Idempotente / Migration-safe)
-- Seguro para ejecutar sobre una DB existente: no borra datos.
-- Crea lo que falta, agrega columnas nuevas, reemplaza triggers y policies.
-- ============================================================

BEGIN;

-- ============================================================
-- EXTENSIONES (necesarias para gen_random_uuid)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- FUNCIONES (CREATE OR REPLACE — siempre idempotente)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================================
-- TABLAS (CREATE TABLE IF NOT EXISTS — nunca falla si ya existe)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
  banned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_per_100_products INTEGER NOT NULL DEFAULT 0,
  pro_module_price INTEGER NOT NULL DEFAULT 0,
  pack_price INTEGER NOT NULL DEFAULT 1000000,
  bundle_3packs_price INTEGER NOT NULL DEFAULT 2500000,
  base_modules JSONB NOT NULL DEFAULT '[]',
  trial_days INTEGER NOT NULL DEFAULT 14,
  trial_max_products INTEGER NOT NULL DEFAULT 100,
  annual_discount_months INTEGER NOT NULL DEFAULT 2,
  max_stores_total INTEGER,
  ai_tokens_monthly INTEGER NOT NULL DEFAULT 50000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
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
  custom_domain_txt_token TEXT,
  logo_url TEXT,
  cover_url TEXT,
  whatsapp TEXT,
  description TEXT,
  billing_status TEXT NOT NULL DEFAULT 'demo' CHECK (billing_status IN ('demo', 'active', 'past_due', 'suspended', 'archived')),
  trial_ends_at TIMESTAMPTZ,
  billing_cycle_anchor INTEGER,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  billing_period TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'annual')),
  annual_paid_until DATE,
  mp_subscription_id TEXT UNIQUE,
  mp_customer_id TEXT,
  ai_tokens_used INTEGER NOT NULL DEFAULT 0,
  ai_tokens_reset_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  last_billing_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION store_allows_writes(sid UUID) RETURNS BOOLEAN AS $$
  SELECT status IN ('demo', 'active') FROM stores WHERE id = sid
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS store_users (
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

CREATE TABLE IF NOT EXISTS store_invitations (
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

-- billing_payments: paid_at en lugar de period_start/period_end NOT NULL
CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  mp_payment_id TEXT NOT NULL UNIQUE,
  mp_subscription_id TEXT,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending', 'refunded')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_webhook_log (
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

-- payment_methods: configuración por tienda de métodos de cobro para checkout online
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('transfer', 'mp')),
  name TEXT NOT NULL DEFAULT '',
  instructions TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),
  compare_price INTEGER,
  stock INTEGER,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
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

CREATE TABLE IF NOT EXISTS product_categories (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS banners (
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

CREATE TABLE IF NOT EXISTS variants (
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

CREATE TABLE IF NOT EXISTS variant_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS variant_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES variant_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_items (
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

CREATE TABLE IF NOT EXISTS wholesale_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  price INTEGER NOT NULL CHECK (price >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, product_id, variant_id, min_quantity)
);

CREATE TABLE IF NOT EXISTS shipping_methods (
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

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'admin' CHECK (source IN ('admin', 'whatsapp', 'mp_checkout', 'checkout')),
  total INTEGER NOT NULL CHECK (total >= 0),
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- order_webhook_log: eventos de Mercado Pago para pedidos (tienda→cliente)
-- Se separa de billing_webhook_log para no mezclar dominios.
-- Debe ir después de `orders` por la FK order_id.
CREATE TABLE IF NOT EXISTS order_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mp_event_id TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  store_id UUID REFERENCES stores(id),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  raw_payload JSONB NOT NULL,
  error TEXT,
  processing_time_ms INTEGER,
  result TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
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

CREATE TABLE IF NOT EXISTS shipments (
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

CREATE TABLE IF NOT EXISTS payments (
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

CREATE TABLE IF NOT EXISTS finance_entries (
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

CREATE TABLE IF NOT EXISTS expenses (
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

CREATE TABLE IF NOT EXISTS savings_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  goal_amount INTEGER,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  savings_account_id UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT,
  finance_entry_id UUID REFERENCES finance_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
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

CREATE TABLE IF NOT EXISTS assistant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES assistant_sessions(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID,
  type TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'superadmin', 'system', 'ai')),
  actor_id UUID,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MIGRACIONES DE COLUMNAS (tablas existentes que pueden tener
-- columnas faltantes respecto al schema actual)
-- ============================================================

DO $$
BEGIN
  -- billing_payments: reemplaza period_start/period_end NOT NULL por paid_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_payments' AND column_name = 'paid_at') THEN
    ALTER TABLE billing_payments ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_payments' AND column_name = 'period_start'
    AND is_nullable = 'NO') THEN
    ALTER TABLE billing_payments ALTER COLUMN period_start DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_payments' AND column_name = 'period_end'
    AND is_nullable = 'NO') THEN
    ALTER TABLE billing_payments ALTER COLUMN period_end DROP NOT NULL;
  END IF;

  -- stores: columnas que pueden no existir en DBs creadas con schemas anteriores
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'billing_period') THEN
    ALTER TABLE stores ADD COLUMN billing_period TEXT NOT NULL DEFAULT 'monthly'
      CHECK (billing_period IN ('monthly', 'annual'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'annual_paid_until') THEN
    ALTER TABLE stores ADD COLUMN annual_paid_until DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'last_billing_failure_at') THEN
    ALTER TABLE stores ADD COLUMN last_billing_failure_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'cancelled_at') THEN
    ALTER TABLE stores ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'ai_tokens_used') THEN
    ALTER TABLE stores ADD COLUMN ai_tokens_used INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'ai_tokens_reset_at') THEN
    ALTER TABLE stores ADD COLUMN ai_tokens_reset_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'mp_subscription_id') THEN
    ALTER TABLE stores ADD COLUMN mp_subscription_id TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'mp_customer_id') THEN
    ALTER TABLE stores ADD COLUMN mp_customer_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'custom_domain_txt_token') THEN
    ALTER TABLE stores ADD COLUMN custom_domain_txt_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'cover_url') THEN
    ALTER TABLE stores ADD COLUMN cover_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'description') THEN
    ALTER TABLE stores ADD COLUMN description TEXT;
  END IF;

  -- plans: columnas nuevas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'annual_discount_months') THEN
    ALTER TABLE plans ADD COLUMN annual_discount_months INTEGER NOT NULL DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'ai_tokens_monthly') THEN
    ALTER TABLE plans ADD COLUMN ai_tokens_monthly INTEGER NOT NULL DEFAULT 50000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'max_stores_total') THEN
    ALTER TABLE plans ADD COLUMN max_stores_total INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'pack_price') THEN
    ALTER TABLE plans ADD COLUMN pack_price INTEGER NOT NULL DEFAULT 1000000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'bundle_3packs_price') THEN
    ALTER TABLE plans ADD COLUMN bundle_3packs_price INTEGER NOT NULL DEFAULT 2500000;
  END IF;

  -- billing_webhook_log: columna result (puede ser nueva)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_webhook_log' AND column_name = 'result') THEN
    ALTER TABLE billing_webhook_log ADD COLUMN result TEXT;
  END IF;

  -- customers: agregar columna notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'notes') THEN
    ALTER TABLE customers ADD COLUMN notes TEXT;
  END IF;

  -- savings_accounts: agregar customer_id (cuenta corriente vinculada a un cliente)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'savings_accounts' AND column_name = 'customer_id') THEN
    ALTER TABLE savings_accounts ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  END IF;

  -- orders: ampliar el CHECK constraint de source para incluir 'checkout'
  -- En algunas DBs viejas el CHECK no incluye 'checkout'. Usamos DROP+CREATE (idempotente).
  BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
  EXCEPTION WHEN undefined_table THEN
    -- orders todavía no existe (DB nueva en medio de ejecución)
    NULL;
  END;
  BEGIN
    ALTER TABLE orders ADD CONSTRAINT orders_source_check
      CHECK (source IN ('admin', 'whatsapp', 'mp_checkout', 'checkout'));
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
    WHEN undefined_table THEN
      NULL;
  END;
END $$;

-- ============================================================
-- ÍNDICES (CREATE INDEX IF NOT EXISTS — nunca falla si ya existe)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_superadmin ON users(role) WHERE role = 'superadmin';
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON stores(custom_domain);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_billing_status ON stores(billing_status);
CREATE INDEX IF NOT EXISTS idx_stores_mp_subscription ON stores(mp_subscription_id);
CREATE INDEX IF NOT EXISTS idx_store_users_store ON store_users(store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user ON store_users(user_id);
CREATE INDEX IF NOT EXISTS idx_store_invitations_token ON store_invitations(token);
CREATE INDEX IF NOT EXISTS idx_store_invitations_email ON store_invitations(email);
CREATE INDEX IF NOT EXISTS idx_store_invitations_store ON store_invitations(store_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_store ON billing_payments(store_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_store_status ON billing_payments(store_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_payments_mp_payment ON billing_payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_mp_sub ON billing_payments(mp_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_event ON billing_webhook_log(mp_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_status ON billing_webhook_log(status);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_store ON billing_webhook_log(store_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_created ON billing_webhook_log(created_at);
CREATE INDEX IF NOT EXISTS idx_order_webhook_event ON order_webhook_log(mp_event_id);
CREATE INDEX IF NOT EXISTS idx_order_webhook_status ON order_webhook_log(status);
CREATE INDEX IF NOT EXISTS idx_order_webhook_store ON order_webhook_log(store_id);
CREATE INDEX IF NOT EXISTS idx_order_webhook_order ON order_webhook_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_webhook_created ON order_webhook_log(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_methods_store ON payment_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_store_active ON payment_methods(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_store_featured ON products(store_id, is_featured);
CREATE INDEX IF NOT EXISTS idx_products_store_deleted ON products(store_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_active ON categories(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_store_cat ON product_categories(store_id, category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_store_prod ON product_categories(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_banners_store ON banners(store_id);
CREATE INDEX IF NOT EXISTS idx_banners_store_active ON banners(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_variants_store_product ON variants(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_variant_attrs_store_product ON variant_attributes(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_variant_values_store_variant ON variant_values(store_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_store ON stock_items(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_store_product ON stock_items(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_prices_store ON wholesale_prices(store_id);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_store ON shipping_methods(store_id);
CREATE INDEX IF NOT EXISTS idx_shipping_methods_store_active ON shipping_methods(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_phone ON customers(store_id, phone);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_store_customer ON orders(store_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_source ON orders(store_id, source);
CREATE INDEX IF NOT EXISTS idx_order_items_store_order ON order_items(store_id, order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_product ON order_items(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_shipments_store ON shipments(store_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(store_id, order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_code);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(store_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_store ON payments(store_id);
CREATE INDEX IF NOT EXISTS idx_payments_store_order ON payments(store_id, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_store_status ON payments(store_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_store_created ON payments(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_finance_entries_store ON finance_entries(store_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_store_type ON finance_entries(store_id, type);
CREATE INDEX IF NOT EXISTS idx_finance_entries_store_date ON finance_entries(store_id, date);
CREATE INDEX IF NOT EXISTS idx_finance_entries_order_id ON finance_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_payment_id ON finance_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store ON expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store_category ON expenses(store_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON expenses(store_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_finance_entry_id ON expenses(finance_entry_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_store ON savings_accounts(store_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_customer ON savings_accounts(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_savings_movements_store_account ON savings_movements(store_id, savings_account_id);
CREATE INDEX IF NOT EXISTS idx_savings_movements_finance_entry_id ON savings_movements(finance_entry_id);
CREATE INDEX IF NOT EXISTS idx_tasks_store ON tasks(store_id);
CREATE INDEX IF NOT EXISTS idx_tasks_store_status ON tasks(store_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_store_assigned ON tasks(store_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_order_id ON tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_store_user ON assistant_sessions(store_id, user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_expires ON assistant_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_session ON assistant_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_store ON assistant_messages(store_id, session_id);
CREATE INDEX IF NOT EXISTS idx_events_store ON events(store_id);
CREATE INDEX IF NOT EXISTS idx_events_store_type ON events(store_id, type);
CREATE INDEX IF NOT EXISTS idx_events_store_created ON events(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_type_created ON events(type, created_at);
CREATE INDEX IF NOT EXISTS idx_products_store_out_of_stock ON products(store_id) WHERE stock = 0;
CREATE INDEX IF NOT EXISTS idx_events_store_type_created ON events(store_id, type, created_at DESC);

-- UNIQUE parciales para evitar duplicados lógicos cuando variant_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_items_no_variant_unique
  ON stock_items(store_id, product_id) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wholesale_prices_no_variant_unique
  ON wholesale_prices(store_id, product_id, min_quantity) WHERE variant_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_mp_payment_id_unique
  ON payments(mp_payment_id) WHERE mp_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_store_invitations_expires_at ON store_invitations(expires_at);

-- ============================================================
-- TRIGGERS (drop + recreate — idempotente)
-- ============================================================

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
  DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
  DROP TRIGGER IF EXISTS trg_stores_updated_at ON stores;
  DROP TRIGGER IF EXISTS trg_stores_sync_status ON stores;
  DROP TRIGGER IF EXISTS trg_store_users_updated_at ON store_users;
  DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
  DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
  DROP TRIGGER IF EXISTS trg_banners_updated_at ON banners;
  DROP TRIGGER IF EXISTS trg_variants_updated_at ON variants;
  DROP TRIGGER IF EXISTS trg_stock_items_updated_at ON stock_items;
  DROP TRIGGER IF EXISTS trg_wholesale_prices_updated_at ON wholesale_prices;
  DROP TRIGGER IF EXISTS trg_shipping_methods_updated_at ON shipping_methods;
  DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
  DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
  DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
  DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON payment_methods;
  DROP TRIGGER IF EXISTS trg_finance_entries_updated_at ON finance_entries;
  DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
  DROP TRIGGER IF EXISTS trg_savings_accounts_updated_at ON savings_accounts;
  DROP TRIGGER IF EXISTS trg_shipments_updated_at ON shipments;
  DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
END $$;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stores_sync_status BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION sync_store_status();
CREATE TRIGGER trg_store_users_updated_at BEFORE UPDATE ON store_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_banners_updated_at BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stock_items_updated_at BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_wholesale_prices_updated_at BEFORE UPDATE ON wholesale_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shipping_methods_updated_at BEFORE UPDATE ON shipping_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_finance_entries_updated_at BEFORE UPDATE ON finance_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_savings_accounts_updated_at BEFORE UPDATE ON savings_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (ALTER TABLE ENABLE ROW LEVEL SECURITY es idempotente)
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
ALTER TABLE order_webhook_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES (drop masivo + recreate — idempotente)
-- ============================================================

DO $$
DECLARE _r RECORD;
BEGIN
  FOR _r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE tablename IN (
      'users','plans','stores','store_users','store_invitations',
      'products','categories','product_categories','banners',
      'variants','variant_attributes','variant_values',
      'stock_items','wholesale_prices','shipping_methods','shipments',
      'customers','orders','order_items','payments',
      'finance_entries','expenses','savings_accounts','savings_movements',
      'tasks','assistant_sessions','assistant_messages','events',
      'billing_payments','billing_webhook_log','order_webhook_log','payment_methods'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', _r.policyname, _r.tablename);
  END LOOP;
END $$;

-- Plans: SELECT público; mutaciones solo via service_role
CREATE POLICY plans_public_select ON plans FOR SELECT USING (is_active = true);

-- Users
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- Store users
CREATE POLICY store_users_select ON store_users FOR SELECT
  USING (user_id = auth.uid() OR store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY store_users_insert ON store_users FOR INSERT
  WITH CHECK (store_id IN (SELECT su.store_id FROM store_users su WHERE su.user_id = auth.uid() AND su.role IN ('owner', 'admin')));

-- Permite gestionar membresías (cambiar rol / aceptar / remover) a dueños/admins
CREATE POLICY store_users_update ON store_users FOR UPDATE
  USING (store_id IN (
    SELECT su.store_id FROM store_users su
    WHERE su.user_id = auth.uid() AND su.role IN ('owner', 'admin')
  ));
CREATE POLICY store_users_delete ON store_users FOR DELETE
  USING (store_id IN (
    SELECT su.store_id FROM store_users su
    WHERE su.user_id = auth.uid() AND su.role IN ('owner', 'admin')
  ));

-- Store invitations
CREATE POLICY store_invitations_select ON store_invitations FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY store_invitations_insert ON store_invitations FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY store_invitations_delete ON store_invitations FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Stores
CREATE POLICY stores_select ON stores FOR SELECT
  USING (id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY stores_update ON stores FOR UPDATE
  USING (id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Products
CREATE POLICY products_public_select ON products FOR SELECT
  USING (is_active = true AND deleted_at IS NULL AND store_id IN (SELECT id FROM stores WHERE status IN ('demo', 'active', 'past_due')));
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

-- Categories
CREATE POLICY categories_public_select ON categories FOR SELECT
  USING (is_active = true AND store_id IN (SELECT id FROM stores WHERE status IN ('demo', 'active', 'past_due')));
CREATE POLICY categories_select ON categories FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY categories_insert ON categories FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY categories_update ON categories FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY categories_delete ON categories FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Banners
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
CREATE POLICY variant_attributes_update ON variant_attributes FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
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
CREATE POLICY variant_values_update ON variant_values FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
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

-- Shipments
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

-- Order items
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

-- Payment methods (checkout)
CREATE POLICY payment_methods_select ON payment_methods FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));
CREATE POLICY payment_methods_insert ON payment_methods FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY payment_methods_update ON payment_methods FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));
CREATE POLICY payment_methods_delete ON payment_methods FOR DELETE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    AND store_allows_writes(store_id));

-- Order webhook log (solo lectura para miembros; escritura via service_role)
CREATE POLICY order_webhook_log_select ON order_webhook_log FOR SELECT
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));

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
CREATE POLICY assistant_sessions_update ON assistant_sessions FOR UPDATE
  USING (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())
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

-- Events: usuarios solo pueden insertar; superadmin lee todo via service role
CREATE POLICY events_insert ON events FOR INSERT
  WITH CHECK (store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid()));

-- billing_payments y billing_webhook_log: solo service_role (sin policies para usuarios)

-- ============================================================
-- DATOS INICIALES (solo inserta si no existe el plan base)
-- ============================================================

INSERT INTO plans (name, price_per_100_products, pro_module_price, base_modules, trial_days, trial_max_products, annual_discount_months, ai_tokens_monthly)
SELECT
  'base',
  2000000,
  500000,
  '["catalog","products","categories","cart","orders","stock","payments","banners","social","product_page","shipping","custom_domain"]',
  14,
  100,
  2,
  50000
WHERE NOT EXISTS (SELECT 1 FROM plans WHERE name = 'base');

-- ============================================================
-- FKs FALTANTES EN TABLAS DE MÓDULOS (idempotente)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variants_store_fk') THEN
    ALTER TABLE variants
      ADD CONSTRAINT variants_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variant_attributes_store_fk') THEN
    ALTER TABLE variant_attributes
      ADD CONSTRAINT variant_attributes_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variant_values_store_fk') THEN
    ALTER TABLE variant_values
      ADD CONSTRAINT variant_values_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_items_store_fk') THEN
    ALTER TABLE stock_items
      ADD CONSTRAINT stock_items_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_prices_store_fk') THEN
    ALTER TABLE wholesale_prices
      ADD CONSTRAINT wholesale_prices_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- store_id FKs faltantes en tablas donde hoy depende 100% de la app
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_store_fk') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assistant_messages_store_fk') THEN
    ALTER TABLE assistant_messages
      ADD CONSTRAINT assistant_messages_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'savings_movements_store_fk') THEN
    ALTER TABLE savings_movements
      ADD CONSTRAINT savings_movements_store_fk FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- CONSTRAINTS DE CALIDAD
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_nonneg') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_stock_nonneg CHECK (stock IS NULL OR stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_compare_price_gt_price') THEN
    ALTER TABLE products
      ADD CONSTRAINT products_compare_price_gt_price CHECK (compare_price IS NULL OR compare_price > price);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_recurring_requires_period') THEN
    ALTER TABLE expenses
      ADD CONSTRAINT expenses_recurring_requires_period
      CHECK (is_recurring = false OR recurrence_period IS NOT NULL);
  END IF;
END $$;

COMMIT;
