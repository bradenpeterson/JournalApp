import { Resend } from 'resend'

const SUBJECT = 'Your weekly journal digest'

export type SendWeeklyDigestResult = { ok: true } | { ok: false; reason: string }

/**
 * §4.3 / §4.8 — minimal Resend send. Set `WEEKLY_DIGEST_FROM` to a verified sender in production.
 */
export async function sendWeeklyDigestEmail(params: {
  to: string
  textBody: string
}): Promise<SendWeeklyDigestResult> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    return { ok: false, reason: 'RESEND_API_KEY not set' }
  }

  const from =
    process.env.WEEKLY_DIGEST_FROM?.trim() ||
    'Journal <onboarding@resend.dev>'

  try {
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: SUBJECT,
      text: params.textBody,
    })
    if (error) {
      return { ok: false, reason: error.message }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'send failed' }
  }
}
