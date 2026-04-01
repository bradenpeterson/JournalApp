import { createElement } from 'react'

import { CapsuleUnlockedEmail } from '@/lib/email/CapsuleUnlockedEmail'
import type { SendEmailResult } from '@/lib/email/send'
import { RESEND_ONBOARDING_FROM, sendEmail } from '@/lib/email/send'

const SUBJECT = 'Your time capsule is unlocked'

export type SendCapsuleUnlockedResult = SendEmailResult

function appOrigin(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  return base || 'http://localhost:3000'
}

/**
 * §4.7 / §4.8 — unlock notification (React Email). Uses `CAPSULE_UNLOCK_FROM` → `WEEKLY_DIGEST_FROM` → onboarding sender.
 */
export async function sendCapsuleUnlockedEmail(params: {
  to: string
  title: string
  unlockAtIso: string
  capsuleId: string
}): Promise<SendCapsuleUnlockedResult> {
  const capsuleUrl = `${appOrigin()}/capsules/${params.capsuleId}`

  const from =
    process.env.CAPSULE_UNLOCK_FROM?.trim() ||
    process.env.WEEKLY_DIGEST_FROM?.trim() ||
    process.env.RESEND_DEFAULT_FROM?.trim() ||
    RESEND_ONBOARDING_FROM

  return sendEmail({
    from,
    to: params.to,
    subject: SUBJECT,
    react: createElement(CapsuleUnlockedEmail, {
      title: params.title,
      unlockAtIso: params.unlockAtIso,
      capsuleUrl,
    }),
  })
}
