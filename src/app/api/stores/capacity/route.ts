import { NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

export const revalidate = 60

/**
 * GET /api/stores/capacity
 *
 * Devuelve cupos de tiendas disponibles.
 * Usado por la landing page para mostrar el slot counter en tiempo real.
 *
 * Response: { available: number | null }
 *   - number: cupos restantes (si el plan tiene cap configurado)
 *   - null: sin límite
 */
export async function GET(): Promise<NextResponse> {
  try {
    const { data: plan } = await db
      .from('plans')
      .select('max_stores_total')
      .eq('is_active', true)
      .single()

    const cap = plan?.max_stores_total
    if (cap === null || cap === undefined) {
      return NextResponse.json({ available: null })
    }

    const { count } = await db
      .from('stores')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'archived')

    const used = count ?? 0
    const available = Math.max(0, cap - used)

    return NextResponse.json({ available })
  } catch (err) {
    console.error('[api/stores/capacity] error:', err)
    return NextResponse.json({ available: null })
  }
}
