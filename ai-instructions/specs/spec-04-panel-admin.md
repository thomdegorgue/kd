# Spec 04: Panel Admin

**Fase**: 2 (Core)  
**Prioridad**: ALTA (interfaz principal del cliente)  
**Dependencias**: `spec-01-multitenancy-middleware.md`, `spec-02-onboarding-ia.md` (deben estar completos)

## Referencias obligatorias

Antes de implementar, lee:
- `@/ai-instructions/01-master-document.md` (sección 6: Estructura Next.js, sección 8: Configuración)
- `@/ai-instructions/02-schema.sql` (todas las tablas, especialmente RLS)
- `@/ai-instructions/05-project-structure.md` (rutas: `app/(admin)/`)

## Objetivo

Implementar el Panel Admin básico: layout, navegación mobile-first, dashboard, y autenticación con Supabase Auth.

## Contexto

El Panel Admin es donde el cliente gestiona su catálogo:
- **Acceso**: `app.kitdigital.ar` (siempre autenticado)
- **Tenant**: Se obtiene de la sesión/claim JWT
- **Mobile-first**: 90% de usuarios desde celular
- **SPA-like**: Navegación rápida sin recargas completas

## Estructura de implementación

### 1. Layout de Admin

**Ubicación**: `app/(admin)/layout.tsx`

**Responsabilidades**:
- Verificar autenticación (redirect a login si no autenticado)
- Verificar que `tenant_id` esté en JWT
- Renderizar shell del admin (header, nav, contenido)
- Navegación mobile-first

**Estructura (alto nivel)**:
```typescript
// app/(admin)/layout.tsx
export default async function AdminLayout({ children }) {
  const session = await getSession();
  if (!session) redirect('/login');
  
  // Verificar tenant_id en JWT
  // Renderizar shell
}
```

### 2. Navegación Mobile

**Ubicación**: `components/MobileNav.tsx`

**Características**:
- Bottom navigation (mobile)
- Sidebar (desktop, opcional)
- Iconos claros
- Rutas principales: Dashboard, Productos, Categorías, Pedidos, Configuración

**Rutas principales**:
- `/dashboard` - Dashboard
- `/productos` - Gestión de productos
- `/categorias` - Gestión de categorías
- `/portada-principal` - Editor de Portada Principal
- `/modulos-potenciadores` - Toggles de módulos
- `/pedidos` - Lista de pedidos (WhatsApp)
- `/configuracion` - Configuración general

### 3. Dashboard

**Ubicación**: `app/(admin)/dashboard/page.tsx`

**Contenido inicial**:
- Resumen de productos activos
- Resumen de pedidos recientes
- Accesos rápidos a acciones comunes
- Métricas básicas (si módulos activos)

**Estructura (alto nivel)**:
```typescript
// app/(admin)/dashboard/page.tsx
export default async function DashboardPage() {
  const tenantId = getTenantId();
  
  // Queries a Supabase
  const products = await getProducts(tenantId);
  const orders = await getRecentOrders(tenantId);
  
  // Renderizar dashboard
}
```

### 4. Autenticación

**Ubicación**: `app/(auth)/login/page.tsx`, `app/(auth)/callback/page.tsx`

**Flujo**:
1. Login con Supabase Auth (email/password o OAuth)
2. Después de login, setear claims JWT (`tenant_id`, `role`)
3. Redirect a dashboard

**Nota**: El seteo de claims puede hacerse en:
- Edge Function de Supabase (recomendado)
- O en el callback después de login

### 5. Clientes Supabase

**Ubicación**: `lib/supabase/client.ts`, `lib/supabase/server.ts`

**Client (browser)**:
- Usar `anon key`
- Para queries públicas o autenticadas del cliente

**Server (RSC)**:
- Usar `service_role_key` (solo server)
- Para queries que requieren bypass de RLS o operaciones administrativas

**Estructura (alto nivel)**:
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 6. Tipos generados

**Ubicación**: `lib/supabase/types.ts`

**Generación**:
```bash
supabase gen types typescript --project-id <id> > lib/supabase/types.ts
```

**Uso**: Importar tipos desde aquí para type safety.

## Checklist de implementación

### Layout y navegación
- [ ] Crear `app/(admin)/layout.tsx`
- [ ] Implementar verificación de autenticación
- [ ] Implementar verificación de `tenant_id` en JWT
- [ ] Crear `components/MobileNav.tsx`
- [ ] Implementar bottom navigation (mobile)
- [ ] Implementar sidebar (desktop, opcional)
- [ ] Agregar rutas principales

### Dashboard
- [ ] Crear `app/(admin)/dashboard/page.tsx`
- [ ] Implementar queries a Supabase (productos, pedidos)
- [ ] Renderizar resumen básico
- [ ] Agregar accesos rápidos
- [ ] Layout mobile-first

### Autenticación
- [ ] Crear `app/(auth)/login/page.tsx`
- [ ] Implementar login con Supabase Auth
- [ ] Crear `app/(auth)/callback/page.tsx`
- [ ] Implementar seteo de claims JWT (`tenant_id`, `role`)
- [ ] Redirect a dashboard después de login

### Clientes Supabase
- [ ] Crear `lib/supabase/client.ts` (browser)
- [ ] Crear `lib/supabase/server.ts` (server)
- [ ] Generar tipos: `lib/supabase/types.ts`
- [ ] Verificar que tipos estén correctos

### Componentes base
- [ ] Crear `components/AppShell.tsx` (shell compartido)
- [ ] Crear `components/LoadingSkeletons.tsx` (skeletons de carga)
- [ ] Integrar shadcn/ui components necesarios

### Testing
- [ ] Verificar que autenticación funciona
- [ ] Verificar que `tenant_id` se setea correctamente
- [ ] Verificar que RLS funciona (solo ve datos del tenant)
- [ ] Verificar que navegación funciona en mobile
- [ ] Verificar que dashboard carga datos correctamente

## Notas importantes

1. **RLS**: Todas las queries deben respetar RLS (automático si usas `anon key` con JWT correcto)
2. **Claims JWT**: Asegurar que `tenant_id` y `role` estén en JWT después de login
3. **Mobile-first**: Priorizar UX en celular sobre desktop
4. **TanStack Query**: Usar para estado en Admin (caching, prefetch, optimistic updates)
5. **Server Components**: Usar por defecto; Client Components solo cuando sea necesario

## Rutas del Admin (inicial)

- `/dashboard` - Dashboard principal
- `/productos` - Lista de productos (Fase 3+)
- `/productos/nuevo` - Crear producto (Fase 3+)
- `/productos/[id]/editar` - Editar producto (Fase 3+)
- `/categorias` - Gestión de categorías (Fase 3+)
- `/portada-principal` - Editor de Portada Principal (Fase 3+)
- `/modulos-potenciadores` - Toggles de módulos (Spec 03)
- `/pedidos` - Lista de pedidos (Fase 3+)
- `/configuracion` - Configuración general (Fase 3+)

## Próximos pasos

Una vez completado este spec:
- **Siguiente**: `spec-05-vitrina-publica.md` (Fase 3)
- **Requisito**: Este spec debe estar 100% funcional antes de avanzar

