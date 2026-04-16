import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/**
 * Cron job diario: verifica estados de billing y ejecuta transiciones automáticas.
 *
 * Transiciones:
 *   demo + trial_ends_at expirado → past_due
 *   past_due + 30 días sin pago   → archived
 *
 * Protegido con Authorization: Bearer <CRON_SECRET>
 * Configurar en vercel.json:
 *   { "crons": [{ "path": "/api/cron/check-billing", "schedule": "0 3 * * *" }] }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verificar cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = {
    trial_expired: 0,
    archived: 0,
    errors: [] as string[],
  }

  // ── 1. Trial vencido → past_due ──────────────────────────────
  try {
    const { data: expiredTrials, error } = await db
      .from('stores')
      .select('id, trial_ends_at')
      .eq('billing_status', 'demo')
      .lt('trial_ends_at', now.toISOString())
      .not('trial_ends_at', 'is', null)

    if (error) throw error

    for (const store of (expiredTrials ?? []) as Array<{ id: string }>) {
      try {
        await db
          .from('stores')
          .update({ billing_status: 'past_due' })
          .eq('id', store.id)

        await db.from('events').insert({
          store_id: store.id,
          type: 'trial_expired',
          actor_type: 'system',
          actor_id: null,
          data: { transitioned_at: now.toISOString() },
        })

        results.trial_expired++
      } catch (err) {
        results.errors.push(
          `trial_expired store ${store.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        )
      }
    }
  } catch (err) {
    results.errors.push(
      `query trial_expired: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  // ── 2. past_due + 30 días → archived ─────────────────────────
  try {
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: overdueStores, error } = await db
      .from('stores')
      .select('id, last_billing_failure_at')
      .eq('billing_status', 'past_due')
      .lt('last_billing_failure_at', thirtyDaysAgo.toISOString())
      .not('last_billing_failure_at', 'is', null)

    if (error) throw error

    for (const store of (overdueStores ?? []) as Array<{ id: string }>) {
      try {
        await db
          .from('stores')
          .update({ billing_status: 'archived' })
          .eq('id', store.id)

        await db.from('events').insert({
          store_id: store.id,
          type: 'store_archived',
          actor_type: 'system',
          actor_id: null,
          data: {
            reason: '30_days_past_due',
            transitioned_at: now.toISOString(),
          },
        })

        results.archived++
      } catch (err) {
        results.errors.push(
          `archive store ${store.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        )
      }
    }
  } catch (err) {
    results.errors.push(
      `query past_due_archived: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  return NextResponse.json({
    ok: true,
    processed_at: now.toISOString(),
    ...results,
  })
}
