import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'
import { createElement } from 'react'

import { getSupabaseAuthContext } from '@/lib/db/supabase-auth-context'
import { JournalPdfDocument } from '@/lib/export/journal-pdf-document'
import { loadJournalExportPayload } from '@/lib/export/load-entries-for-export'

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

  const doc = createElement(JournalPdfDocument, { payload: loaded.payload })
  try {
    const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0])
    const name = `${filenameStem()}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[export/pdf]', e)
    return NextResponse.json({ error: 'Failed to render PDF' }, { status: 500 })
  }
}
