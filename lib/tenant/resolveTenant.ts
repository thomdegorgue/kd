/**
 * Resolución de tenant por slug o dominio custom
 * Usado en middleware y server components
 */

import { createMiddlewareClient } from "@/lib/supabase/middleware";
import type { Tenant } from "@/types/domain";

/**
 * Resuelve un tenant por su slug
 * @param slug - Slug del tenant (ej: "mi-negocio")
 * @returns Tenant o null si no existe o está inactivo
 */
export async function resolveTenantBySlug(
  slug: string
): Promise<Tenant | null> {
  const supabase = createMiddlewareClient();

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Tenant;
}

/**
 * Resuelve un tenant por su dominio custom
 * @param domain - Dominio custom (ej: "mitienda.com")
 * @returns Tenant o null si no existe o está inactivo
 */
export async function resolveTenantByDomain(
  domain: string
): Promise<Tenant | null> {
  const supabase = createMiddlewareClient();

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("custom_domain", domain)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Tenant;
}

