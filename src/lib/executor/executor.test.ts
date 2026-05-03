import { vi, describe, it, expect, beforeAll } from 'vitest'

// Prevent real handler registration (side-effects in handlers.ts)
vi.mock('./handlers', () => ({}))

// Prevent real DB calls
vi.mock('@/lib/supabase/service-role', () => ({
  supabaseServiceRole: {
    from: () => ({
      insert: () => Promise.resolve({ data: {}, error: null }),
    }),
  },
}))

// Prevent redis calls (invalidation step)
vi.mock('@/lib/redis', () => ({
  redis: { del: vi.fn().mockResolvedValue(undefined) },
}))

import { executor } from './index'
import { registerHandler } from './registry'
import type { StoreContext } from '@/lib/types'

// ── Test handlers ────────────────────────────────────────────────
// Nota: nombres no pueden empezar con get_, list_, __test_ (esos son read-only para el executor)

beforeAll(() => {
  registerHandler({
    name: 'create_test_item',
    requires: [],
    permissions: ['owner'],
    event_type: null,
    invalidates: [],
    validate: () => ({ valid: true }),
    execute: async () => ({ ok: true }),
  })

  registerHandler({
    name: 'get_test_item',
    requires: [],
    permissions: ['owner'],
    event_type: null,
    invalidates: [],
    validate: () => ({ valid: true }),
    execute: async () => ({ ok: true }),
  })

  registerHandler({
    name: 'create_test_stock_item',
    requires: ['stock'],
    permissions: ['owner'],
    event_type: null,
    invalidates: [],
    validate: () => ({ valid: true }),
    execute: async () => ({ ok: true }),
  })

  registerHandler({
    name: 'create_test_product_at_limit',
    requires: [],
    permissions: ['owner'],
    limits: {
      field: 'max_products',
      countQuery: async () => 100, // siempre devuelve 100 (igual al límite)
    },
    event_type: null,
    invalidates: [],
    validate: () => ({ valid: true }),
    execute: async () => ({ ok: true }),
  })

  registerHandler({
    name: 'create_test_with_event',
    requires: [],
    permissions: ['owner'],
    event_type: 'test_event_fired',
    invalidates: [],
    validate: () => ({ valid: true }),
    execute: async () => ({ ok: true }),
  })
})

// ── Base context ─────────────────────────────────────────────────

const activeCtx: StoreContext = {
  store_id: 'store-001',
  slug: 'tienda-test',
  status: 'active',
  billing_status: 'active',
  modules: { catalog: true, products: true },
  limits: { max_products: 100, max_orders: 500, ai_tokens: 1000 },
  user_id: 'user-001',
  user_role: 'owner',
}

// ── Handler no encontrado ────────────────────────────────────────

describe('executor — handler no encontrado', () => {
  it('retorna SYSTEM_ERROR si la acción no existe', async () => {
    const result = await executor({
      name: 'action_que_no_existe',
      store_id: 'store-001',
      actor: { type: 'user', id: 'user-001' },
      input: {},
      context: activeCtx,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('SYSTEM_ERROR')
  })
})

// ── Tienda demo — solo lectura ───────────────────────────────────

describe('executor — tienda demo', () => {
  const demoCtx: StoreContext = { ...activeCtx, status: 'demo', billing_status: 'demo' }

  it('bloquea escrituras en tienda demo', async () => {
    const result = await executor({
      name: 'create_test_item',
      store_id: 'store-001',
      actor: { type: 'user', id: 'user-001' },
      input: {},
      context: demoCtx,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('STORE_INACTIVE')
  })

  it('permite lecturas en tienda demo (prefijo get_)', async () => {
    const result = await executor({
      name: 'get_test_item',
      store_id: 'store-001',
      actor: { type: 'user', id: 'user-001' },
      input: {},
      context: demoCtx,
    })
    expect(result.success).toBe(true)
  })

  it('superadmin puede escribir en tienda demo', async () => {
    const result = await executor({
      name: 'create_test_item',
      store_id: 'store-001',
      actor: { type: 'superadmin', id: 'sa-001' },
      input: {},
      context: demoCtx,
    })
    expect(result.success).toBe(true)
  })
})

// ── Tienda archivada/suspendida ──────────────────────────────────

describe('executor — tienda inactiva', () => {
  it('bloquea cualquier acción en tienda archivada', async () => {
    const ctx: StoreContext = { ...activeCtx, status: 'archived', billing_status: 'archived' }
    const result = await executor({
      name: 'create_test_item',
      store_id: 'store-001',
      actor: { type: 'user', id: 'user-001' },
      input: {},
      context: ctx,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('STORE_INACTIVE')
  })
})

// ── Módulo inactivo ──────────────────────────────────────────────

describe('executor — módulo inactivo', () => {
  it('retorna MODULE_INACTIVE cuando módulo requerido está inactivo', async () => {
    // baseCtx no tiene `stock`
    const result = await executor({
      name: 'create_test_stock_item',
      store_id: 'store-001',
      actor: { type: 'user', id: 'user-001' },
      input: {},
      context: activeCtx,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('MODULE_INACTIVE')
  })

  it('ejecuta correctamente cuando módulo requerido está activo', async () => {
    const ctx: StoreContext = {
      ...activeCtx,
      modules: { ...activeCtx.modules, stock: true },
    }
    const result = await executor({
      name: 'create_test_stock_item',
      store_id: 'store-001',
      actor: { type: 'user', id: 'user-001' },
      input: {},
      context: ctx,
    })
    expect(result.success).toBe(true)
  })
})

// ── Límite de productos ──────────────────────────────────────────

describe('executor — límite de productos', () => {
  it('retorna PRODUCT_LIMIT_REACHED cuando se alcanzó el cupo', async () => {
    // create_test_product_at_limit devuelve count=100, límite=100 → current >= max → bloquea
    const result = await executor({
      name: 'create_test_product_at_limit',
      store_id: 'store-001',
      actor: { type: 'user', id: 'user-001' },
      input: {},
      context: activeCtx, // limits.max_products = 100
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('PRODUCT_LIMIT_REACHED')
  })
})

// ── Actor no autenticado ─────────────────────────────────────────

describe('executor — actor sin autenticar', () => {
  it('retorna UNAUTHORIZED si actor.id es null y tipo es user', async () => {
    const result = await executor({
      name: 'create_test_item',
      store_id: 'store-001',
      actor: { type: 'user', id: null },
      input: {},
      context: activeCtx,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.code).toBe('UNAUTHORIZED')
  })
})
