import { Resend } from 'resend'

const SUBJECT = 'Your time capsule is unlocked'

export type SendCapsuleUnlockedResult = { ok: true } | { ok: false; reason: string }

function appOrigin(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  return base || 'http://localhost:3000'
}

/**
 * §4.7 / §4.8 — unlock notification (plain text; React Email optional in §4.8).
 */
export async function sendCapsuleUnlockedEmail(params: {
  to: string
  title: string
  unlockAtIso: string
  capsuleId: string
}): Promise<SendCapsuleUnlockedResult> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    return { ok: false, reason: 'RESEND_API_KEY not set' }
  }

  const from =
    process.env.CAPSULE_UNLOCK_FROM?.trim() ||
    process.env.WEEKLY_DIGEST_FROM?.trim() ||
    'Journal <onboarding@resend.dev>'

  const link = `${appOrigin()}/capsules/${params.capsuleId}`
  const text = `Your time capsule “${params.title.replace(/"/g, "'")}” reached its unlock time (${params.unlockAtIso}).\n\nOpen it: ${link}\n`

  try {
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: SUBJECT,
      text,
    })
    if (error) {
      return { ok: false, reason: error.message }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'send failed' }
  }
}
