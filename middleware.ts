/**
 * Middleware de Next.js para resolución de tenant
 * 
 * Responsabilidades:
 * - Extraer host/subdominio de la request
 * - Resolver tenant por slug o dominio custom
 * - Setear contexto de tenant (headers/cookies) para SSR
 * - Redirigir rutas inválidas (404)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveTenantBySlug, resolveTenantByDomain } from "@/lib/tenant/resolveTenant";
import { setTenantContext } from "@/lib/tenant/tenantContext";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "kitdigital.ar";
const ADMIN_SUBDOMAIN = "app";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // 1. Extraer subdominio o dominio completo
  const hostParts = host.split(".");
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  
  // 2. Determinar tipo de ruta
  let tenant: { id: string } | null = null;

  if (isLocalhost) {
    // En desarrollo, permitir continuar sin tenant (para testing)
    // En producción, esto no debería pasar
    return NextResponse.next();
  }

  // Caso 1: Admin (app.kitdigital.ar)
  if (hostParts[0] === ADMIN_SUBDOMAIN && hostParts[1] === ROOT_DOMAIN.split(".")[0]) {
    // Admin: el tenant se obtiene de la sesión/claim, no del dominio
    // Por ahora, permitir continuar (la autenticación se manejará en el layout)
    return NextResponse.next();
  }

  // Caso 2: Root domain (kitdigital.ar) - Landing
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) {
    // Landing: no necesita tenant
    return NextResponse.next();
  }

  // Caso 3: Subdominio ({slug}.kitdigital.ar)
  if (hostParts.length >= 2) {
    const subdomain = hostParts[0];
    const domain = hostParts.slice(1).join(".");

    if (domain === ROOT_DOMAIN) {
      // Intentar resolver por slug
      tenant = await resolveTenantBySlug(subdomain);
    }
  }

  // Caso 4: Dominio custom completo (si no se resolvió por subdominio)
  if (!tenant) {
    tenant = await resolveTenantByDomain(host);
  }

  // 3. Si no se encontró tenant, retornar 404
  if (!tenant) {
    return new NextResponse("Tenant no encontrado o inactivo", { status: 404 });
  }

  // 4. Setear contexto de tenant para SSR
  const response = NextResponse.next();
  setTenantContext(response, tenant.id);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

