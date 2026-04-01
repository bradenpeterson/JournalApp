import { Resend } from 'resend'
import type { ReactElement } from 'react'

export type SendEmailResult = { ok: true; id?: string } | { ok: false; reason: string }

/** Resend test sender — no verified domain needed for development (see [Resend docs](https://resend.com/docs)). */
export const RESEND_ONBOARDING_FROM = 'Journal <onboarding@resend.dev>'

/**
 * §4.8 — shared Resend send with structured logging. Safe for Next route handlers and Node workers (`tsx`).
 */
export async function sendEmail(params: {
  to: string | string[]
  subject: string
  react: ReactElement
  /** When omitted, uses `RESEND_DEFAULT_FROM` then `RESEND_ONBOARDING_FROM`. */
  from?: string
}): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    console.error('[email] missing RESEND_API_KEY', { subject: params.subject })
    return { ok: false, reason: 'RESEND_API_KEY not set' }
  }

  const from =
    params.from?.trim() ||
    process.env.RESEND_DEFAULT_FROM?.trim() ||
    RESEND_ONBOARDING_FROM

  try {
    const resend = new Resend(key)
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      react: params.react,
    })

    if (error) {
      console.error('[email] Resend API error', {
        subject: params.subject,
        message: error.message,
      })
      return { ok: false, reason: error.message }
    }

    return { ok: true, id: data?.id }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'send failed'
    console.error('[email] send exception', { subject: params.subject, message })
    return { ok: false, reason: message }
  }
}
