import type { Database } from './database'

// ============================================================
// ROW TYPES — una línea por tabla
// ============================================================

export type User = Database['public']['Tables']['users']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type StoreUser = Database['public']['Tables']['store_users']['Row']
export type StoreInvitation = Database['public']['Tables']['store_invitations']['Row']
export type BillingPayment = Database['public']['Tables']['billing_payments']['Row']
export type BillingWebhookLog = Database['public']['Tables']['billing_webhook_log']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type ProductCategory = Database['public']['Tables']['product_categories']['Row']
export type Banner = Database['public']['Tables']['banners']['Row']
export type Variant = Database['public']['Tables']['variants']['Row']
export type VariantAttribute = Database['public']['Tables']['variant_attributes']['Row']
export type VariantValue = Database['public']['Tables']['variant_values']['Row']
export type StockItem = Database['public']['Tables']['stock_items']['Row']
export type WholesalePrice = Database['public']['Tables']['wholesale_prices']['Row']
export type ShippingMethod = Database['public']['Tables']['shipping_methods']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type Shipment = Database['public']['Tables']['shipments']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type FinanceEntry = Database['public']['Tables']['finance_entries']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type SavingsAccount = Database['public']['Tables']['savings_accounts']['Row']
export type SavingsMovement = Database['public']['Tables']['savings_movements']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type AssistantSession = Database['public']['Tables']['assistant_sessions']['Row']
export type AssistantMessage = Database['public']['Tables']['assistant_messages']['Row']
export type Event = Database['public']['Tables']['events']['Row']

// ============================================================
// ENUM TYPES
// ============================================================

export type UserRole = 'user' | 'superadmin'
export type StoreUserRole = 'owner' | 'admin' | 'collaborator'
export type StoreStatus = 'demo' | 'active' | 'past_due' | 'suspended' | 'archived'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'
export type ShipmentStatus = 'preparing' | 'in_transit' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'mp' | 'other'
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'cancelled'
export type FinanceEntryType = 'income' | 'expense'
export type RecurrencePeriod = 'monthly' | 'weekly' | 'annual'
export type MessageRole = 'user' | 'assistant'
export type ActorType = 'user' | 'superadmin' | 'system' | 'ai'
export type BillingPaymentStatus = 'approved' | 'rejected' | 'pending' | 'refunded'
export type WebhookStatus = 'pending' | 'processed' | 'failed'

export type ModuleName =
  | 'catalog'
  | 'cart'
  | 'products'
  | 'categories'
  | 'orders'
  | 'stock'
  | 'payments'
  | 'variants'
  | 'wholesale'
  | 'shipping'
  | 'finance'
  | 'banners'
  | 'social'
  | 'product_page'
  | 'multiuser'
  | 'custom_domain'
  | 'tasks'
  | 'savings_account'
  | 'expenses'
  | 'assistant'

// ============================================================
// EXECUTOR TYPES
// ============================================================

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string; field?: string } }

export type ErrorCode =
  | 'MODULE_INACTIVE'
  | 'LIMIT_EXCEEDED'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'STORE_INACTIVE'
  | 'CONFLICT'
  | 'EXTERNAL_ERROR'
  | 'SYSTEM_ERROR'
  | 'STORE_CAP_REACHED'

// ============================================================
// STORE CONTEXT — propagado por middleware a Server Components
// ============================================================

export type StoreContext = {
  store_id: string
  slug: string
  status: StoreStatus
  billing_status: StoreStatus
  modules: Partial<Record<ModuleName, boolean>>
  limits: {
    max_products: number
    max_orders: number
    ai_tokens: number
  }
  user_id: string
  user_role: StoreUserRole
}

// ============================================================
// STORE CONFIG — campo JSONB config en stores
// ============================================================

export type StoreConfig = {
  primary_color?: string
  secondary_color?: string
  font?: string
  show_prices?: boolean
  currency?: string
  city?: string | null
  hours?: string | null
  trust_badges?: string[] | null
  social?: {
    instagram?: string
    facebook?: string
    tiktok?: string
    twitter?: string
  }
  onboarding?: {
    completed: boolean
    steps_done: string[]
  }
}
