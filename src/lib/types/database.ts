// Generado manualmente desde schema.sql — KitDigital.ar
// Reemplazar con: pnpm dlx supabase gen types typescript --project-id vqkvqowvmdwabelpiiil
// si se requiere regenerar tras cambios en el schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'superadmin'
          banned_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'superadmin'
          banned_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'superadmin'
          banned_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      plans: {
        Row: {
          id: string
          name: string
          price_per_100_products: number
          pro_module_price: number
          base_modules: Json
          trial_days: number
          trial_max_products: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price_per_100_products?: number
          pro_module_price?: number
          base_modules?: Json
          trial_days?: number
          trial_max_products?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price_per_100_products?: number
          pro_module_price?: number
          base_modules?: Json
          trial_days?: number
          trial_max_products?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          name: string
          slug: string
          status: 'demo' | 'active' | 'past_due' | 'suspended' | 'archived'
          plan_id: string | null
          modules: Json
          config: Json
          limits: Json
          custom_domain: string | null
          custom_domain_verified: boolean
          custom_domain_verified_at: string | null
          custom_domain_verification_token: string | null
          logo_url: string | null
          cover_url: string | null
          whatsapp: string | null
          description: string | null
          billing_status: 'demo' | 'active' | 'past_due' | 'suspended' | 'archived'
          trial_ends_at: string | null
          billing_cycle_anchor: number | null
          current_period_start: string | null
          current_period_end: string | null
          mp_subscription_id: string | null
          mp_customer_id: string | null
          ai_tokens_used: number
          cancelled_at: string | null
          last_billing_failure_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          status?: 'demo' | 'active' | 'past_due' | 'suspended' | 'archived'
          plan_id?: string | null
          modules?: Json
          config?: Json
          limits?: Json
          custom_domain?: string | null
          custom_domain_verified?: boolean
          custom_domain_verified_at?: string | null
          custom_domain_verification_token?: string | null
          logo_url?: string | null
          cover_url?: string | null
          whatsapp?: string | null
          description?: string | null
          billing_status?: 'demo' | 'active' | 'past_due' | 'suspended' | 'archived'
          trial_ends_at?: string | null
          billing_cycle_anchor?: number | null
          current_period_start?: string | null
          current_period_end?: string | null
          mp_subscription_id?: string | null
          mp_customer_id?: string | null
          ai_tokens_used?: number
          cancelled_at?: string | null
          last_billing_failure_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['stores']['Insert']>
      }
      store_users: {
        Row: {
          id: string
          store_id: string
          user_id: string
          role: 'owner' | 'admin' | 'collaborator'
          invited_by: string | null
          invited_at: string | null
          accepted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          role: 'owner' | 'admin' | 'collaborator'
          invited_by?: string | null
          invited_at?: string | null
          accepted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['store_users']['Insert']>
      }
      store_invitations: {
        Row: {
          id: string
          store_id: string
          email: string
          role: 'admin' | 'collaborator'
          token: string
          invited_by: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          email: string
          role: 'admin' | 'collaborator'
          token: string
          invited_by: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['store_invitations']['Insert']>
      }
      billing_payments: {
        Row: {
          id: string
          store_id: string
          plan_id: string
          mp_payment_id: string
          mp_subscription_id: string
          amount: number
          status: 'approved' | 'rejected' | 'pending' | 'refunded'
          period_start: string
          period_end: string
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          plan_id: string
          mp_payment_id: string
          mp_subscription_id: string
          amount: number
          status: 'approved' | 'rejected' | 'pending' | 'refunded'
          period_start: string
          period_end: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['billing_payments']['Insert']>
      }
      billing_webhook_log: {
        Row: {
          id: string
          mp_event_id: string
          topic: string
          store_id: string | null
          status: 'pending' | 'processed' | 'failed'
          raw_payload: Json
          error: string | null
          processing_time_ms: number | null
          result: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mp_event_id: string
          topic: string
          store_id?: string | null
          status?: 'pending' | 'processed' | 'failed'
          raw_payload: Json
          error?: string | null
          processing_time_ms?: number | null
          result?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['billing_webhook_log']['Insert']>
      }
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          description: string | null
          price: number
          compare_price: number | null
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          sort_order: number
          metadata: Json
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          description?: string | null
          price: number
          compare_price?: number | null
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          sort_order?: number
          metadata?: Json
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      categories: {
        Row: {
          id: string
          store_id: string
          name: string
          description: string | null
          image_url: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          description?: string | null
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      product_categories: {
        Row: {
          product_id: string
          category_id: string
          store_id: string
        }
        Insert: {
          product_id: string
          category_id: string
          store_id: string
        }
        Update: Partial<Database['public']['Tables']['product_categories']['Insert']>
      }
      banners: {
        Row: {
          id: string
          store_id: string
          image_url: string
          title: string | null
          subtitle: string | null
          link_url: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          image_url: string
          title?: string | null
          subtitle?: string | null
          link_url?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['banners']['Insert']>
      }
      variants: {
        Row: {
          id: string
          store_id: string
          product_id: string
          price: number | null
          sku: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          price?: number | null
          sku?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['variants']['Insert']>
      }
      variant_attributes: {
        Row: {
          id: string
          store_id: string
          product_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['variant_attributes']['Insert']>
      }
      variant_values: {
        Row: {
          id: string
          store_id: string
          variant_id: string
          attribute_id: string
          value: string
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          variant_id: string
          attribute_id: string
          value: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['variant_values']['Insert']>
      }
      stock_items: {
        Row: {
          id: string
          store_id: string
          product_id: string
          variant_id: string | null
          quantity: number
          low_stock_threshold: number
          track_stock: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          variant_id?: string | null
          quantity: number
          low_stock_threshold?: number
          track_stock?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['stock_items']['Insert']>
      }
      wholesale_prices: {
        Row: {
          id: string
          store_id: string
          product_id: string
          variant_id: string | null
          price: number
          min_quantity: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          product_id: string
          variant_id?: string | null
          price: number
          min_quantity?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['wholesale_prices']['Insert']>
      }
      shipping_methods: {
        Row: {
          id: string
          store_id: string
          name: string
          description: string | null
          price: number
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          description?: string | null
          price?: number
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shipping_methods']['Insert']>
      }
      customers: {
        Row: {
          id: string
          store_id: string
          name: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      orders: {
        Row: {
          id: string
          store_id: string
          customer_id: string | null
          status: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'
          total: number
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          customer_id?: string | null
          status?: 'pending' | 'confirmed' | 'preparing' | 'delivered' | 'cancelled'
          total: number
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string
          store_id: string
          order_id: string
          product_id: string
          variant_id: string | null
          quantity: number
          unit_price: number
          product_name: string
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          order_id: string
          product_id: string
          variant_id?: string | null
          quantity: number
          unit_price: number
          product_name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      shipments: {
        Row: {
          id: string
          store_id: string
          order_id: string
          tracking_code: string
          status: 'preparing' | 'in_transit' | 'delivered' | 'cancelled'
          shipping_method_id: string | null
          recipient_name: string | null
          recipient_phone: string | null
          notes: string | null
          shipped_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          order_id: string
          tracking_code: string
          status?: 'preparing' | 'in_transit' | 'delivered' | 'cancelled'
          shipping_method_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          notes?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shipments']['Insert']>
      }
      payments: {
        Row: {
          id: string
          store_id: string
          order_id: string
          amount: number
          status: 'pending' | 'approved' | 'rejected' | 'refunded'
          method: 'cash' | 'transfer' | 'card' | 'mp' | 'other'
          mp_payment_id: string | null
          notes: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          order_id: string
          amount: number
          status?: 'pending' | 'approved' | 'rejected' | 'refunded'
          method: 'cash' | 'transfer' | 'card' | 'mp' | 'other'
          mp_payment_id?: string | null
          notes?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      finance_entries: {
        Row: {
          id: string
          store_id: string
          type: 'income' | 'expense'
          amount: number
          category: string
          description: string | null
          order_id: string | null
          payment_id: string | null
          date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          type: 'income' | 'expense'
          amount: number
          category: string
          description?: string | null
          order_id?: string | null
          payment_id?: string | null
          date: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['finance_entries']['Insert']>
      }
      expenses: {
        Row: {
          id: string
          store_id: string
          amount: number
          category: string
          description: string
          supplier: string | null
          date: string
          is_recurring: boolean
          recurrence_period: 'monthly' | 'weekly' | 'annual' | null
          receipt_url: string | null
          finance_entry_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          amount: number
          category: string
          description: string
          supplier?: string | null
          date: string
          is_recurring?: boolean
          recurrence_period?: 'monthly' | 'weekly' | 'annual' | null
          receipt_url?: string | null
          finance_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
      }
      savings_accounts: {
        Row: {
          id: string
          store_id: string
          name: string
          balance: number
          goal_amount: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          balance?: number
          goal_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['savings_accounts']['Insert']>
      }
      savings_movements: {
        Row: {
          id: string
          store_id: string
          savings_account_id: string
          type: 'deposit' | 'withdrawal'
          amount: number
          description: string | null
          finance_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          store_id: string
          savings_account_id: string
          type: 'deposit' | 'withdrawal'
          amount: number
          description?: string | null
          finance_entry_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['savings_movements']['Insert']>
      }
      tasks: {
        Row: {
          id: string
          store_id: string
          title: string
          description: string | null
          status: 'pending' | 'in_progress' | 'done' | 'cancelled'
          due_date: string | null
          assigned_to: string | null
          order_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          title: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'done' | 'cancelled'
          due_date?: string | null
          assigned_to?: string | null
          order_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      assistant_sessions: {
        Row: {
          id: string
          store_id: string
          user_id: string
          last_activity_at: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          store_id: string
          user_id: string
          last_activity_at?: string
          created_at?: string
          expires_at?: string
        }
        Update: Partial<Database['public']['Tables']['assistant_sessions']['Insert']>
      }
      assistant_messages: {
        Row: {
          id: string
          session_id: string
          store_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          store_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['assistant_messages']['Insert']>
      }
      events: {
        Row: {
          id: string
          store_id: string | null
          type: string
          actor_type: 'user' | 'superadmin' | 'system' | 'ai'
          actor_id: string | null
          data: Json
          created_at: string
        }
        Insert: {
          id?: string
          store_id?: string | null
          type: string
          actor_type: 'user' | 'superadmin' | 'system' | 'ai'
          actor_id?: string | null
          data: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
