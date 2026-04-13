# START — Centro de Operaciones

Este archivo es el punto de entrada obligatorio para cualquier agente IA que trabaje en este proyecto. Leé este archivo completo antes de tocar una sola línea de código.

## Jerarquía de Verdad

Ante conflicto entre documentos, la prioridad es:

1. `system/` (especificación canónica)
2. `PLAN.md` (orden de ejecución)
3. `ESTADO.md` (estado actual)
4. Todo lo demás

## Protocolo de Inicio de Sesión

1. Leer `ESTADO.md` → identificar fase actual, paso actual, blockers
2. Leer el paso correspondiente en `PLAN.md`
3. Leer los archivos de `system/` que el paso referencia
4. Implementar exactamente lo que el paso indica
5. No avanzar al siguiente paso sin cumplir criterios de aceptación

## Protocolo de Fin de Sesión

1. Verificar `pnpm build` y `pnpm exec tsc --noEmit` sin errores
2. Actualizar `ESTADO.md`:
   - Marcar pasos completados con [x]
   - Registrar decisiones tomadas
   - Registrar blockers encontrados
   - Indicar qué sigue exactamente

## Reglas Innegociables

- **Runtime**: Node 22 + pnpm. Nunca npm ni yarn.
- **Tailwind**: v3 obligatorio. Fijar `"tailwindcss": "^3"` en package.json; no aceptar v4.
- **Subdominios**: en prod las rutas públicas se resuelven por subdominio `{slug}.kitdigital.ar` (Host header). En dev (`NODE_ENV=development`) se usa fallback path-based `localhost:3000/{slug}/*`. El middleware detecta el entorno y elige la estrategia.
- `/system` es la fuente de verdad. Si algo no está ahí, no existe.
- Toda escritura de dominio pasa por el executor.
- `store_id` se resuelve en servidor, nunca del cliente.
- Sin `any` en TypeScript.
- Toda entidad de dominio tiene `store_id`.
- Toda query filtra por `store_id`.
- La IA no ejecuta acciones directamente; pasa por el executor.
- Un módulo solo escribe en sus propias tablas.
- Los eventos son inmutables.
- Mobile-first siempre.

## Cómo Agregar una Feature Nueva

1. Definir en `system/modules.md` si es un módulo nuevo (acciones, límites, dependencias)
2. Agregar tablas necesarias en `schema.sql`
3. Registrar handler en el executor
4. Crear server actions que invocan el executor
5. Crear hooks de TanStack Query
6. Crear componentes UI
7. Agregar invalidaciones en `system/realtime.md`
8. Actualizar `ESTADO.md`

## Plantillas de Código

### Server Action

```typescript
'use server'

import { executor } from '@/lib/executor'
import { getStoreContext } from '@/lib/auth/store-context'
import { createActionSchema } from '@/lib/validations/schemas'

export async function createEntity(input: unknown) {
  const context = await getStoreContext()
  const validated = createActionSchema.parse(input)

  return executor({
    name: 'create_entity',
    store_id: context.store_id,
    actor: { type: 'user', id: context.user_id },
    input: validated,
  })
}
```

### Query Hook (TanStack)

```typescript
import { useQuery } from '@tanstack/react-query'
import { getEntities } from '@/lib/db/queries'
import { useStoreContext } from '@/lib/hooks/use-store-context'

export function useEntities(filters?: Filters) {
  const { store_id } = useStoreContext()

  return useQuery({
    queryKey: ['entities', store_id, filters],
    queryFn: () => getEntities(store_id, filters),
  })
}
```

### Mutation Hook con Invalidación

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntity } from '@/app/actions/entity'
import { useStoreContext } from '@/lib/hooks/use-store-context'
import { toast } from 'sonner'

export function useCreateEntity() {
  const queryClient = useQueryClient()
  const { store_id } = useStoreContext()

  return useMutation({
    mutationFn: createEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', store_id] })
      toast.success('Creado correctamente')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
```

### Componente Admin

```typescript
'use client'

import { useEntities } from '@/lib/hooks/use-entities'
import { DataTable } from '@/components/ui/data-table'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'

export function EntityList() {
  const { data, isLoading, error } = useEntities()

  if (isLoading) return <Skeleton className="h-96" />
  if (error) return <ErrorState error={error} />
  if (!data?.length) return <EmptyState entity="entities" />

  return <DataTable columns={columns} data={data} />
}
```

### Webhook Handler

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/billing/verify-signature'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  // Process webhook...

  return NextResponse.json({ received: true }, { status: 200 })
}
```
