# Spec 07: Superadmin

**Fase**: 5 (Superadmin)  
**Prioridad**: MEDIA (herramientas internas)  
**Dependencias**: `spec-01-multitenancy-middleware.md`, `spec-04-panel-admin.md` (deben estar completos)

## Referencias obligatorias

Antes de implementar, lee:
- `@/ai-instructions/01-master-document.md` (sección 7.4: Superadmin, sección 8.5: PostHog)
- `@/ai-instructions/02-schema.sql` (función `is_superadmin()`, políticas RLS con bypass)
- `@/ai-instructions/05-project-structure.md` (rutas: `app/(superadmin)/`)

## Objetivo

Implementar el panel Superadmin: gestión de tenants, impersonación, y centro de datos con métricas.

## Contexto

El Superadmin es para operación interna:
- **Acceso**: Solo usuarios con `role = 'superadmin'` en JWT
- **Bypass RLS**: Puede ver todos los tenants
- **Impersonación**: Puede operar como cualquier tenant
- **Métricas**: Dashboard con datos agregados

## Estructura de implementación

### 1. Layout de Superadmin

**Ubicación**: `app/(superadmin)/layout.tsx`

**Responsabilidades**:
- Verificar que usuario tenga `role = 'superadmin'`
- Redirect a login si no es superadmin
- Renderizar shell del superadmin

**Estructura (alto nivel)**:
```typescript
// app/(superadmin)/layout.tsx
export default async function SuperadminLayout({ children }) {
  const session = await getSession();
  const role = session?.user?.user_metadata?.role;
  
  if (role !== 'superadmin') {
    redirect('/login');
  }
  
  // Renderizar shell
}
```

### 2. Lista de Tenants

**Ubicación**: `app/(superadmin)/tenants/page.tsx`

**Funcionalidades**:
- Lista completa de tenants
- Búsqueda por nombre, slug, email
- Filtros (activos, inactivos)
- Métricas básicas por tenant (productos, pedidos)
- Acción "Impersonar"

**Componente**: `app/(superadmin)/_components/TenantTable.tsx`

**Estructura (alto nivel)**:
```typescript
// app/(superadmin)/tenants/page.tsx
export default async function TenantsPage() {
  const tenants = await getAllTenants(); // Bypass RLS con service_role
  
  return <TenantTable tenants={tenants} />;
}
```

### 3. Detalle de Tenant

**Ubicación**: `app/(superadmin)/tenants/[tenantId]/page.tsx`

**Contenido**:
- Información completa del tenant
- Módulos activos
- Métricas detalladas
- Acciones (activar/desactivar, editar límites, etc.)

### 4. Impersonación

**Ubicación**: `app/(superadmin)/_components/ImpersonateButton.tsx`

**Funcionalidad**:
- Setear contexto de impersonación (cookie/header)
- Permitir operar como tenant específico
- Auditoría (opcional): registrar quién impersonó a quién

**Estructura (alto nivel)**:
```typescript
// app/(superadmin)/_components/ImpersonateButton.tsx
export function ImpersonateButton({ tenantId }) {
  const handleImpersonate = async () => {
    // Setear cookie/header con tenant_id
    // Redirect a admin del tenant
  };
}
```

### 5. Centro de Datos

**Ubicación**: `app/(superadmin)/centro-de-datos/page.tsx`

**Contenido**:
- Métricas agregadas (total tenants, productos, pedidos)
- Revenue (si hay suscripciones)
- Módulos más usados
- Gráficos (PostHog o custom)

**Integración PostHog** (opcional):
- Self-hosted PostHog
- Eventos: `tenant_created`, `product_created`, `order_sent_whatsapp`, `module_toggled`
- Dashboard con gráficos

### 6. Verificación de Rol

**Ubicación**: `lib/auth/checkSuperadmin.ts` (helper)

**Función**:
```typescript
// lib/auth/checkSuperadmin.ts
export async function isSuperadmin(): Promise<boolean> {
  const session = await getSession();
  return session?.user?.user_metadata?.role === 'superadmin';
}
```

## Checklist de implementación

### Layout y autenticación
- [ ] Crear `app/(superadmin)/layout.tsx`
- [ ] Implementar verificación de rol `superadmin`
- [ ] Redirect si no es superadmin
- [ ] Crear helper `isSuperadmin()`

### Lista de tenants
- [ ] Crear `app/(superadmin)/tenants/page.tsx`
- [ ] Crear componente `TenantTable`
- [ ] Implementar query a todos los tenants (bypass RLS)
- [ ] Implementar búsqueda y filtros
- [ ] Mostrar métricas básicas

### Detalle de tenant
- [ ] Crear `app/(superadmin)/tenants/[tenantId]/page.tsx`
- [ ] Mostrar información completa
- [ ] Mostrar módulos activos
- [ ] Implementar acciones (activar/desactivar, editar límites)

### Impersonación
- [ ] Crear componente `ImpersonateButton`
- [ ] Implementar seteo de contexto (cookie/header)
- [ ] Redirect a admin del tenant
- [ ] (Opcional) Implementar auditoría

### Centro de datos
- [ ] Crear `app/(superadmin)/centro-de-datos/page.tsx`
- [ ] Implementar métricas agregadas
- [ ] (Opcional) Integrar PostHog
- [ ] Crear gráficos básicos

### Testing
- [ ] Verificar que solo superadmin puede acceder
- [ ] Verificar que lista de tenants funciona
- [ ] Verificar que impersonación funciona
- [ ] Verificar que métricas se muestran correctamente
- [ ] Verificar que RLS bypass funciona

## Notas importantes

1. **Seguridad**: Verificar rol en cada request (no solo en layout)
2. **RLS bypass**: Usar `service_role_key` para queries que requieren ver todos los tenants
3. **Impersonación**: Setear contexto claramente para evitar confusión
4. **Auditoría**: Considerar registrar acciones de superadmin (opcional)
5. **PostHog**: Self-hosted preferiblemente (control de datos)

## Rutas del Superadmin

- `/tenants` - Lista de tenants
- `/tenants/[tenantId]` - Detalle de tenant
- `/centro-de-datos` - Dashboard de métricas

## Próximos pasos

Una vez completado este spec:
- **Siguiente**: Módulos adicionales (Finanzas, Mayorista, Variantes) o optimizaciones
- **Requisito**: Este spec debe estar 100% funcional antes de avanzar

