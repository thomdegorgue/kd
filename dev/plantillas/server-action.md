# Template — Server Action

> Las Server Actions son el puente entre el frontend y el executor.
> **Toda mutación de datos de dominio pasa por aquí → executor.**
> Leer antes: `/system/backend/backend-rules.md`

---

## Patrón base — Server Action con executor

```typescript
// src/app/(admin)/admin/{modulo}/actions.ts
'use server'

import { revalidatePath }  from 'next/cache'
import { createClient }    from '@/lib/supabase/server'
import { executor }        from '@/lib/executor'
import type { ActionResult } from '@/lib/types'

// ─── HELPER INTERNO: resolver store_id del usuario autenticado ────────────────
// NUNCA recibir store_id como parámetro del cliente.
async function getActorAndStore(): Promise<
  | { ok: true; userId: string; storeId: string }
  | { ok: false; error: ActionResult<never> }
> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()

  if (!user) {
    return {
      ok: false,
      error: { success: false, error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } },
    }
  }

  const { data: membership } = await db
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return {
      ok: false,
      error: { success: false, error: { code: 'UNAUTHORIZED', message: 'Sin tienda asociada.' } },
    }
  }

  return { ok: true, userId: user.id, storeId: membership.store_id }
}

// ─── SERVER ACTION: CREATE ────────────────────────────────────────────────────
export async function create{Entidad}Action(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {

  const ctx = await getActorAndStore()
  if (!ctx.ok) return ctx.error

  const result = await executor<{ id: string }>({
    name:     'create_{entidad}',
    store_id: ctx.storeId,
    actor:    { type: 'user', id: ctx.userId },
    input: {
      // {ADAPTAR}: mapear los campos del FormData al input del handler
      name:        formData.get('name') as string,
      price:       Number(formData.get('price')),      // ya en centavos
      description: formData.get('description') as string | null,
      image_url:   formData.get('image_url') as string | null,
      is_active:   formData.get('is_active') === 'true',
    },
  })

  if (result.success) {
    // {ADAPTAR}: invalidar la ruta correcta
    revalidatePath('/admin/{modulo}')
  }

  return result
}

// ─── SERVER ACTION: UPDATE ────────────────────────────────────────────────────
export async function update{Entidad}Action(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {

  const ctx = await getActorAndStore()
  if (!ctx.ok) return ctx.error

  const result = await executor<{ id: string }>({
    name:     'update_{entidad}',
    store_id: ctx.storeId,
    actor:    { type: 'user', id: ctx.userId },
    input: {
      id,
      // {ADAPTAR}: campos actualizables
      name:     formData.get('name') as string | undefined,
      is_active: formData.has('is_active')
        ? formData.get('is_active') === 'true'
        : undefined,
    },
  })

  if (result.success) {
    revalidatePath('/admin/{modulo}')
    revalidatePath(`/admin/{modulo}/${id}`)
  }

  return result
}

// ─── SERVER ACTION: DELETE ────────────────────────────────────────────────────
export async function delete{Entidad}Action(
  id: string
): Promise<ActionResult<{ id: string }>> {

  const ctx = await getActorAndStore()
  if (!ctx.ok) return ctx.error

  const result = await executor<{ id: string }>({
    name:     'delete_{entidad}',
    store_id: ctx.storeId,
    actor:    { type: 'user', id: ctx.userId },
    input:    { id },
  })

  if (result.success) {
    revalidatePath('/admin/{modulo}')
  }

  return result
}

// ─── SERVER ACTION: TOGGLE ACTIVO/INACTIVO ───────────────────────────────────
export async function toggle{Entidad}ActiveAction(
  id: string,
  is_active: boolean
): Promise<ActionResult<{ id: string }>> {

  const ctx = await getActorAndStore()
  if (!ctx.ok) return ctx.error

  return executor<{ id: string }>({
    name:     'update_{entidad}',
    store_id: ctx.storeId,
    actor:    { type: 'user', id: ctx.userId },
    input:    { id, is_active },
  })
}
```

---

## Patrón: Server Action de lectura (sin executor)

Las lecturas pueden ir directamente a Supabase, pero siempre con `store_id`.

```typescript
// src/app/(admin)/admin/{modulo}/actions.ts (continuación)

export async function list{Entidades}Action(): Promise<{entidad}[]> {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return []

  const { data: membership } = await db
    .from('store_users')
    .select('store_id')
    .eq('user_id', user.id)
    .single()
  if (!membership) return []

  const { data } = await db
    .from('{entidades}')
    .select('*')
    .eq('store_id', membership.store_id)   // SIEMPRE store_id
    .order('created_at', { ascending: false })
    .limit(100)

  return data ?? []
}
```

---

## Cómo usar en un componente cliente

```typescript
// Componente Client Component que llama a la Server Action
'use client'

import { useTransition } from 'react'
import { toast }         from 'sonner'
import { create{Entidad}Action } from './actions'

export function {Entidad}Form() {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await create{Entidad}Action(formData)
      if (result.success) {
        toast.success('{Entidad} creada correctamente.')
        // cerrar modal, limpiar form, etc.
      } else {
        toast.error(result.error.message)
      }
    })
  }

  return (
    <form action={handleSubmit}>
      {/* campos del formulario */}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}
```

---

## Patrón: optimistic update con TanStack Query

Para toggles (activo/inactivo) donde se necesita feedback instantáneo:

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggle{Entidad}ActiveAction } from './actions'

export function useToggle{Entidad}Active() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      toggle{Entidad}ActiveAction(id, is_active),

    // Optimistic update: actualizar UI antes de que el servidor responda
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ['{entidades}'] })
      const previous = queryClient.getQueryData(['{entidades}'])

      queryClient.setQueryData(['{entidades}'], (old: any[]) =>
        old?.map(item => item.id === id ? { ...item, is_active } : item) ?? []
      )

      return { previous }
    },

    onError: (_error, _vars, context) => {
      // Revertir si falla
      if (context?.previous) {
        queryClient.setQueryData(['{entidades}'], context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['{entidades}'] })
    },
  })
}
```

---

## Checklist de la Server Action

- [ ] Archivo tiene `'use server'` como primera línea
- [ ] `store_id` se resuelve desde `store_users` en el servidor, nunca del cliente
- [ ] Mutaciones usan `executor()`, lecturas pueden ir directo a Supabase
- [ ] Retorna `ActionResult<T>` para mutaciones
- [ ] `revalidatePath` llamado con rutas específicas después de mutaciones exitosas
- [ ] No hay `console.log` (solo `console.error` para errores inesperados)
- [ ] El archivo compila sin errores TypeScript
