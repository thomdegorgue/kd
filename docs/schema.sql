-- KitDigital.ar — Esquema SQL Fundamental
-- Versión: 1.0 (Marzo 2026)
-- Objetivo: Multitenancy por tenant_id + RLS (Supabase) + módulos + pedidos WhatsApp
--
-- IMPORTANTE:
-- - Este archivo asume Supabase (Postgres) con Auth habilitado.
-- - Define una estrategia estándar: todas las tablas de negocio contienen tenant_id.
-- - RLS: políticas basadas en claims JWT: tenant_id + role.
-- - Ajustar el seteo de claims (tenant_id/role) según implementación de Auth/middleware.

begin;

-- =========================================================
-- 0) Extensiones
-- =========================================================
create extension if not exists pgcrypto;

-- =========================================================
-- 1) Utilidades: timestamps y claims
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Devuelve tenant_id desde JWT (claim: 'tenant_id')
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'tenant_id', '')::uuid;
$$;

-- Devuelve role desde JWT (claim: 'role')
create or replace function public.current_role()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'role', '');
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'superadmin';
$$;

-- Guard rail: asegura tenant_id presente (para inserciones/updates)
create or replace function public.require_tenant_id()
returns trigger
language plpgsql
as $$
begin
  if new.tenant_id is null then
    raise exception 'tenant_id is required';
  end if;
  return new;
end;
$$;

-- =========================================================
-- 2) Core: tenants y módulos
-- =========================================================
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  whatsapp text not null, -- e.g. +54911...
  primary_color text not null default '#111827',
  custom_domain text unique,
  plan_product_limit int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.set_updated_at();

-- Módulos Potenciadores por tenant
create table if not exists public.tenant_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null,
  active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, module_key)
);

create trigger trg_tenant_modules_require_tenant
before insert or update on public.tenant_modules
for each row execute function public.require_tenant_id();

create trigger trg_tenant_modules_updated_at
before update on public.tenant_modules
for each row execute function public.set_updated_at();

-- =========================================================
-- 3) Catálogo: categorías, productos, imágenes, etiquetas
-- =========================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create trigger trg_categories_require_tenant
before insert or update on public.categories
for each row execute function public.require_tenant_id();

create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price_ars numeric(12,2) not null default 0,
  compare_at_price_ars numeric(12,2),
  sku text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create trigger trg_products_require_tenant
before insert or update on public.products
for each row execute function public.require_tenant_id();

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_product_images_require_tenant
before insert or update on public.product_images
for each row execute function public.require_tenant_id();

create trigger trg_product_images_updated_at
before update on public.product_images
for each row execute function public.set_updated_at();

-- Portada Principal (config por tenant)
create table if not exists public.tenant_portada_principal (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  title text,
  subtitle text,
  background_color text,
  background_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tenant_portada_principal_require_tenant
before insert or update on public.tenant_portada_principal
for each row execute function public.require_tenant_id();

create trigger trg_tenant_portada_principal_updated_at
before update on public.tenant_portada_principal
for each row execute function public.set_updated_at();

-- =========================================================
-- 4) Pedidos (carrito WhatsApp) — registro interno
-- =========================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  customer_name text,
  customer_phone text,
  customer_note text,
  currency text not null default 'ARS',
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'draft', -- draft | sent_whatsapp | confirmed | cancelled
  whatsapp_message text, -- snapshot del mensaje generado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_orders_require_tenant
before insert or update on public.orders
for each row execute function public.require_tenant_id();

create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null, -- snapshot
  unit_price numeric(12,2) not null default 0,
  quantity int not null default 1,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_order_items_require_tenant
before insert or update on public.order_items
for each row execute function public.require_tenant_id();

create trigger trg_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

-- =========================================================
-- 5) Módulos (tablas base, activación por tenant_modules)
-- =========================================================

-- 5.1 Stock
create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  available_qty int not null default 0,
  reserved_qty int not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, product_id)
);

create trigger trg_stock_items_require_tenant
before insert or update on public.stock_items
for each row execute function public.require_tenant_id();

create trigger trg_stock_items_updated_at
before update on public.stock_items
for each row execute function public.set_updated_at();

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null, -- in | out | adjust
  qty_delta int not null,
  reason text,
  created_at timestamptz not null default now()
);

-- 5.2 Ventas (registro interno; no implica gateway)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  channel text not null default 'whatsapp', -- whatsapp | local | other
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- 5.3 Finanzas
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null, -- income | expense
  amount numeric(12,2) not null default 0,
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 5.4 Mayorista (link separado /mayorista)
create table if not exists public.wholesale_clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_wholesale_clients_require_tenant
before insert or update on public.wholesale_clients
for each row execute function public.require_tenant_id();

create trigger trg_wholesale_clients_updated_at
before update on public.wholesale_clients
for each row execute function public.set_updated_at();

-- 5.5 Variantes (si módulo activo): estructura base
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null, -- e.g. "Rojo / M"
  sku text,
  price_ars numeric(12,2),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_product_variants_require_tenant
before insert or update on public.product_variants
for each row execute function public.require_tenant_id();

create trigger trg_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

-- =========================================================
-- 6) Suscripciones (Mercado Pago) — estructura referencial
-- =========================================================
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_subscription_id text,
  status text not null default 'pending', -- pending | active | paused | cancelled
  plan_code text not null default 'base',
  product_limit int not null default 100,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_subscriptions_require_tenant
before insert or update on public.subscriptions
for each row execute function public.require_tenant_id();

create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- =========================================================
-- 7) Políticas RLS (aislamiento por tenant + bypass superadmin)
-- =========================================================

-- Helpers para aplicar RLS de forma consistente
-- Regla: tenant_id = current_tenant_id() OR is_superadmin()
-- Nota: en tablas públicas (vitrina) se permitirá SELECT público controlado por is_active.

alter table public.tenants enable row level security;
alter table public.tenant_modules enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.tenant_portada_principal enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.wholesale_clients enable row level security;
alter table public.product_variants enable row level security;
alter table public.subscriptions enable row level security;

-- tenants: acceso solo al propio tenant o superadmin
drop policy if exists tenants_isolation on public.tenants;
create policy tenants_isolation
on public.tenants
for all
using (
  public.is_superadmin()
  or id = public.current_tenant_id()
)
with check (
  public.is_superadmin()
  or id = public.current_tenant_id()
);

-- tenant_modules
drop policy if exists tenant_modules_isolation on public.tenant_modules;
create policy tenant_modules_isolation
on public.tenant_modules
for all
using (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
)
with check (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
);

-- categories: SELECT público permitido si tenant activo? (por simplicidad: SELECT público solo si category is_active)
drop policy if exists categories_public_select on public.categories;
create policy categories_public_select
on public.categories
for select
using (is_active = true);

drop policy if exists categories_tenant_write on public.categories;
create policy categories_tenant_write
on public.categories
for insert, update, delete
using (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
)
with check (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
);

-- products: SELECT público permitido si producto activo
drop policy if exists products_public_select on public.products;
create policy products_public_select
on public.products
for select
using (is_active = true);

drop policy if exists products_tenant_write on public.products;
create policy products_tenant_write
on public.products
for insert, update, delete
using (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
)
with check (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
);

-- product_images: SELECT público (imágenes de productos activos) — se simplifica a: permitir select
drop policy if exists product_images_public_select on public.product_images;
create policy product_images_public_select
on public.product_images
for select
using (true);

drop policy if exists product_images_tenant_write on public.product_images;
create policy product_images_tenant_write
on public.product_images
for insert, update, delete
using (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
)
with check (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
);

-- tenant_portada_principal: SELECT público (para vitrina)
drop policy if exists tenant_portada_public_select on public.tenant_portada_principal;
create policy tenant_portada_public_select
on public.tenant_portada_principal
for select
using (true);

drop policy if exists tenant_portada_tenant_write on public.tenant_portada_principal;
create policy tenant_portada_tenant_write
on public.tenant_portada_principal
for insert, update, delete
using (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
)
with check (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
);

-- orders / order_items: solo tenant (no público)
drop policy if exists orders_isolation on public.orders;
create policy orders_isolation
on public.orders
for all
using (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
)
with check (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
);

drop policy if exists order_items_isolation on public.order_items;
create policy order_items_isolation
on public.order_items
for all
using (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
)
with check (
  public.is_superadmin()
  or tenant_id = public.current_tenant_id()
);

-- módulos (stock/ventas/finanzas/mayorista/variantes): solo tenant
do $$
declare
  t text;
begin
  foreach t in array array[
    'stock_items','stock_movements','sales','financial_transactions','wholesale_clients','product_variants','subscriptions'
  ]
  loop
    execute format('drop policy if exists %I_isolation on public.%I;', t, t);
    execute format($pol$
      create policy %I_isolation
      on public.%I
      for all
      using (public.is_superadmin() or tenant_id = public.current_tenant_id())
      with check (public.is_superadmin() or tenant_id = public.current_tenant_id());
    $pol$, t, t);
  end loop;
end $$;

-- =========================================================
-- 8) Triggers de validación de límites (plan) — VERSIÓN CORREGIDA
-- =========================================================
create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
as $$
declare
  limit_n int;
  active_count int;
begin
  select plan_product_limit into limit_n 
  from public.tenants 
  where id = new.tenant_id;

  -- Contar activos actuales
  select count(*) into active_count 
  from public.products 
  where tenant_id = new.tenant_id 
    and is_active = true;

  -- Ajustar según operación
  if (tg_op = 'INSERT' and new.is_active = true) 
     or (tg_op = 'UPDATE' and new.is_active = true and (old.is_active is distinct from true)) then
    active_count := active_count + 1;
  end if;

  if active_count > limit_n then
    raise exception 'Product limit exceeded for tenant % (limit=%)', new.tenant_id, limit_n;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_enforce_limit on public.products;
create trigger trg_products_enforce_limit
after insert or update of is_active on public.products
for each row execute function public.enforce_product_limit();

-- =========================================================
-- 9) Índices recomendados
-- =========================================================
create index if not exists idx_categories_tenant on public.categories(tenant_id);
create index if not exists idx_products_tenant on public.products(tenant_id);
create index if not exists idx_products_tenant_active on public.products(tenant_id, is_active);
create index if not exists idx_product_images_product on public.product_images(product_id);
create index if not exists idx_orders_tenant_created on public.orders(tenant_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_tenant_modules_tenant_active on public.tenant_modules(tenant_id, active);

commit;


