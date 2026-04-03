'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type PdfPhase = 'idle' | 'working' | 'error'

export function ExportDownloads() {
  const [pdfPhase, setPdfPhase] = useState<PdfPhase>('idle')
  const [pdfMessage, setPdfMessage] = useState<string | null>(null)
  /** Shown if `window.open` is blocked so the user can open the PDF manually. */
  const [pdfLinkFallback, setPdfLinkFallback] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const pollJob = useCallback(async (jobId: string) => {
    const tick = async () => {
      if (cancelledRef.current) return
      try {
        const res = await fetch(`/api/export/pdf/status?jobId=${encodeURIComponent(jobId)}`, {
          credentials: 'same-origin',
        })
        const body = (await res.json().catch(() => null)) as {
          status?: string
          downloadUrl?: string
          error?: string
        } | null

        if (cancelledRef.current) return

        if (!res.ok) {
          setPdfPhase('error')
          setPdfMessage(body?.error ?? `Status check failed (${res.status})`)
          return
        }

        if (body?.status === 'completed' && body.downloadUrl) {
          setPdfPhase('idle')
          setPdfMessage(null)
          setPdfLinkFallback(null)
          // Do not pass `noopener` in windowFeatures: browsers then return `null` from
          // window.open even when the tab opened, which looks like a pop-up block.
          const opened = window.open(body.downloadUrl, '_blank')
          if (opened) {
            try {
              opened.opener = null
            } catch {
              /* ignore */
            }
          }
          if (opened == null) {
            setPdfLinkFallback(body.downloadUrl)
            setPdfMessage('Pop-up blocked. Use the link below to open your PDF in a new tab.')
          }
          return
        }

        if (body?.status === 'failed') {
          setPdfPhase('error')
          setPdfMessage(body.error ?? 'PDF export failed.')
          return
        }

        setPdfMessage(
          body?.status === 'active'
            ? 'Building your PDF…'
            : 'Waiting in queue… (large journals can take several minutes)'
        )
        window.setTimeout(() => void tick(), 2000)
      } catch {
        if (!cancelledRef.current) {
          setPdfPhase('error')
          setPdfMessage('Lost connection while checking export status.')
        }
      }
    }
    await tick()
  }, [])

  const startPdfExport = useCallback(async () => {
    setPdfPhase('working')
    setPdfMessage('Starting export…')
    setPdfLinkFallback(null)
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const body = (await res.json().catch(() => null)) as { jobId?: string; error?: string } | null

      if (cancelledRef.current) return

      if (!res.ok) {
        setPdfPhase('error')
        setPdfMessage(body?.error ?? `Could not start export (${res.status})`)
        return
      }

      const jobId = body?.jobId
      if (!jobId) {
        setPdfPhase('error')
        setPdfMessage('Invalid response from server.')
        return
      }

      await pollJob(jobId)
    } catch {
      if (!cancelledRef.current) {
        setPdfPhase('error')
        setPdfMessage('Could not start PDF export.')
      }
    }
  }, [pollJob])

  return (
    <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Export journal</h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        JSON downloads immediately with every entry, mood, and image URL. PDF includes the full journal (all entries and
        images) via a background job — requires <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">REDIS_URL</code>{' '}
        and <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">npm run worker</code> (or your hosted worker).
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/api/export/json"
          className="inline-flex items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          Download JSON
        </a>
        <button
          type="button"
          disabled={pdfPhase === 'working'}
          onClick={() => void startPdfExport()}
          className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          {pdfPhase === 'working' ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </div>
      {pdfMessage ? (
        <p
          className={`mt-3 text-sm ${pdfPhase === 'error' || pdfLinkFallback ? 'text-red-600 dark:text-red-400' : 'text-neutral-600 dark:text-neutral-300'}`}
          role={pdfPhase === 'error' || pdfLinkFallback ? 'alert' : 'status'}
        >
          {pdfMessage}
        </p>
      ) : null}
      {pdfLinkFallback ? (
        <p className="mt-2 text-sm">
          <a
            href={pdfLinkFallback}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
          >
            Open PDF
          </a>
        </p>
      ) : null}
    </section>
  )
}
