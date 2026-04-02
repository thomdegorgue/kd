# Manejo de Errores — Protocolo

> Cómo capturar, propagar y mostrar errores. Nunca exponer errores internos al usuario.

---

## Mapa de ErrorCode → mensaje en español

El executor retorna `ErrorCode`. El frontend traduce antes de mostrar al usuario:

```typescript
// src/lib/utils/error-messages.ts
import type { ErrorCode } from '@/lib/types'

export const errorMessages: Record<ErrorCode, string> = {
  LIMIT_EXCEEDED:  'Alcanzaste el límite de tu plan actual. Actualizá para continuar.',
  MODULE_INACTIVE: 'Esta función no está disponible en tu plan actual.',
  STORE_INACTIVE:  'Tu tienda no está operativa en este momento.',
  UNAUTHORIZED:    'No tenés permiso para realizar esta acción.',
  NOT_FOUND:       'El elemento que buscás no existe o fue eliminado.',
  INVALID_INPUT:   'Los datos ingresados son inválidos.',
  CONFLICT:        'Ya existe un elemento con esos datos.',
  SYSTEM_ERROR:    'Ocurrió un error inesperado. Intentá de nuevo en unos minutos.',
}

export function getErrorMessage(code: ErrorCode, customMessage?: string): string {
  // Si hay un mensaje personalizado del executor (más específico), usarlo
  if (customMessage && customMessage !== code) return customMessage
  return errorMessages[code] ?? 'Ocurrió un error inesperado.'
}
```

### Cómo usar en componentes

```typescript
import { getErrorMessage } from '@/lib/utils/error-messages'
import { toast }           from 'sonner'

const result = await create{Entidad}Action(formData)
if (!result.success) {
  toast.error(getErrorMessage(result.error.code, result.error.message))
}
```

---

## Capas de manejo de errores

### Capa 1: Validación de formulario (UX)
Zod + React Hook Form. Errores de formato: "El nombre es requerido", "Email inválido".
**Nunca muestra errores del servidor aquí.**

```typescript
// React Hook Form ya maneja esto automáticamente con zodResolver
const form = useForm({ resolver: zodResolver(schema) })
```

### Capa 2: Server Action (ActionResult)
El executor retorna `ActionResult`. La Server Action lo propaga sin modificar.

```typescript
// Server Action
export async function createProductAction(formData: FormData): Promise<ActionResult<Product>> {
  // ... resolver store_id, actor ...
  return executor({ name: 'create_product', ... })
  // No wrappear en try/catch aquí: el executor ya maneja sus errores internos
}
```

### Capa 3: Componente (UI de error)
El componente lee el `ActionResult` y muestra feedback:

```typescript
if (result.success) {
  toast.success('Producto creado.')
  onClose()
} else {
  // Si el error tiene field, mostrarlo en el campo del formulario
  if (result.error.field) {
    form.setError(result.error.field as keyof FormValues, {
      message: getErrorMessage(result.error.code, result.error.message),
    })
  } else {
    toast.error(getErrorMessage(result.error.code, result.error.message))
  }
}
```

---

## Errores del executor (logging)

Los errores internos del executor se loggean con contexto:

```typescript
// En el executor (ya implementado)
} catch (error) {
  console.error('[executor] Error en ejecución:', {
    action: params.name,
    store_id: params.store_id,
    actor: params.actor.type,
    error,
  })
  return { success: false, error: { code: 'SYSTEM_ERROR', message: 'Error interno del servidor.' } }
}
```

**Regla de logging:**
```typescript
// ✅ Con prefijo de módulo y contexto
console.error('[webhook/mp] Error procesando:', { topic, mpId, error })
console.error('[executor] Error en ejecución:', { action, error })

// ❌ Sin contexto
console.log(error)
console.error('Error')
```

---

## Errores de Supabase → ActionResult

```typescript
// Patrón de conversión de error de Supabase a ActionResult
const { data, error } = await db.from('products').insert(values).select().single()

if (error) {
  // Error de constraint unique → CONFLICT
  if (error.code === '23505') {
    return { success: false, error: { code: 'CONFLICT', message: 'Ya existe un producto con ese nombre.' } }
  }
  // Error de FK → NOT_FOUND
  if (error.code === '23503') {
    return { success: false, error: { code: 'NOT_FOUND', message: 'La categoría seleccionada no existe.' } }
  }
  // Error genérico
  console.error('[products] Error en DB:', error)
  return { success: false, error: { code: 'SYSTEM_ERROR', message: 'Error al guardar el producto.' } }
}
```

**Códigos de error de PostgreSQL más comunes:**
| Código PG | Significado | ErrorCode a usar |
|-----------|-------------|-----------------|
| `23505` | Unique violation | `CONFLICT` |
| `23503` | FK violation | `NOT_FOUND` |
| `42501` | Insufficient privilege (RLS) | `UNAUTHORIZED` |
| `23502` | Not null violation | `INVALID_INPUT` |

---

## Error Boundaries en React

Para páginas completas del panel admin:

```typescript
// src/components/admin/shared/ErrorBoundary.tsx
'use client'

import { Component, type ReactNode } from 'react'

type Props    = { children: ReactNode; fallback?: ReactNode }
type State    = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] Error capturado:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="text-center py-12">
          <p className="text-gray-500">Ocurrió un error inesperado.</p>
          <button
            className="mt-4 text-brand-600 underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

---

## Checklist de manejo de errores

- [ ] El executor nunca expone errores crudos de Supabase al cliente
- [ ] Todo `ErrorCode` tiene su mensaje en español en `error-messages.ts`
- [ ] Los componentes usan `getErrorMessage()` para traducir antes de mostrar
- [ ] Los `console.error` tienen prefijo de módulo y contexto
- [ ] Los errores de PG se mapean a `ErrorCode` semánticos (no `SYSTEM_ERROR` para todo)
- [ ] No hay `throw new Error(...)` en Server Actions (retornar `ActionResult` con `success: false`)
