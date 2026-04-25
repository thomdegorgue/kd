import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'
import { ANNUAL_INCLUDED_PRO_MODULES } from '@/lib/billing/calculator'
import { sendEmail } from '@/lib/email/resend'
import { TrialExpiredEmail } from '@/lib/email/templates/trial-expired'
import { AnnualExpiredEmail } from '@/lib/email/templates/annual-expired'
import { AnnualExpiringEmail } from '@/lib/email/templates/annual-expiring'
import { StoreArchivedEmail } from '@/lib/email/templates/store-archived'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

async function getStoreOwnerEmail(storeId: string): Promise<string | null> {
  const { data, error } = await db
    .from('store_users')
    .select('user_id, users:user_id(email)')
    .eq('store_id', storeId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const users = (data as { users?: { email?: string } | { email?: string }[] }).users
  if (Array.isArray(users)) return users[0]?.email ?? null
  return users?.email ?? null
}

/**
 * Cron job diario: verifica estados de billing y ejecuta transiciones automáticas.
 *
 * Transiciones:
 *   demo + trial_ends_at expirado               → past_due
 *   past_due + 30 días sin pago                 → archived
 *   annual + annual_paid_until vencido          → past_due
 *   annual + annual_paid_until en 14 días       → email de aviso
 *
 * Protegido con Authorization: Bearer <CRON_SECRET>
 * Configurar en vercel.json:
 *   { "crons": [{ "path": "/api/cron/check-billing", "schedule": "0 3 * * *" }] }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = {
    trial_expired: 0,
    archived: 0,
    annual_expired: 0,
    annual_warning_sent: 0,
    monthly_ai_reset: 0,
    errors: [] as string[],
  }

  // ── 1. Trial vencido → past_due ──────────────────────────────
  try {
    const { data: expiredTrials, error } = await db
      .from('stores')
      .select('id, name, trial_ends_at')
      .eq('billing_status', 'demo')
      .lt('trial_ends_at', now.toISOString())
      .not('trial_ends_at', 'is', null)

    if (error) throw error

    for (const store of (expiredTrials ?? []) as Array<{ id: string; name: string }>) {
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

        const ownerEmail = await getStoreOwnerEmail(store.id)
        if (ownerEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitdigital.ar'
          const billingUrl = `${appUrl}/admin/billing`

          const emailHtml = TrialExpiredEmail({
            ownerEmail,
            storeName: store.name,
            billingUrl,
          })

          await sendEmail(
            ownerEmail,
            `Tu período de prueba de ${store.name} ha vencido — KitDigital`,
            emailHtml,
          )
        }

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
      .select('id, name, last_billing_failure_at')
      .eq('billing_status', 'past_due')
      .lt('last_billing_failure_at', thirtyDaysAgo.toISOString())
      .not('last_billing_failure_at', 'is', null)

    if (error) throw error

    for (const store of (overdueStores ?? []) as Array<{ id: string; name: string }>) {
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

        const ownerEmail = await getStoreOwnerEmail(store.id)
        if (ownerEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitdigital.ar'
          const restoreUrl = `${appUrl}/admin/billing`

          const emailHtml = StoreArchivedEmail({
            ownerEmail,
            storeName: store.name,
            restoreUrl,
          })

          await sendEmail(
            ownerEmail,
            `${store.name} ha sido pausada — KitDigital`,
            emailHtml,
          )
        }

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

  // ── 3. Plan anual vencido → past_due ─────────────────────────
  try {
    const today = now.toISOString().slice(0, 10)
    const { data: expiredAnnuals, error } = await db
      .from('stores')
      .select('id, name, annual_paid_until, modules')
      .eq('billing_period', 'annual')
      .eq('billing_status', 'active')
      .lt('annual_paid_until', today)
      .not('annual_paid_until', 'is', null)

    if (error) throw error

    for (const store of (expiredAnnuals ?? []) as Array<{
      id: string
      name: string
      annual_paid_until: string
      modules: Record<string, boolean> | null
    }>) {
      try {
        // Desactivar módulos pro al vencer
        const currentModules = store.modules ?? {}
        const proDisabled: Record<string, boolean> = { ...currentModules }
        for (const m of ANNUAL_INCLUDED_PRO_MODULES) {
          if (proDisabled[m]) proDisabled[m] = false
        }

        await db
          .from('stores')
          .update({
            billing_status: 'past_due',
            last_billing_failure_at: now.toISOString(),
            modules: proDisabled,
          })
          .eq('id', store.id)

        await db.from('events').insert({
          store_id: store.id,
          type: 'annual_subscription_expired',
          actor_type: 'system',
          actor_id: null,
          data: {
            annual_paid_until: store.annual_paid_until,
            transitioned_at: now.toISOString(),
          },
        })

        const ownerEmail = await getStoreOwnerEmail(store.id)
        if (ownerEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitdigital.ar'
          const billingUrl = `${appUrl}/admin/billing`
          const emailHtml = AnnualExpiredEmail({
            ownerEmail,
            storeName: store.name,
            billingUrl,
          })
          await sendEmail(
            ownerEmail,
            `Tu plan anual de ${store.name} venció — KitDigital`,
            emailHtml,
          )
        }

        results.annual_expired++
      } catch (err) {
        results.errors.push(
          `annual_expired store ${store.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        )
      }
    }
  } catch (err) {
    results.errors.push(
      `query annual_expired: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  // ── 4. Plan anual: aviso 14 días antes del vencimiento ───────
  try {
    const today = now.toISOString().slice(0, 10)
    const in14 = new Date(now)
    in14.setDate(in14.getDate() + 14)
    const in14Str = in14.toISOString().slice(0, 10)

    const { data: expiringAnnuals, error } = await db
      .from('stores')
      .select('id, name, annual_paid_until, config')
      .eq('billing_period', 'annual')
      .eq('billing_status', 'active')
      .gte('annual_paid_until', today)
      .lte('annual_paid_until', in14Str)

    if (error) throw error

    for (const store of (expiringAnnuals ?? []) as Array<{
      id: string
      name: string
      annual_paid_until: string
      config: Record<string, unknown> | null
    }>) {
      try {
        // Idempotencia: solo enviar una vez por ciclo anual
        const warningKey = `annual_warning_${store.annual_paid_until}`
        const config = store.config ?? {}
        if (config[warningKey]) continue

        const daysLeft = Math.max(
          0,
          Math.ceil(
            (new Date(store.annual_paid_until).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )

        const ownerEmail = await getStoreOwnerEmail(store.id)
        if (!ownerEmail) continue

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kitdigital.ar'
        const billingUrl = `${appUrl}/admin/billing`
        const emailHtml = AnnualExpiringEmail({
          ownerEmail,
          storeName: store.name,
          daysLeft,
          billingUrl,
        })
        await sendEmail(
          ownerEmail,
          `Tu plan anual de ${store.name} vence en ${daysLeft} días — KitDigital`,
          emailHtml,
        )

        // Marcar como enviado
        await db
          .from('stores')
          .update({ config: { ...config, [warningKey]: now.toISOString() } })
          .eq('id', store.id)

        results.annual_warning_sent++
      } catch (err) {
        results.errors.push(
          `annual_warning store ${store.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        )
      }
    }
  } catch (err) {
    results.errors.push(
      `query annual_warning: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  // ── 5. Reset mensual de AI tokens ────────────────────────────
  try {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: storesWithOldTokens, error } = await db
      .from('stores')
      .select('id')
      .gt('ai_tokens_used', 0)
      .lt('ai_tokens_reset_at', startOfMonth)

    if (error) throw error

    for (const store of (storesWithOldTokens ?? []) as Array<{ id: string }>) {
      try {
        await db
          .from('stores')
          .update({ ai_tokens_used: 0, ai_tokens_reset_at: now.toISOString() })
          .eq('id', store.id)
        results.monthly_ai_reset++
      } catch (err) {
        results.errors.push(
          `ai_token_reset store ${store.id}: ${err instanceof Error ? err.message : 'unknown'}`,
        )
      }
    }
  } catch (err) {
    results.errors.push(
      `query monthly_ai_reset: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  return NextResponse.json({
    ok: true,
    processed_at: now.toISOString(),
    ...results,
  })
}
