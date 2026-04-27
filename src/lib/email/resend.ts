import { Resend } from 'resend'
import { supabaseServiceRole } from '@/lib/supabase/service-role'

const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

async function logEmailFailure(
  to: string,
  subject: string,
  error: string,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseServiceRole as any
    await db.from('events').insert({
      store_id: null,
      type: 'email_send_failed',
      actor_type: 'system',
      actor_id: null,
      data: { recipient: to, subject, error },
    })
  } catch (logErr) {
    console.error('Failed to log email failure to events:', logErr)
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[email] RESEND_API_KEY no configurado en producción. Email no enviado a:', to)
      return { success: false, error: 'Servicio de email no configurado' }
    }
    console.warn('[email] RESEND_API_KEY no configurado — email omitido en dev. Destinatario:', to)
    return { success: true }
  }

  try {
    const result = await resend.emails.send({
      from: 'KitDigital <noreply@kitdigital.ar>',
      to,
      subject,
      html,
    })

    if (result.error) {
      await logEmailFailure(to, subject, result.error.message)
      return { success: false, error: result.error.message }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await logEmailFailure(to, subject, message)
    return { success: false, error: message }
  }
}
