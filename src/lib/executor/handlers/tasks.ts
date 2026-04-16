import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { createTaskSchema, updateTaskSchema } from '@/lib/validations/task'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_tasks ───────────────────────────────────────────────

registerHandler({
  name: 'list_tasks',
  requires: ['tasks'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { status, assigned_to, page = 1, pageSize = 50 } = input as {
      status?: string
      assigned_to?: string
      page?: number
      pageSize?: number
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (status) query = query.eq('status', status)
    if (assigned_to) query = query.eq('assigned_to', assigned_to)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return { items: data ?? [], total: count ?? 0 }
  },
})

// ── create_task ──────────────────────────────────────────────

registerHandler({
  name: 'create_task',
  requires: ['tasks'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: ['tasks:{store_id}'],
  validate: (input) => {
    const result = createTaskSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const validated = createTaskSchema.parse(input)

    const { data, error } = await db
      .from('tasks')
      .insert({ ...validated, store_id: context.store_id, status: 'pending' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── update_task ──────────────────────────────────────────────

registerHandler({
  name: 'update_task',
  requires: ['tasks'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: ['tasks:{store_id}'],
  validate: (input) => {
    const result = updateTaskSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = updateTaskSchema.parse(input)

    const { data, error } = await db
      .from('tasks')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Tarea no encontrada')
    return data
  },
})

// ── complete_task ────────────────────────────────────────────

registerHandler({
  name: 'complete_task',
  requires: ['tasks'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: ['tasks:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { data, error } = await db
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Tarea no encontrada')
    return data
  },
})

// ── delete_task ──────────────────────────────────────────────

registerHandler({
  name: 'delete_task',
  requires: ['tasks'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['tasks:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { error } = await db
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { deleted: true }
  },
})
