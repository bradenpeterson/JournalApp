import { NextResponse } from 'next/server'

import { enqueueFullJournalPdfExport } from '@/lib/bullmq/pdf-export-queue'
import { isRedisConfigured } from '@/lib/bullmq/time-capsule-queue'
import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'

/**
 * Enqueues a full-journal PDF (no entry/image caps). A BullMQ worker must be running with Redis,
 * and Supabase bucket `journal-exports` must exist (see migrations).
 */
export async function POST() {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  if (!isRedisConfigured()) {
    return NextResponse.json(
      {
        error:
          'PDF export uses a background worker. Set REDIS_URL on the web app and run `npm run worker` (or your hosted worker) so jobs can finish.',
      },
      { status: 503 }
    )
  }

  try {
    const jobId = await enqueueFullJournalPdfExport(ctx.dbUserId)
    return NextResponse.json({ jobId })
  } catch (e) {
    console.error('[export/pdf POST]', e)
    return NextResponse.json({ error: 'Could not start PDF export.' }, { status: 500 })
  }
}
