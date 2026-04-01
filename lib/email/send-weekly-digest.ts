import { createElement } from 'react'

import type { SendEmailResult } from '@/lib/email/send'
import { RESEND_ONBOARDING_FROM, sendEmail } from '@/lib/email/send'
import { WeeklyDigestEmail } from '@/lib/email/WeeklyDigestEmail'

const SUBJECT = 'Your weekly journal digest'

export type SendWeeklyDigestResult = SendEmailResult

/**
 * §4.3 / §4.8 — weekly digest. Uses `WEEKLY_DIGEST_FROM` when set; otherwise Resend onboarding sender (no domain setup).
 */
export async function sendWeeklyDigestEmail(params: {
  to: string
  displayName?: string | null
  weekStart: string
  weekEnd: string
  entryCount: number
  avgScore: number
  topMood: string
  summary: string
}): Promise<SendWeeklyDigestResult> {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || 'http://localhost:3000'

  const from =
    process.env.WEEKLY_DIGEST_FROM?.trim() ||
    process.env.RESEND_DEFAULT_FROM?.trim() ||
    RESEND_ONBOARDING_FROM

  return sendEmail({
    from,
    to: params.to,
    subject: SUBJECT,
    react: createElement(WeeklyDigestEmail, {
      displayName: params.displayName,
      weekStart: params.weekStart,
      weekEnd: params.weekEnd,
      entryCount: params.entryCount,
      avgScore: params.avgScore,
      topMood: params.topMood,
      summary: params.summary,
      dashboardUrl: `${base}/dashboard`,
    }),
  })
}
