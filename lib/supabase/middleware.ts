/**
 * Supabase client para middleware
 * Usa anon key directamente (sin cookies) para queries públicas
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createMiddlewareClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

