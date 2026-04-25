'use server'

import { executeAction } from './helpers'

export type DashboardStats = {
  products_active: number
  orders_pending: number
  out_of_stock: number
  orders_month: number
  revenue_month: number
  sales_today: number
}

export async function getDashboardStats() {
  return executeAction<DashboardStats>('get_dashboard_stats')
}
