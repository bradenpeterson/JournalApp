import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { finished } from 'node:stream/promises'

import type { Job } from 'bullmq'
import type IORedis from 'ioredis'
import PDFDocument from 'pdfkit'
import { Worker } from 'bullmq'

import { createServiceRoleClient } from '@/lib/db/supabase-service-role'
import { rasterizeForPdfEmbedding } from '@/lib/export/pdf-worker-image'
import {
  PDF_EXPORT_JOB_NAME,
  type PdfExportJobPayload,
  type PdfExportJobResult,
} from '@/lib/bullmq/pdf-export-job'
import { QUEUE_PDF_EXPORT } from '@/workers/queue-names'

const JOURNAL_EXPORTS_BUCKET = 'journal-exports'
const ENTRY_PAGE_SIZE = 150
/** Per-image download cap (raw bytes) before we skip embedding — avoids OOM on absurd files. */
const MAX_RAW_IMAGE_BYTES = 80 * 1024 * 1024
const IMAGE_FETCH_MS = 120_000

type EntryRow = {
  id: string
  title: string
  body_text: string | null
  word_count: number
  created_at: string
  updated_at: string
}

type MoodRow = {
  entry_id: string
  score: number
  mood_label: string
  created_at: string
}

type ImgRow = {
  entry_id: string
  public_url: string
  file_name: string
}

function latestMoodMap(rows: MoodRow[]): Map<string, MoodRow> {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const m = new Map<string, MoodRow>()
  for (const r of sorted) {
    if (!m.has(r.entry_id)) m.set(r.entry_id, r)
  }
  return m
}

function imagesByEntry(rows: ImgRow[]): Map<string, ImgRow[]> {
  const m = new Map<string, ImgRow[]>()
  for (const r of rows) {
    const list = m.get(r.entry_id) ?? []
    list.push(r)
    m.set(r.entry_id, list)
  }
  return m
}

async function fetchImageBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(IMAGE_FETCH_MS),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const cl = res.headers.get('content-length')
    if (cl) {
      const n = Number.parseInt(cl, 10)
      if (Number.isFinite(n) && n > MAX_RAW_IMAGE_BYTES) return null
    }
    const ab = await res.arrayBuffer()
    if (ab.byteLength > MAX_RAW_IMAGE_BYTES) return null
    return Buffer.from(ab)
  } catch {
    return null
  }
}

export async function runPdfExportJob(job: Job): Promise<PdfExportJobResult> {
  const { dbUserId } = job.data as PdfExportJobPayload
  const jobId = job.id
  if (jobId == null) {
    throw new Error('Job has no id')
  }

  const supabase = createServiceRoleClient()

  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('email, display_name')
    .eq('id', dbUserId)
    .maybeSingle()

  if (profileErr) {
    throw new Error(`profile: ${profileErr.message}`)
  }

  const tmpPath = path.join(os.tmpdir(), `journal-export-${jobId}-${Date.now()}.pdf`)
  const writeStream = fs.createWriteStream(tmpPath)
  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  doc.pipe(writeStream)

  doc.fontSize(20).text('Journal export', { align: 'center' })
  doc.moveDown(0.75)
  doc.fontSize(10).fillColor('#444444').text(`Generated: ${new Date().toISOString()}`, { align: 'center' })
  if (profile?.email) {
    doc.text(String(profile.email), { align: 'center' })
  }
  if (profile?.display_name) {
    doc.text(String(profile.display_name), { align: 'center' })
  }
  doc.fillColor('#000000')
  doc.moveDown(2)

  let totalEntries = 0
  let from = 0

  for (;;) {
    const { data: entries, error: entErr } = await supabase
      .from('entries')
      .select('id, title, body_text, word_count, created_at, updated_at')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: true })
      .range(from, from + ENTRY_PAGE_SIZE - 1)

    if (entErr) {
      throw new Error(`entries: ${entErr.message}`)
    }

    const batch = (entries ?? []) as EntryRow[]
    if (batch.length === 0) break

    const ids = batch.map((e) => e.id)

    const { data: moodRows, error: moodErr } = await supabase
      .from('mood_analyses')
      .select('entry_id, score, mood_label, created_at')
      .in('entry_id', ids)

    if (moodErr) {
      throw new Error(`mood_analyses: ${moodErr.message}`)
    }

    const { data: imgRows, error: imgErr } = await supabase
      .from('entry_images')
      .select('entry_id, public_url, file_name')
      .in('entry_id', ids)

    if (imgErr) {
      throw new Error(`entry_images: ${imgErr.message}`)
    }

    const moods = latestMoodMap((moodRows ?? []) as MoodRow[])
    const imgs = imagesByEntry((imgRows ?? []) as ImgRow[])

    for (const e of batch) {
      totalEntries += 1
      doc.addPage()
      doc.fontSize(14).font('Helvetica-Bold').text(e.title?.trim() || 'Untitled', { continued: false })
      doc.font('Helvetica')
      doc.fontSize(9).fillColor('#555555')
      doc.text(`${e.created_at} · ${e.word_count} words`)
      doc.fillColor('#000000').moveDown(0.5)

      const mood = moods.get(e.id)
      if (mood) {
        doc.fontSize(9).text(`Mood: ${mood.mood_label} (${mood.score}/10)`)
        doc.moveDown(0.35)
      }

      doc.fontSize(10)
      doc.text(e.body_text?.trim() || '(empty)', {
        width: 500,
        align: 'left',
      })
      doc.moveDown(0.75)

      const entryImgs = imgs.get(e.id) ?? []
      for (const im of entryImgs) {
        const raw = await fetchImageBytes(im.public_url)
        if (!raw) {
          doc.fontSize(9).fillColor('#b91c1c')
          doc.text(`[Image not embedded: ${im.file_name}]`)
          doc.fillColor('#000000')
          doc.moveDown(0.35)
          continue
        }
        const jpeg = await rasterizeForPdfEmbedding(raw)
        if (!jpeg) {
          doc.fontSize(9).fillColor('#b91c1c')
          doc.text(`[Image could not be processed: ${im.file_name}]`)
          doc.fillColor('#000000')
          doc.moveDown(0.35)
          continue
        }
        try {
          doc.image(jpeg, {
            fit: [500, 360],
            align: 'center',
          })
          doc.moveDown(0.25)
          doc.fontSize(8).fillColor('#666666').text(im.file_name, { align: 'center' })
          doc.fillColor('#000000')
          doc.moveDown(0.5)
        } catch {
          doc.fontSize(9).fillColor('#b91c1c')
          doc.text(`[Image layout skipped: ${im.file_name}]`)
          doc.fillColor('#000000')
          doc.moveDown(0.35)
        }
      }
    }

    from += batch.length
    if (batch.length < ENTRY_PAGE_SIZE) break
  }

  if (totalEntries === 0) {
    doc.addPage()
    doc.fontSize(12).text('No journal entries yet.', { align: 'center' })
  }

  doc.end()
  await finished(writeStream)

  const pdfBuffer = await fs.promises.readFile(tmpPath)
  await fs.promises.unlink(tmpPath).catch(() => {})

  const objectPath = `${dbUserId}/${jobId}.pdf`
  const { error: upErr } = await supabase.storage.from(JOURNAL_EXPORTS_BUCKET).upload(objectPath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: true,
  })

  if (upErr) {
    throw new Error(`storage upload: ${upErr.message}`)
  }

  return { bucket: JOURNAL_EXPORTS_BUCKET, objectPath }
}

export async function startPdfExportWorker(shared: IORedis): Promise<{ worker: Worker }> {
  const workerConnection = shared.duplicate()

  const worker = new Worker(
    QUEUE_PDF_EXPORT,
    async (job) => {
      if (job.name !== PDF_EXPORT_JOB_NAME) {
        console.warn('[pdf-export] unexpected job name', job.name)
        return
      }
      return runPdfExportJob(job)
    },
    {
      connection: workerConnection,
      concurrency: 1,
      lockDuration: 45 * 60 * 1000,
    }
  )

  console.info('[pdf-export] worker registered:', QUEUE_PDF_EXPORT)

  return { worker }
}
