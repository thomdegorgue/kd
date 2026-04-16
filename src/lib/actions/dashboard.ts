'use server'

import { executeAction } from './helpers'

export type DashboardStats = {
  products_count: number
  orders_month: number
  customers_count: number
  revenue_month: number
}

export async function getDashboardStats() {
  return executeAction<DashboardStats>('get_dashboard_stats')
}
