/**
 * Tipos de dominio básicos para KitDigital.ar
 * Estos tipos se basan en el schema SQL (02-schema.sql)
 */

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  whatsapp: string;
  primary_color: string;
  custom_domain: string | null;
  plan_product_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_ars: number;
  compare_at_price_ars: number | null;
  sku: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TenantModule = {
  tenant_id: string;
  module_key: string;
  active: boolean;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

