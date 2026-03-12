# Spec 03: Módulos Potenciadores

**Fase**: 2 (Core)  
**Prioridad**: ALTA (sistema modular core)  
**Dependencias**: `spec-01-multitenancy-middleware.md` (debe estar completo)

## Referencias obligatorias

Antes de implementar, lee:
- `@/ai-instructions/01-master-document.md` (sección 5: Sistema de Módulos)
- `@/ai-instructions/02-schema.sql` (tabla: `tenant_modules`)
- `@/ai-instructions/05-project-structure.md` (ruta: `app/(admin)/modulos-potenciadores/`, `lib/modules/`, `hooks/useModules.ts`)

## Objetivo

Implementar el sistema de módulos con toggles: cada tenant puede activar/desactivar módulos con un switch iOS-like. El sistema debe mantener Core siempre activo y soportar configuración por módulo.

## Contexto

KitDigital.ar es modular:
- **Core**: Siempre activo (no se puede desactivar)
- **Módulos opcionales**: Stock, Ventas, Finanzas, Mayorista, Variantes y Marcas
- **Feature flags**: Los módulos controlan qué features están disponibles
- **Configuración**: Cada módulo puede tener `config` (jsonb) personalizado

## Estructura de implementación

### 1. Tipos de módulos

**Ubicación**: `lib/modules/moduleKeys.ts`

**Módulos disponibles**:
```typescript
export const MODULE_KEYS = {
  CORE: 'core',
  STOCK: 'stock',
  VENTAS: 'ventas',
  FINANZAS: 'finanzas',
  MAYORISTA: 'mayorista',
  VARIANTES: 'variantes',
} as const;

export type ModuleKey = typeof MODULE_KEYS[keyof typeof MODULE_KEYS];
```

### 2. Hook `useModules()`

**Ubicación**: `hooks/useModules.ts`

**Funcionalidades**:
- Obtener módulos activos del tenant actual
- Verificar si un módulo está activo: `isModuleActive('stock')`
- Activar/desactivar módulo: `toggleModule('stock', true)`
- Optimistic updates (UI inmediata)

**Estructura (alto nivel)**:
```typescript
// hooks/useModules.ts
export function useModules() {
  const { data: modules } = useQuery(...);
  
  const isModuleActive = (key: ModuleKey) => {
    // Verificar si módulo está activo
  };
  
  const toggleModule = async (key: ModuleKey, active: boolean) => {
    // Optimistic update + mutation
  };
  
  return { modules, isModuleActive, toggleModule };
}
```

### 3. Helper de acceso (`lib/modules/moduleAccess.ts`)

**Ubicación**: `lib/modules/moduleAccess.ts`

**Funciones**:
- `checkModuleAccess(tenantId: string, moduleKey: ModuleKey)`: Verificar acceso (server-side)
- `requireModule(tenantId: string, moduleKey: ModuleKey)`: Lanzar error si módulo no activo

### 4. Componente `ModuleToggle`

**Ubicación**: `components/ModuleToggle.tsx` (o en `app/(admin)/modulos-potenciadores/_components/`)

**Características**:
- Switch iOS-like (usar shadcn/ui `Switch`)
- Optimistic update (cambiar estado inmediatamente)
- Loading state durante mutation
- Error handling (revertir si falla)
- Deshabilitado para módulo Core

**Estructura (alto nivel)**:
```typescript
// components/ModuleToggle.tsx
export function ModuleToggle({ moduleKey, label, description }) {
  const { isModuleActive, toggleModule } = useModules();
  const [isLoading, setIsLoading] = useState(false);
  
  // Renderizar switch con estado
}
```

### 5. Página de Módulos Potenciadores

**Ubicación**: `app/(admin)/modulos-potenciadores/page.tsx`

**Contenido**:
- Lista de módulos disponibles
- Cada módulo con: nombre, descripción, toggle, estado
- Core siempre visible pero deshabilitado
- Layout mobile-first

**Estructura (alto nivel)**:
```typescript
// app/(admin)/modulos-potenciadores/page.tsx
export default function ModulosPotenciadoresPage() {
  const { modules } = useModules();
  
  return (
    <div>
      <h1>Módulos Potenciadores</h1>
      {MODULES_LIST.map(module => (
        <ModuleToggle key={module.key} {...module} />
      ))}
    </div>
  );
}
```

### 6. Inicialización de módulos

**Cuándo**: Al crear tenant (onboarding)

**Qué hacer**:
- Crear registro en `tenant_modules` para módulo Core con `active = true`
- Opcionalmente, crear registros para otros módulos con `active = false`

**Ubicación**: Edge Function de onboarding o migración inicial

## Checklist de implementación

### Tipos y helpers
- [ ] Crear `lib/modules/moduleKeys.ts` con tipos
- [ ] Crear `lib/modules/moduleAccess.ts` con helpers server-side
- [ ] Verificar que tipos coincidan con schema SQL

### Hook
- [ ] Crear `hooks/useModules.ts`
- [ ] Implementar query para obtener módulos activos
- [ ] Implementar `isModuleActive()`
- [ ] Implementar `toggleModule()` con optimistic update
- [ ] Manejar errores y revertir cambios si falla

### Componente
- [ ] Crear `ModuleToggle` component
- [ ] Integrar con shadcn/ui `Switch`
- [ ] Implementar loading state
- [ ] Implementar error handling
- [ ] Deshabilitar para módulo Core

### Página
- [ ] Crear `app/(admin)/modulos-potenciadores/page.tsx`
- [ ] Listar todos los módulos disponibles
- [ ] Mostrar estado actual de cada módulo
- [ ] Layout mobile-first
- [ ] Agregar descripciones de cada módulo

### Inicialización
- [ ] Crear módulo Core al crear tenant
- [ ] (Opcional) Crear otros módulos con `active = false`

### Testing
- [ ] Verificar que Core siempre está activo
- [ ] Verificar que se puede activar/desactivar módulos
- [ ] Verificar que cambios se persisten en DB
- [ ] Verificar que optimistic updates funcionan
- [ ] Verificar que errores se manejan correctamente
- [ ] Verificar que UI es responsive

## Notas importantes

1. **Core siempre activo**: No permitir desactivar módulo Core (validar en UI y backend)
2. **Optimistic updates**: Cambiar UI inmediatamente, revertir si falla mutation
3. **Config jsonb**: Por ahora solo `active`, pero `config` está disponible para futuro
4. **RLS**: Verificar que queries respeten `tenant_id` (RLS ya lo hace)
5. **Performance**: Cachear módulos activos (TanStack Query lo hace automáticamente)

## Módulos disponibles (inicial)

- **Core**: Siempre activo (catálogo básico)
- **Stock**: Gestión de inventario
- **Ventas**: Registro de ventas
- **Finanzas**: Ingresos y gastos
- **Mayorista**: Precios y clientes mayoristas
- **Variantes y Marcas**: Variantes de productos y gestión de marcas

## Próximos pasos

Una vez completado este spec:
- **Siguiente**: `spec-04-panel-admin.md` (Fase 2)
- **Requisito**: Este spec debe estar 100% funcional antes de avanzar

