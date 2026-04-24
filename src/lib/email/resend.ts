import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn('Resend API key not configured. Email would have been sent to:', to)
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
      console.error('Resend error:', result.error)
      return { success: false, error: result.error.message }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to send email:', message)
    return { success: false, error: message }
  }
}
