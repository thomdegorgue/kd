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

    const [productsRes, ordersMonthRes, customersRes, revenueRes, salesTodayRes] = await Promise.all([
      db
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .is('deleted_at', null),
      db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .gte('created_at', monthStart),
      db
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId),
      db
        .from('orders')
        .select('total')
        .eq('store_id', storeId)
        .gte('created_at', monthStart)
        .neq('status', 'cancelled'),
      db
        .from('orders')
        .select('total')
        .eq('store_id', storeId)
        .eq('source', 'admin')
        .neq('status', 'cancelled')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
    ])

    const revenue = (revenueRes.data as { total: number }[] | null)?.reduce(
      (sum: number, o: { total: number }) => sum + (o.total ?? 0),
      0
    ) ?? 0

    const sales_today = (salesTodayRes.data as { total: number }[] | null)?.reduce(
      (sum: number, o: { total: number }) => sum + (o.total ?? 0),
      0
    ) ?? 0

    return {
      products_count: productsRes.count ?? 0,
      orders_month: ordersMonthRes.count ?? 0,
      customers_count: customersRes.count ?? 0,
      revenue_month: revenue,
      sales_today,
    }
  },
})
