import { registerHandler } from '../registry'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ── get_dashboard_stats ────────────────────────────────────

registerHandler({
  name: 'get_dashboard_stats',
  requires: [],
  permissions: ['owner', 'admin', 'collaborator'],
  event_type: null,
  invalidates: [],
  validate: () => ({ valid: true }),
  execute: async (_input, context) => {
    const storeId = context.store_id

    // Counts en paralelo
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

    const [productsActiveRes, pendingOrdersRes, outOfStockRes, lastMonthOrdersRes, revenueMonthRes, salesTodayRes] =
      await Promise.all([
      db
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('is_active', true)
        .is('deleted_at', null),
      db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .in('status', ['pending', 'preparing']),
      db
        .from('stock_items')
        .select('product_id, quantity')
        .eq('store_id', storeId)
        .eq('track_stock', true),
      db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', monthStart),
      db
        .from('orders')
        .select('total')
        .eq('store_id', storeId)
        .neq('status', 'cancelled')
        .gte('created_at', monthStart),
      db
        .from('orders')
        .select('total')
        .eq('store_id', storeId)
        .neq('status', 'cancelled')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
    ])

    const revenue_month = (revenueMonthRes.data as { total: number }[] | null)?.reduce(
      (sum: number, o: { total: number }) => sum + (o.total ?? 0),
      0
    ) ?? 0

    const sales_today = (salesTodayRes.data as { total: number }[] | null)?.reduce(
      (sum: number, o: { total: number }) => sum + (o.total ?? 0),
      0
    ) ?? 0

    const outOfStockProductIds = new Set(
      ((outOfStockRes.data ?? []) as Array<{ product_id: string; quantity: number }>).filter(
        (r) => (r.quantity ?? 0) <= 0,
      ).map((r) => r.product_id),
    )

    return {
      products_active: productsActiveRes.count ?? 0,
      orders_pending: pendingOrdersRes.count ?? 0,
      out_of_stock: outOfStockProductIds.size,
      orders_month: lastMonthOrdersRes.count ?? 0,
      revenue_month,
      sales_today,
    }
  },
})
