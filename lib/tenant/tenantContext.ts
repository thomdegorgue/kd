/**
 * Helpers para manejar el contexto de tenant en requests
 * Usado en middleware y server components
 */

import { NextRequest, NextResponse } from "next/server";

const TENANT_ID_HEADER = "x-tenant-id";
const TENANT_ID_COOKIE = "tenant-id";

/**
 * Extrae el tenant_id de headers o cookies de la request
 * @param request - NextRequest
 * @returns tenant_id o null
 */
export function getTenantFromRequest(
  request: NextRequest
): string | null {
  // Prioridad: header > cookie
  const headerValue = request.headers.get(TENANT_ID_HEADER);
  if (headerValue) {
    return headerValue;
  }

  const cookieValue = request.cookies.get(TENANT_ID_COOKIE)?.value;
  if (cookieValue) {
    return cookieValue;
  }

  return null;
}

/**
 * Setea el contexto de tenant en headers y cookies de la response
 * @param response - NextResponse
 * @param tenantId - UUID del tenant
 * @returns NextResponse modificada
 */
export function setTenantContext(
  response: NextResponse,
  tenantId: string
): NextResponse {
  // Setear header para SSR
  response.headers.set(TENANT_ID_HEADER, tenantId);

  // Setear cookie para persistencia
  response.cookies.set(TENANT_ID_COOKIE, tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}

