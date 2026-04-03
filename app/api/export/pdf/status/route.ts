import { NextResponse } from 'next/server'

import { getPdfExportJobById } from '@/lib/bullmq/pdf-export-queue'
import type { PdfExportJobPayload, PdfExportJobResult } from '@/lib/bullmq/pdf-export-job'
import { isRedisConfigured } from '@/lib/bullmq/time-capsule-queue'
import { createServiceRoleClient } from '@/lib/db/supabase-service'
import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'

const SIGNED_URL_SECONDS = 3600

function safeJobId(raw: string | null): string | null {
  if (!raw || raw.length > 80) return null
  if (!/^[a-zA-Z0-9:_-]+$/.test(raw)) return null
  return raw
}

export async function GET(req: Request) {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  if (!isRedisConfigured()) {
    return NextResponse.json({ error: 'Redis is not configured.' }, { status: 503 })
  }

  const jobId = safeJobId(new URL(req.url).searchParams.get('jobId'))
  if (!jobId) {
    return NextResponse.json({ error: 'Missing or invalid jobId' }, { status: 400 })
  }

  const job = await getPdfExportJobById(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const data = job.data as PdfExportJobPayload
  if (data.dbUserId !== ctx.dbUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const state = await job.getState()

  if (state === 'completed') {
    const result = job.returnvalue as PdfExportJobResult | undefined
    if (!result?.bucket || !result?.objectPath) {
      return NextResponse.json({ error: 'Export finished but result is missing.' }, { status: 500 })
    }

    const supabase = createServiceRoleClient()
    const { data: signed, error: signErr } = await supabase.storage
      .from(result.bucket)
      .createSignedUrl(result.objectPath, SIGNED_URL_SECONDS)

    if (signErr || !signed?.signedUrl) {
      console.error('[export/pdf status] signed url', signErr)
      return NextResponse.json({ error: 'Could not create download link.' }, { status: 500 })
    }

    return NextResponse.json({
      status: 'completed',
      downloadUrl: signed.signedUrl,
      expiresInSeconds: SIGNED_URL_SECONDS,
    })
  }

  if (state === 'failed') {
    return NextResponse.json({
      status: 'failed',
      error: job.failedReason ?? 'PDF export failed.',
    })
  }

  return NextResponse.json({
    status: state,
  })
}
