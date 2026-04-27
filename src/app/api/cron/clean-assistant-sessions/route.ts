import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseServiceRole as any

/**
 * Cron job diario: elimina sesiones de asistente IA expiradas.
 *
 * Las sesiones tienen TTL de 24 horas (expires_at). Los mensajes se eliminan
 * en cascada por la FK en assistant_messages.session_id.
 *
 * Protegido con Authorization: Bearer <CRON_SECRET>
 * Configurar en vercel.json:
 *   { "crons": [{ "path": "/api/cron/clean-assistant-sessions", "schedule": "0 4 * * *" }] }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verificar cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const results = {
    sessions_deleted: 0,
    errors: [] as string[],
  }

  try {
    // Obtener sesiones expiradas
    const { data: expiredSessions, error: selectError } = await db
      .from('assistant_sessions')
      .select('id')
      .lt('expires_at', now.toISOString())

    if (selectError) throw selectError

    const sessions = (expiredSessions ?? []) as Array<{ id: string }>

    if (sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id)

      // Eliminar sesiones (mensajes se eliminan en cascada por FK)
      const { error: deleteError } = await db
        .from('assistant_sessions')
        .delete()
        .in('id', sessionIds)

      if (deleteError) throw deleteError

      results.sessions_deleted = sessions.length

      // Registrar evento de sistema
      await db.from('events').insert({
        store_id: null,
        type: 'assistant_sessions_cleaned',
        actor_type: 'system',
        actor_id: null,
        data: {
          sessions_deleted: sessions.length,
          cleaned_at: now.toISOString(),
        },
      })
    }
  } catch (err) {
    results.errors.push(
      `clean_sessions: ${err instanceof Error ? err.message : 'unknown'}`,
    )
  }

  return NextResponse.json({
    ok: true,
    processed_at: now.toISOString(),
    ...results,
  })
}
