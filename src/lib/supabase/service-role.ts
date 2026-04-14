import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

// Cliente de solo uso en servidor: executor, webhooks, crons.
// Bypasea RLS — NUNCA exponer en cliente.
export const supabaseServiceRole = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
