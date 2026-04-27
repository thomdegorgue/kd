import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

// ============================================================
// TIPOS
// ============================================================

export type StoreRow = {
  id: string
  name: string
  slug: string
  status: string
  billing_status: string
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  mp_subscription_id: string | null
  limits: Record<string, number>
  modules: Record<string, boolean>
  config: Record<string, unknown>
  created_at: string
}

export type StoreListItem = {
  id: string
  name: string
  slug: string
  billing_status: string
  trial_ends_at: string | null
  current_period_end: string | null
  limits: Record<string, number>
  modules: Record<string, boolean>
  created_at: string
}

export type UserRow = {
  id: string
  email: string
  full_name: string | null
  role: string
  banned_at: string | null
  created_at: string
}

export type StoreListFilters = {
  billing_status?: string
  search?: string
  page?: number
  pageSize?: number
}

// ============================================================
// STORES
// ============================================================

export async function listStores(filters: StoreListFilters = {}): Promise<{
  items: StoreListItem[]
  total: number
}> {
  const { billing_status, search, page = 1, pageSize = 50 } = filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db
    .from('stores')
    .select(
      'id, name, slug, billing_status, trial_ends_at, current_period_end, limits, modules, created_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (billing_status) {
    query = query.eq('billing_status', billing_status)
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)
  return { items: (data ?? []) as StoreListItem[], total: count ?? 0 }
}

export async function getStoreDetail(storeId: string): Promise<StoreRow> {
  const { data, error } = await db
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single()

  if (error || !data) throw new Error('Tienda no encontrada')
  return data as StoreRow
}

// ============================================================
// USERS
// ============================================================

export async function listUsers(filters: { search?: string; page?: number; pageSize?: number } = {}): Promise<{
  items: UserRow[]
  total: number
}> {
  const { search, page = 1, pageSize = 50 } = filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db
    .from('users')
    .select('id, email, full_name, role, banned_at, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { items: (data ?? []) as UserRow[], total: count ?? 0 }
}

// ============================================================
// EVENTS
// ============================================================

export type EventRow = {
  id: string
  store_id: string | null
  type: string
  actor_type: string
  actor_id: string | null
  data: Record<string, unknown>
  created_at: string
  store?: { slug: string } | null
}

export async function listEvents(filters: {
  store_id?: string
  type?: string
  actor_type?: string
  page?: number
  pageSize?: number
} = {}): Promise<{ items: EventRow[]; total: number }> {
  const { store_id, type, actor_type, page = 1, pageSize = 50 } = filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db
    .from('events')
    .select('id, store_id, type, actor_type, actor_id, data, created_at, store:stores(slug)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (store_id) query = query.eq('store_id', store_id)
  if (type) query = query.eq('type', type)
  if (actor_type) query = query.eq('actor_type', actor_type)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { items: (data ?? []) as EventRow[], total: count ?? 0 }
}

// ============================================================
// WEBHOOKS
// ============================================================

export type WebhookLogRow = {
  id: string
  mp_event_id: string
  topic: string
  store_id: string | null
  status: string
  result: string | null
  error: string | null
  processing_time_ms: number | null
  processed_at: string | null
  created_at: string
  store?: { slug: string } | null
}

export async function listWebhookLogs(filters: {
  status?: string
  page?: number
  pageSize?: number
} = {}): Promise<{ items: WebhookLogRow[]; total: number }> {
  const { status, page = 1, pageSize = 50 } = filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db
    .from('billing_webhook_log')
    .select(
      'id, mp_event_id, topic, store_id, status, result, error, processing_time_ms, processed_at, created_at, store:stores(slug)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)
  return { items: (data ?? []) as WebhookLogRow[], total: count ?? 0 }
}

// ============================================================
// METRICS
// ============================================================

export async function getSuperadminMetrics(): Promise<{
  total: number
  active: number
  demo: number
  past_due: number
  archived: number
  conversionRate: number
}> {
  const { data, error } = await db
    .from('stores')
    .select('billing_status')

  if (error) throw new Error(error.message)

  const stores = (data ?? []) as Array<{ billing_status: string }>
  const active = stores.filter((s) => s.billing_status === 'active').length
  const demo = stores.filter((s) => s.billing_status === 'demo').length
  const past_due = stores.filter((s) => s.billing_status === 'past_due').length
  const archived = stores.filter((s) => s.billing_status === 'archived').length
  const total = stores.length
  const conversionBase = active + demo + past_due
  const conversionRate = conversionBase > 0 ? Math.round((active / conversionBase) * 100) : 0

  return { total, active, demo, past_due, archived, conversionRate }
}
