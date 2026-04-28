'use server'

import { executeAction } from './helpers'
import { getStoreContext } from '@/lib/auth/store-context'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import type { CreateSaleInput } from '@/lib/validations/sale'
import type { ActionResult } from '@/lib/types'
import { ensureActionResultSerializable } from '@/lib/serialization/ensure-action-result'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

type SaleRow = {
  id: string
  total: number
  status: string
  source: string
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  customer: { id: string; name: string; phone: string | null } | null
}

export type DailySalesSummary = {
  total_sales: number
  total_orders: number
  by_method: Record<string, number>
  top_products: Array<{ name: string; quantity: number; total: number }>
}

export type SalesHistoryFilters = {
  page?: number
  pageSize?: number
  date_from?: string
  date_to?: string
}

export type SalesHistoryResult = {
  items: SaleRow[]
  total: number
}

function startOfDay(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfDay(date: Date): string {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export async function createSale(input: CreateSaleInput) {
  return executeAction<Record<string, unknown>>('create_sale', input)
}

/**
 * Resumen de ventas del día: total, count, breakdown por método de pago, top 5 productos.
 * Solo cuenta orders con source='admin'.
 */
export async function getDailySalesSummary(isoDate?: string): Promise<ActionResult<DailySalesSummary>> {
  try {
    const ctx = await getStoreContext()
    const target = isoDate ? new Date(isoDate) : new Date()
    const from = startOfDay(target)
    const to = endOfDay(target)

    const { data: orders, error: oErr } = await db
      .from('orders')
      .select('id, total, metadata')
      .eq('store_id', ctx.store_id)
      .eq('source', 'admin')
      .neq('status', 'cancelled')
      .gte('created_at', from)
      .lte('created_at', to)

    if (oErr) {
      return ensureActionResultSerializable({ success: false, error: { code: 'SYSTEM_ERROR', message: oErr.message } })
    }

    const rows = (orders as { id: string; total: number; metadata: Record<string, unknown> }[]) ?? []
    const orderIds = rows.map((o) => o.id)

    const by_method: Record<string, number> = {}
    let total_sales = 0
    for (const o of rows) {
      total_sales += o.total
      const method = String(o.metadata?.payment_method ?? 'other')
      by_method[method] = (by_method[method] ?? 0) + o.total
    }

    let top_products: DailySalesSummary['top_products'] = []
    if (orderIds.length > 0) {
      const { data: items, error: itemsErr } = await db
        .from('order_items')
        .select('product_name, quantity, unit_price')
        .in('order_id', orderIds)
        .eq('store_id', ctx.store_id)

      if (itemsErr) {
        return ensureActionResultSerializable({ success: false, error: { code: 'SYSTEM_ERROR', message: itemsErr.message } })
      }

      const agg = new Map<string, { name: string; quantity: number; total: number }>()
      for (const it of (items as { product_name: string; quantity: number; unit_price: number }[]) ?? []) {
        const current = agg.get(it.product_name) ?? { name: it.product_name, quantity: 0, total: 0 }
        current.quantity += it.quantity
        current.total += it.unit_price * it.quantity
        agg.set(it.product_name, current)
      }
      top_products = [...agg.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
    }

    return ensureActionResultSerializable({
      success: true,
      data: {
        total_sales,
        total_orders: rows.length,
        by_method,
        top_products,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cargar el resumen de ventas'
    return ensureActionResultSerializable({ success: false, error: { code: 'SYSTEM_ERROR', message } })
  }
}

/**
 * Historial de ventas paginado (source='admin').
 */
export async function getSalesHistory(filters: SalesHistoryFilters = {}): Promise<ActionResult<SalesHistoryResult>> {
  try {
    const ctx = await getStoreContext()
    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 25
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = db
      .from('orders')
      .select('id, total, status, source, notes, metadata, created_at, customer:customers(id, name, phone)', {
        count: 'exact',
      })
      .eq('store_id', ctx.store_id)
      .eq('source', 'admin')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (filters.date_from) query = query.gte('created_at', filters.date_from)
    if (filters.date_to) query = query.lte('created_at', filters.date_to)

    const { data, error, count } = await query
    if (error) {
      return ensureActionResultSerializable({ success: false, error: { code: 'SYSTEM_ERROR', message: error.message } })
    }

    return ensureActionResultSerializable({
      success: true,
      data: { items: (data ?? []) as SaleRow[], total: count ?? 0 },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al cargar el historial de ventas'
    return ensureActionResultSerializable({ success: false, error: { code: 'SYSTEM_ERROR', message } })
  }
}
