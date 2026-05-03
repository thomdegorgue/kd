import { createClient } from '@supabase/supabase-js'

// Cliente de solo uso en servidor: executor, webhooks, crons.
// Bypasea RLS — NUNCA exponer en cliente.
// TODO F4-1: agregar <Database> cuando `pnpm types:db` regenere tipos con Relationships.
export const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
