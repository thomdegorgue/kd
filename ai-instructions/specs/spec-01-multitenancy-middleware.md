# Spec 01: Multitenancy + Middleware

**Fase**: 1 (Base)  
**Prioridad**: CRÍTICA (fundación del sistema)  
**Dependencias**: Ninguna

## Referencias obligatorias

Antes de implementar, lee:
- `@/ai-instructions/01-master-document.md` (sección 3: Multitenancy)
- `@/ai-instructions/02-schema.sql` (tabla `tenants`, funciones `current_tenant_id()`, `is_superadmin()`)
- `@/ai-instructions/05-project-structure.md` (ruta: `middleware.ts`, `lib/tenant/`)

## Objetivo

Implementar la resolución de tenant por subdominio/dominio y el middleware que setea el contexto correcto para todas las requests.

## Contexto

KitDigital.ar es multitenant:
- **Una sola base de datos** (Supabase Postgres)
- **Aislamiento por `tenant_id`** usando RLS
- **Resolución por dominio**: `{slug}.kitdigital.ar` o dominio custom
- **Admin**: `app.kitdigital.ar` (tenant por sesión/claim)

## Estructura de implementación

### 1. Middleware (`middleware.ts`)

**Ubicación**: Root del proyecto (`/middleware.ts`)

**Responsabilidades**:
- Extraer host/subdominio de la request
- Resolver `tenant.slug → tenant.id` (query a Supabase)
- Setear contexto de tenant (headers/cookies) para SSR
- Redirigir rutas inválidas (404)
- Manejar dominio custom si existe

**Estructura (alto nivel)**:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // 1. Extraer host
  // 2. Determinar si es público o admin
  // 3. Si público: resolver tenant por slug
  // 4. Setear headers/cookies con tenant_id
  // 5. Continuar request
}
```

### 2. Resolución de tenant (`lib/tenant/resolveTenant.ts`)

**Ubicación**: `lib/tenant/resolveTenant.ts`

**Funciones**:
- `resolveTenantBySlug(slug: string)`: Query a `tenants` por `slug`
- `resolveTenantByDomain(domain: string)`: Query a `tenants` por `custom_domain`
- Cachear resultados (opcional, para performance)

**Estructura (alto nivel)**:
```typescript
// lib/tenant/resolveTenant.ts
export async function resolveTenantBySlug(slug: string): Promise<Tenant | null> {
  // Query a Supabase: SELECT * FROM tenants WHERE slug = $1 AND is_active = true
}
```

### 3. Contexto de tenant (`lib/tenant/tenantContext.ts`)

**Ubicación**: `lib/tenant/tenantContext.ts`

**Funciones**:
- `getTenantFromRequest(request: NextRequest)`: Extrae tenant_id de headers/cookies
- `setTenantContext(response: NextResponse, tenantId: string)`: Setea headers/cookies

### 4. Tipos (`types/domain.ts`)

**Ubicación**: `types/domain.ts`

**Tipos necesarios**:
```typescript
export type Tenant = {
  id: string;
  slug: string;
  name: string;
  whatsapp: string;
  primary_color: string;
  custom_domain: string | null;
  // ... más campos del schema
}
```

## Checklist de implementación

### Middleware
- [ ] Crear `middleware.ts` en root
- [ ] Extraer host de `request.headers.get('host')`
- [ ] Detectar si es subdominio (`{slug}.kitdigital.ar`) o admin (`app.kitdigital.ar`)
- [ ] Implementar resolución de tenant por slug
- [ ] Implementar resolución de tenant por dominio custom
- [ ] Setear headers/cookies con `tenant_id`
- [ ] Manejar casos de tenant no encontrado (404)
- [ ] Manejar casos de tenant inactivo (404)

### Utilidades
- [ ] Crear `lib/tenant/resolveTenant.ts`
- [ ] Implementar `resolveTenantBySlug()`
- [ ] Implementar `resolveTenantByDomain()`
- [ ] Crear `lib/tenant/tenantContext.ts`
- [ ] Implementar helpers de contexto
- [ ] Crear tipos en `types/domain.ts`

### Testing
- [ ] Verificar que subdominio resuelve correctamente
- [ ] Verificar que dominio custom resuelve correctamente
- [ ] Verificar que tenant inactivo retorna 404
- [ ] Verificar que tenant inexistente retorna 404
- [ ] Verificar que contexto se setea correctamente

## Notas importantes

1. **Performance**: Considerar cachear resultados de resolución (Redis o in-memory)
2. **Seguridad**: Nunca confiar solo en el middleware; siempre validar `tenant_id` en queries
3. **RLS**: El middleware setea contexto, pero RLS es la primera línea de defensa
4. **Admin**: En `app.kitdigital.ar`, el tenant se obtiene de la sesión/claim, no del dominio

## Próximos pasos

Una vez completado este spec:
- **Siguiente**: `spec-02-onboarding-ia.md` (Fase 2)
- **Requisito**: Este spec debe estar 100% funcional antes de avanzar

