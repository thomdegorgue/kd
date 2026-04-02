# Template — Handler del Executor

> Copiar este template y adaptar todas las secciones marcadas con `{ADAPTAR}`.
> Leer antes: `/system/core/action-contract.md`, `/system/backend/execution-model.md`, `/system/modules/{modulo}.md`

---

## Archivo: `src/lib/handlers/{modulo}/{verbo}-{entidad}.ts`

```typescript
import { registry }    from '@/lib/executor/registry'
import { z }           from 'zod'
import type { StoreContext, ActionResult } from '@/lib/types'

// ─── 1. SCHEMA DE VALIDACIÓN ─────────────────────────────────────────────────
// Campos según /system/modules/{modulo}.md → sección Actions → input de {verbo}_{entidad}
const schema = z.object({
  // {ADAPTAR}: agregar los campos requeridos del módulo
  // Ejemplos:
  name:        z.string().min(1, 'El nombre es requerido').max(100),
  price:       z.number().int().positive('El precio debe ser mayor a 0'), // en centavos
  description: z.string().max(1000).optional(),
  image_url:   z.string().url().optional().nullable(),
  is_active:   z.boolean().default(true),
})

type Input = z.infer<typeof schema>

// ─── 2. REGISTRAR HANDLER ────────────────────────────────────────────────────
registry.register({

  // {ADAPTAR}: nombre en snake_case, formato {verbo}_{entidad}
  // Verbos canónicos: create, update, delete, get, list, enable, disable, archive, process
  name: 'create_{entidad}',

  // {ADAPTAR}: módulos que deben estar activos en la tienda para ejecutar esta action
  // Módulos CORE (catalog, cart, products, categories) tienen requires: []
  // Ver /system/modules/{modulo}.md → sección Dependencies
  requires: [] as const,

  // {ADAPTAR}: quién puede ejecutar esta action
  // Opciones: 'user', 'superadmin', 'system', 'ai'
  permissions: ['user'] as const,

  // {ADAPTAR}: límite del plan que aplica. null si no hay límite.
  // field: clave en store.limits (max_products, max_orders, ai_tokens)
  // table: tabla donde se cuenta
  limits: { field: 'max_{entidades}', table: '{entidades}' },
  // Si no aplica límite: limits: undefined

  // {ADAPTAR}: tipo de evento que emite. null si no emite evento.
  // Formato: {entidad}_{verbo_pasado} según /system/core/events.md
  event_type: '{entidad}_created',

  // {ADAPTAR}: claves de cache de Redis que se deben invalidar tras la ejecución
  // Patrón: 'store:{store_id}:{recurso}:{scope}'
  invalidates: ['store:{store_id}:{entidad}s:public'],

  // ─── VALIDACIÓN DE NEGOCIO ──────────────────────────────────────────────────
  // Solo lógica de negocio aquí. El executor ya validó módulos, límites y permisos.
  // NO duplicar validaciones del schema Zod.
  validate: async (input: unknown, ctx: StoreContext): Promise<ActionResult<null>> => {
    const parsed = schema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: parsed.error.errors[0].message,
          field: parsed.error.errors[0].path[0] as string,
        },
      }
    }

    // {ADAPTAR}: validaciones de negocio específicas del módulo
    // Ejemplos:
    // - Verificar que una categoría_id pertenece a la tienda
    // - Verificar que el slug es único
    // - Verificar que no hay conflictos con otros registros

    return { success: true, data: null }
  },

  // ─── EJECUCIÓN ──────────────────────────────────────────────────────────────
  // Recibe input ya validado. El db es el cliente server de Supabase.
  // SIEMPRE filtrar por store_id en toda query.
  execute: async (input: unknown, ctx: StoreContext, db: unknown) => {
    const supabase = db as Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>
    const data = schema.parse(input) // safe: ya pasó validate

    // {ADAPTAR}: implementar la lógica de la action
    const { data: resultado, error } = await supabase
      .from('{entidades}')
      .insert({
        store_id: ctx.store_id,         // OBLIGATORIO: siempre incluir store_id
        // {ADAPTAR}: mapear campos del input a columnas de la tabla
        name:     data.name,
        price:    data.price,
        description: data.description ?? null,
        image_url:   data.image_url ?? null,
        is_active:   data.is_active,
      })
      .select()
      .single()

    if (error) throw error
    return resultado
  },
})
```

---

## Variante: handler de UPDATE

```typescript
const updateSchema = z.object({
  id:   z.string().uuid('ID inválido'),
  // {ADAPTAR}: campos actualizables (todos opcionales)
  name:     z.string().min(1).max(100).optional(),
  price:    z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
})

registry.register({
  name: 'update_{entidad}',
  requires: [],
  permissions: ['user'],
  limits: undefined,
  event_type: '{entidad}_updated',
  invalidates: ['store:{store_id}:{entidad}s:public'],

  validate: async (input, ctx) => {
    const parsed = updateSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_INPUT', message: parsed.error.errors[0].message } }
    }
    // Verificar que el registro pertenece a la tienda
    const { count } = await (ctx as any).db
      .from('{entidades}')
      .select('*', { count: 'exact', head: true })
      .eq('id', parsed.data.id)
      .eq('store_id', ctx.store_id)
    if (!count) {
      return { success: false, error: { code: 'NOT_FOUND', message: '{Entidad} no encontrada.' } }
    }
    return { success: true, data: null }
  },

  execute: async (input, ctx, db) => {
    const supabase = db as any
    const { id, ...fields } = updateSchema.parse(input)
    const { data, error } = await supabase
      .from('{entidades}')
      .update(fields)
      .eq('id', id)
      .eq('store_id', ctx.store_id)    // DOBLE FILTRO: id + store_id
      .select()
      .single()
    if (error) throw error
    return data
  },
})
```

---

## Variante: handler de DELETE

```typescript
registry.register({
  name: 'delete_{entidad}',
  requires: [],
  permissions: ['user'],
  limits: undefined,
  event_type: '{entidad}_deleted',
  invalidates: ['store:{store_id}:{entidad}s:public'],

  validate: async (input, ctx) => {
    const parsed = z.object({ id: z.string().uuid() }).safeParse(input)
    if (!parsed.success) {
      return { success: false, error: { code: 'INVALID_INPUT', message: 'ID inválido.' } }
    }
    return { success: true, data: null }
  },

  execute: async (input, ctx, db) => {
    const supabase = db as any
    const { id } = input as { id: string }
    const { error } = await supabase
      .from('{entidades}')
      .delete()
      .eq('id', id)
      .eq('store_id', ctx.store_id)    // SIEMPRE incluir store_id en delete
    if (error) throw error
    return { id }
  },
})
```

---

## Variante: handler de LIST

```typescript
registry.register({
  name: 'list_{entidades}',
  requires: [],
  permissions: ['user', 'ai'],
  limits: undefined,
  event_type: null,                    // los listados no emiten eventos
  invalidates: [],                     // los listados no invalidan cache

  validate: async () => ({ success: true, data: null }),

  execute: async (input, ctx, db) => {
    const supabase = db as any
    const { data, error } = await supabase
      .from('{entidades}')
      .select('*')
      .eq('store_id', ctx.store_id)    // OBLIGATORIO
      .order('created_at', { ascending: false })
      .limit(100)                      // SIEMPRE poner límite
    if (error) throw error
    return data ?? []
  },
})
```

---

## Registro en el punto de entrada

Todos los handlers se registran importando sus archivos en:

```typescript
// src/lib/handlers/index.ts
// Importar para ejecutar el registro (side-effects)
import './catalog/create-store'
import './products/create-product'
import './products/update-product'
// ... etc
```

Este archivo se importa una vez en el executor o en el root layout del servidor.

---

## Checklist del handler

- [ ] `name` cumple patrón `{verbo}_{entidad}` de `domain-language.md`
- [ ] `requires` lista los módulos necesarios (vacío si es CORE)
- [ ] `permissions` solo incluye roles que tienen sentido para esta action
- [ ] `limits` configurado si la action puede exceder un límite del plan
- [ ] `event_type` existe en `events.md` (o es `null` para lecturas)
- [ ] `invalidates` lista las keys de Redis afectadas (vacío para lecturas)
- [ ] `validate` retorna `INVALID_INPUT` con campo específico cuando aplica
- [ ] `execute` tiene `.eq('store_id', ctx.store_id)` en TODA query
- [ ] No hay `any` explícito (solo `as` para el cast de `db`)
- [ ] El archivo compila sin errores TypeScript
