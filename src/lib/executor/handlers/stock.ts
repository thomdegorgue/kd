import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { updateStockSchema } from '@/lib/validations/stock'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── list_stock ───────────────────────────────────────────────

registerHandler({
  name: 'list_stock',
  requires: ['stock'],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (input, context) => {
    const { low_stock_only, low_stock_threshold = 5 } = input as {
      low_stock_only?: boolean
      low_stock_threshold?: number
    }

    // Join products with stock_items (LEFT JOIN semantics via select)
    const { data: products, error: pErr } = await db
      .from('products')
      .select('id, name, image_url, is_active')
      .eq('store_id', context.store_id)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (pErr) throw new Error(pErr.message)

    const productIds = (products as { id: string }[]).map((p) => p.id)
    if (productIds.length === 0) return []

    const { data: stockItems, error: sErr } = await db
      .from('stock_items')
      .select('product_id, quantity, track_stock')
      .in('product_id', productIds)
      .eq('store_id', context.store_id)

    if (sErr) throw new Error(sErr.message)

    const stockMap = new Map<string, { quantity: number; track_stock: boolean }>(
      (stockItems as { product_id: string; quantity: number; track_stock: boolean }[]).map((s) => [
        s.product_id,
        { quantity: s.quantity, track_stock: s.track_stock },
      ])
    )

    const result = (products as { id: string; name: string; image_url: string | null; is_active: boolean }[]).map((p) => {
      const stock = stockMap.get(p.id) ?? { quantity: 0, track_stock: false }
      return { ...p, quantity: stock.quantity, track_stock: stock.track_stock }
    })

    if (low_stock_only) {
      return result.filter((p) => p.track_stock && p.quantity <= low_stock_threshold)
    }

    return result
  },
})

// ── get_stock ────────────────────────────────────────────────

registerHandler({
  name: 'get_stock',
  requires: ['stock'],
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
      .from('stock_items')
      .select('*')
      .eq('product_id', product_id)
      .eq('store_id', context.store_id)
      .single()

    if (error && error.code !== 'PGRST116') throw new Error(error.message)
    return data ?? { product_id, store_id: context.store_id, quantity: 0, track_stock: false }
  },
})

// ── update_stock ─────────────────────────────────────────────

registerHandler({
  name: 'update_stock',
  requires: ['stock'],
  permissions: ['owner', 'admin'],
  event_type: 'stock_updated',
  invalidates: ['stock:{store_id}'],
  validate: (input) => {
    const result = updateStockSchema.safeParse(input)
    if (!result.success) {
      const issue = result.error.issues[0]
      return { valid: false, code: 'INVALID_INPUT', message: issue.message, field: String(issue.path[0]) }
    }
    return { valid: true }
  },
  execute: async (input, context) => {
    const { product_id, quantity } = updateStockSchema.parse(input)

    // Upsert stock item
    const { data, error } = await db
      .from('stock_items')
      .upsert(
        { product_id, store_id: context.store_id, quantity, track_stock: true },
        { onConflict: 'product_id,store_id' }
      )
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },
})
