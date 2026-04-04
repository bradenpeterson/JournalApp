'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { SETTINGS_SECTION_SHELL } from '@/components/settings/settings-section-shell'

type PdfPhase = 'idle' | 'working' | 'error'

const codeClass =
  'rounded-md bg-sanctuary-sidebar px-1.5 py-0.5 font-mono text-[0.7rem] text-sanctuary-text dark:bg-zinc-800 dark:text-zinc-200'

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
    <section className={SETTINGS_SECTION_SHELL}>
      <h2 className="font-serif text-xl text-sanctuary-text dark:text-zinc-100">Export journal</h2>
      <p className="mt-2 text-sm leading-relaxed text-sanctuary-muted dark:text-zinc-400">
        JSON downloads immediately with every entry, mood, and image URL. PDF includes the full journal (all entries and
        images) via a background job — requires <code className={codeClass}>REDIS_URL</code> and{' '}
        <code className={codeClass}>npm run worker</code> (or your hosted worker).
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="/api/export/json"
          className="inline-flex items-center justify-center rounded-full bg-sanctuary-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sanctuary-primary-hover dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
        >
          Download JSON
        </a>
        <button
          type="button"
          disabled={pdfPhase === 'working'}
          onClick={() => void startPdfExport()}
          className="inline-flex items-center justify-center rounded-full border border-sanctuary-border bg-white px-6 py-3 text-sm font-medium text-sanctuary-primary transition-colors hover:bg-sanctuary-canvas disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-teal-300 dark:hover:bg-zinc-800"
        >
          {pdfPhase === 'working' ? 'Preparing PDF…' : 'Download PDF'}
        </button>
      </div>
      {pdfMessage ? (
        <p
          className={`mt-4 text-sm ${pdfPhase === 'error' || pdfLinkFallback ? 'text-red-600 dark:text-red-400' : 'text-sanctuary-muted dark:text-zinc-400'}`}
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
            className="font-medium text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300"
          >
            Open PDF
          </a>
        </p>
      ) : null}
    </section>
  )
}
