import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import {
  createVariantAttributeSchema,
  createVariantSchema,
  updateVariantSchema,
} from '@/lib/validations/variant'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_variant_attributes ──────────────────────────────────

registerHandler({
  name: 'list_variant_attributes',
  requires: ['variants'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: (input) => {
    const { product_id } = input as { product_id?: string }
    if (!product_id) return { valid: false, code: 'INVALID_INPUT', message: 'product_id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id } = input as { product_id: string }

    const { data: attrs, error } = await db
      .from('variant_attributes')
      .select('id, name, product_id')
      .eq('product_id', product_id)
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    if (!attrs || attrs.length === 0) return []

    const attrIds = (attrs as { id: string }[]).map((a) => a.id)

    const { data: values, error: vErr } = await db
      .from('variant_values')
      .select('id, attribute_id, value, sort_order')
      .in('attribute_id', attrIds)
      .order('sort_order', { ascending: true })

    if (vErr) throw new Error(vErr.message)

    const valuesMap = new Map<string, { id: string; value: string; sort_order: number }[]>()
    for (const v of (values as { id: string; attribute_id: string; value: string; sort_order: number }[] ?? [])) {
      const existing = valuesMap.get(v.attribute_id) ?? []
      existing.push({ id: v.id, value: v.value, sort_order: v.sort_order })
      valuesMap.set(v.attribute_id, existing)
    }

    return (attrs as { id: string; name: string; product_id: string }[]).map((a) => ({
      ...a,
      values: valuesMap.get(a.id) ?? [],
    }))
  },
})

// ── create_variant_attribute ─────────────────────────────────

registerHandler({
  name: 'create_variant_attribute',
  requires: ['variants'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['variants:{store_id}'],
  validate: (input) => {
    const result = createVariantAttributeSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id, name, values } = createVariantAttributeSchema.parse(input)

    const { data: attr, error: attrErr } = await db
      .from('variant_attributes')
      .insert({ product_id, name, store_id: context.store_id })
      .select()
      .single()

    if (attrErr) throw new Error(attrErr.message)

    const valueInserts = values.map((value, index) => ({
      attribute_id: (attr as { id: string }).id,
      store_id: context.store_id,
      value,
      sort_order: index,
    }))

    const { data: insertedValues, error: valErr } = await db
      .from('variant_values')
      .insert(valueInserts)
      .select()

    if (valErr) throw new Error(valErr.message)

    return { ...attr, values: insertedValues ?? [] }
  },
})

// ── list_variants ────────────────────────────────────────────

registerHandler({
  name: 'list_variants',
  requires: ['variants'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: (input) => {
    const { product_id } = input as { product_id?: string }
    if (!product_id) return { valid: false, code: 'INVALID_INPUT', message: 'product_id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id } = input as { product_id: string }

    const { data, error } = await db
      .from('variants')
      .select('*')
      .eq('product_id', product_id)
      .eq('store_id', context.store_id)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return data ?? []
  },
})

// ── create_variant ───────────────────────────────────────────

registerHandler({
  name: 'create_variant',
  requires: ['variants'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['variants:{store_id}'],
  validate: (input) => {
    const result = createVariantSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id, sku, price_override, is_active, attribute_value_ids } = createVariantSchema.parse(input)

    // Build label from attribute values
    const { data: valueRows } = await db
      .from('variant_values')
      .select('value')
      .in('id', attribute_value_ids)

    const label = (valueRows as { value: string }[] ?? []).map((v) => v.value).join(' / ')

    const { data: variant, error } = await db
      .from('variants')
      .insert({
        product_id,
        store_id: context.store_id,
        sku: sku ?? null,
        price_override: price_override ?? null,
        is_active: is_active ?? true,
        label,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return variant
  },
})

// ── update_variant ───────────────────────────────────────────

registerHandler({
  name: 'update_variant',
  requires: ['variants'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['variants:{store_id}'],
  validate: (input) => {
    const result = updateVariantSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id, ...fields } = updateVariantSchema.parse(input)

    const { data, error } = await db
      .from('variants')
      .update(fields)
      .eq('id', id)
      .eq('store_id', context.store_id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Variante no encontrada')
    return data
  },
})

// ── delete_variant ───────────────────────────────────────────

registerHandler({
  name: 'delete_variant',
  requires: ['variants'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['variants:{store_id}'],
  validate: (input) => {
    const { id } = input as { id?: string }
    if (!id) return { valid: false, code: 'INVALID_INPUT', message: 'id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { id } = input as { id: string }

    const { error } = await db
      .from('variants')
      .delete()
      .eq('id', id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { deleted: true }
  },
})
