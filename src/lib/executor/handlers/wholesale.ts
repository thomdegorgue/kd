import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { setWholesalePriceSchema } from '@/lib/validations/wholesale'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_wholesale_prices ────────────────────────────────────

registerHandler({
  name: 'list_wholesale_prices',
  requires: ['wholesale'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    // Join products with their wholesale prices
    const { data: products, error: pErr } = await db
      .from('products')
      .select('id, name, price, image_url')
      .eq('store_id', context.store_id)
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (pErr) throw new Error(pErr.message)

    const productIds = (products as { id: string }[]).map((p) => p.id)
    if (productIds.length === 0) return []

    const { data: wpItems, error: wpErr } = await db
      .from('wholesale_prices')
      .select('product_id, price, min_quantity')
      .in('product_id', productIds)
      .eq('store_id', context.store_id)

    if (wpErr) throw new Error(wpErr.message)

    const wpMap = new Map<string, { price: number; min_quantity: number | null }>(
      (wpItems as { product_id: string; price: number; min_quantity: number | null }[]).map((w) => [
        w.product_id,
        { price: w.price, min_quantity: w.min_quantity },
      ])
    )

    return (products as { id: string; name: string; price: number; image_url: string | null }[]).map((p) => ({
      ...p,
      wholesale_price: wpMap.get(p.id)?.price ?? null,
      min_quantity: wpMap.get(p.id)?.min_quantity ?? null,
    }))
  },
})

// ── set_wholesale_price ──────────────────────────────────────

registerHandler({
  name: 'set_wholesale_price',
  requires: ['wholesale'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['wholesale:{store_id}'],
  validate: (input) => {
    const result = setWholesalePriceSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id, price, min_quantity } = setWholesalePriceSchema.parse(input)

    const { data, error } = await db
      .from('wholesale_prices')
      .upsert(
        { product_id, store_id: context.store_id, price, min_quantity: min_quantity ?? null },
        { onConflict: 'product_id,store_id' }
      )
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})

// ── delete_wholesale_price ───────────────────────────────────

registerHandler({
  name: 'delete_wholesale_price',
  requires: ['wholesale'],
  permissions: ['owner', 'admin'],
  event_type: null,
  invalidates: ['wholesale:{store_id}'],
  validate: (input) => {
    const { product_id } = input as { product_id?: string }
    if (!product_id) return { valid: false, code: 'INVALID_INPUT', message: 'product_id es requerido' }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id } = input as { product_id: string }

    const { error } = await db
      .from('wholesale_prices')
      .delete()
      .eq('product_id', product_id)
      .eq('store_id', context.store_id)

    if (error) throw new Error(error.message)
    return { deleted: true }
  },
})
