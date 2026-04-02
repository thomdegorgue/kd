# Template — Hook TanStack Query

> Leer antes: `/system/frontend/frontend-rules.md` (Regla 8 — Optimistic updates)
> Los hooks de TanStack Query viven en `src/lib/hooks/use-{entidades}.ts`.

---

## Hook de lectura (useQuery)

```typescript
// src/lib/hooks/use-{entidades}.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  list{Entidades}Action,
  create{Entidad}Action,
  update{Entidad}Action,
  delete{Entidad}Action,
  toggle{Entidad}ActiveAction,
} from '@/app/(admin)/admin/{modulo}/actions'
import { toast } from 'sonner'

// {ADAPTAR}: tipo de la entidad
type {Entidad} = {
  id:        string
  name:      string
  is_active: boolean
  created_at: string
}

// ─── QUERY KEY FACTORY ────────────────────────────────────────────────────────
// Centralizar las keys evita inconsistencias en invalidación
export const {entidad}Keys = {
  all:    () => ['{entidades}'] as const,
  list:   () => [...{entidad}Keys.all(), 'list'] as const,
  detail: (id: string) => [...{entidad}Keys.all(), 'detail', id] as const,
}

// ─── HOOK DE LISTADO ──────────────────────────────────────────────────────────
export function use{Entidades}() {
  return useQuery({
    queryKey: {entidad}Keys.list(),
    queryFn:  list{Entidades}Action,
    staleTime: 30 * 1000,    // 30 segundos: los datos de listado se refrescan rápido
    retry: 1,
  })
}

// ─── HOOK DE DETALLE ──────────────────────────────────────────────────────────
export function use{Entidad}(id: string) {
  return useQuery({
    queryKey: {entidad}Keys.detail(id),
    queryFn:  () => get{Entidad}Action(id),
    staleTime: 60 * 1000,
    enabled:  !!id,         // no ejecutar si no hay id
  })
}
```

---

## Hook de mutación: create

```typescript
// (continuación del mismo archivo)

export function useCreate{Entidad}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (formData: FormData) => create{Entidad}Action(formData),

    onSuccess: () => {
      // Invalidar el listado para que se refresque
      queryClient.invalidateQueries({ queryKey: {entidad}Keys.list() })
      toast.success('{Entidad} creada correctamente.')
    },

    onError: (error) => {
      console.error('[use{Entidad}] Error al crear:', error)
      toast.error('Error al crear la {entidad}. Intentá de nuevo.')
    },
  })
}
```

---

## Hook de mutación: toggle activo/inactivo (con optimistic update)

```typescript
export function useToggle{Entidad}Active() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      toggle{Entidad}ActiveAction(id, is_active),

    // Optimistic update: cambia la UI antes de que el servidor responda
    onMutate: async ({ id, is_active }) => {
      // Cancelar queries en vuelo para evitar que sobreescriban el optimistic update
      await queryClient.cancelQueries({ queryKey: {entidad}Keys.list() })

      // Snapshot del estado anterior (para rollback si falla)
      const previous = queryClient.getQueryData<{Entidad}[]>({entidad}Keys.list())

      // Aplicar cambio optimista en el cache
      queryClient.setQueryData<{Entidad}[]>(
        {entidad}Keys.list(),
        (old) => old?.map(item =>
          item.id === id ? { ...item, is_active } : item
        ) ?? []
      )

      return { previous } // se pasa al onError
    },

    onError: (_error, _vars, context) => {
      // Revertir al estado anterior si el servidor rechaza el cambio
      if (context?.previous) {
        queryClient.setQueryData({entidad}Keys.list(), context.previous)
      }
      toast.error('Error al actualizar el estado. Intentá de nuevo.')
    },

    onSettled: () => {
      // Siempre refrescar después (éxito o error) para sincronizar con servidor
      queryClient.invalidateQueries({ queryKey: {entidad}Keys.list() })
    },
  })
}
```

---

## Hook de mutación: delete

```typescript
export function useDelete{Entidad}() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => delete{Entidad}Action(id),

    onSuccess: (_data, id) => {
      // Remover el ítem del cache inmediatamente
      queryClient.setQueryData<{Entidad}[]>(
        {entidad}Keys.list(),
        (old) => old?.filter(item => item.id !== id) ?? []
      )
      toast.success('{Entidad} eliminada.')
    },

    onError: () => {
      toast.error('Error al eliminar la {entidad}.')
    },
  })
}
```

---

## Cómo usar los hooks en un componente

```typescript
'use client'

import { use{Entidades}, useToggle{Entidad}Active, useDelete{Entidad} } from '@/lib/hooks/use-{entidades}'
import { Skeleton } from '@/components/ui/skeleton'

export function {Entidad}ListClient() {
  const { data: items, isLoading, isError } = use{Entidades}()
  const toggleActive = useToggle{Entidad}Active()
  const deleteItem   = useDelete{Entidad}()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-red-500">
        Error al cargar {'{'}entidades{'}'}. <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    )
  }

  return (
    <div>
      {items?.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <button onClick={() => toggleActive.mutate({ id: item.id, is_active: !item.is_active })}>
            {item.is_active ? 'Desactivar' : 'Activar'}
          </button>
          <button onClick={() => deleteItem.mutate(item.id)}>
            Eliminar
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## Notas importantes

**¿Cuándo usar TanStack Query vs. Server Components directos?**

| Situación | Usar |
|-----------|------|
| Página de listado inicial (carga estática) | Server Component + Server Action |
| Interactividad: toggle, delete, create inline | TanStack Query + Client Component |
| Datos que cambian frecuentemente en tiempo real | TanStack Query con `refetchInterval` |
| Modal de formulario con validación | React Hook Form en Client Component + mutation |

**`staleTime` recomendado por tipo de dato:**

| Tipo | staleTime |
|------|-----------|
| Configuración de tienda | `5 * 60 * 1000` (5 min) |
| Listado de productos | `30 * 1000` (30 seg) |
| Pedidos activos | `10 * 1000` (10 seg) |
| Stock | `15 * 1000` (15 seg) |

---

## Checklist del hook

- [ ] `queryKey` usa el factory `{entidad}Keys.*` (no strings sueltos)
- [ ] `staleTime` configurado explícitamente
- [ ] Optimistic update implementado para toggles (UX instantáneo)
- [ ] `onError` siempre muestra feedback al usuario con `toast.error`
- [ ] El `mutationFn` llama a una Server Action (no a Supabase directamente)
- [ ] `onSettled` invalida el cache para sincronizar con servidor
