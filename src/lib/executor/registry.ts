import type { ModuleName, StoreUserRole, ActorType, StoreContext } from '@/lib/types'

// ============================================================
// TIPOS DEL HANDLER
// ============================================================

export type ValidationResult =
  | { valid: true }
  | { valid: false; code: string; message: string; field?: string }

export type ActionHandler<TInput = unknown, TOutput = unknown> = {
  name: string
  requires: ModuleName[]
  permissions: (StoreUserRole | Exclude<ActorType, 'user'>)[]
  limits?: {
    field: 'max_products' | 'max_orders' | 'ai_tokens'
    countQuery: (storeId: string) => Promise<number>
  }
  event_type: string | null
  invalidates: string[]
  validate: (input: unknown, context: StoreContext) => ValidationResult
  execute: (input: TInput, context: StoreContext) => Promise<TOutput>
}

// ============================================================
// REGISTRY
// ============================================================

const registry = new Map<string, ActionHandler>()

export function registerHandler(handler: ActionHandler): void {
  if (registry.has(handler.name)) {
    throw new Error(`Handler '${handler.name}' ya está registrado`)
  }
  registry.set(handler.name, handler)
}

export function getHandler(name: string): ActionHandler | undefined {
  return registry.get(name)
}

export function listHandlers(): string[] {
  return [...registry.keys()]
}
