import 'server-only'

import { Queue } from 'bullmq'
import IORedis, { type RedisOptions } from 'ioredis'

import {
  PDF_EXPORT_JOB_NAME,
  type PdfExportJobPayload,
} from '@/lib/bullmq/pdf-export-job'
import { QUEUE_PDF_EXPORT } from '@/workers/queue-names'

const redisOpts: Partial<RedisOptions> = {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    return Math.min(times * 300, 10_000)
  },
}

const g = globalThis as unknown as {
  __pdfExportRedis?: IORedis
  __pdfExportQueue?: Queue
}

export function getPdfExportQueue(): Queue {
  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    throw new Error('REDIS_URL is not set')
  }
  if (!g.__pdfExportQueue) {
    g.__pdfExportRedis = new IORedis(url, redisOpts)
    g.__pdfExportQueue = new Queue(QUEUE_PDF_EXPORT, { connection: g.__pdfExportRedis })
  }
  return g.__pdfExportQueue
}

export async function enqueueFullJournalPdfExport(dbUserId: string): Promise<string> {
  const queue = getPdfExportQueue()
  const job = await queue.add(
    PDF_EXPORT_JOB_NAME,
    { dbUserId } satisfies PdfExportJobPayload,
    {
      attempts: 1,
      removeOnComplete: { age: 3600, count: 200 },
      removeOnFail: { age: 86_400, count: 100 },
    }
  )
  const id = job.id
  if (id == null) {
    throw new Error('BullMQ job has no id')
  }
  return String(id)
}

export async function getPdfExportJobById(jobId: string) {
  const queue = getPdfExportQueue()
  return queue.getJob(jobId)
}
