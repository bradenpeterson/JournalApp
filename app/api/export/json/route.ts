import { NextResponse } from 'next/server'

import { loadJournalExportPayload } from '@/lib/export/load-entries-for-export'
import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'

export const runtime = 'nodejs'

function filenameStem() {
  return `journal-export-${new Date().toISOString().slice(0, 10)}`
}

export async function GET() {
  const ctx = await getSupabaseAuthContext()
  if (!ctx.ok) return ctx.response

  const loaded = await loadJournalExportPayload(ctx.supabase, ctx.dbUserId)
  if (!loaded.ok) {
    return NextResponse.json({ error: loaded.error }, { status: 500 })
  }

  const body = JSON.stringify(loaded.payload, null, 2)
  const name = `${filenameStem()}.json`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}
