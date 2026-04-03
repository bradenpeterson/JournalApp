/**
 * Railway / long-running worker entry (§4.1).
 * Run locally: `npm run worker` (`scripts/run-worker.mjs` loads `.env.local` when that file exists).
 * Needs REDIS_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (for emails), etc.
 * On Railway: second service with `npm run worker`; set env in the dashboard (no `.env.local` in the image).
 */
import { Queue, Worker } from 'bullmq'

import { createBullmqConnection } from './redis-connection'
import { startPdfExportWorker } from './pdfExport'
import { startTimeCapsuleWorker } from './timeCapsule'
import { startWeeklyDigestWorker } from './weeklyDigest'

async function main() {
  const shared = createBullmqConnection()

  shared.on('error', (err) => {
    console.error('[redis] connection error', err)
  })

  const workers: Worker[] = []
  const queues: Queue[] = []

  const { worker: weeklyWorker, queue: weeklyQueue } = await startWeeklyDigestWorker(shared)
  workers.push(weeklyWorker)
  queues.push(weeklyQueue)

  const { worker: capsuleWorker, queue: capsuleQueue } = await startTimeCapsuleWorker(shared)
  workers.push(capsuleWorker)
  queues.push(capsuleQueue)

  const { worker: pdfWorker } = await startPdfExportWorker(shared)
  workers.push(pdfWorker)

  for (const w of workers) {
    w.on('error', (err) => {
      console.error(`[worker:${w.name}]`, err)
    })
  }

  console.info('[worker] BullMQ workers registered (weekly digest + time capsule + PDF export)')

  const shutdown = async (signal: string) => {
    console.info(`[worker] ${signal} — closing workers and queues…`)
    await Promise.all(workers.map((w) => w.close()))
    await Promise.all(queues.map((q) => q.close()))
    await shared.quit()
    process.exit(0)
  }

  process.once('SIGTERM', () => void shutdown('SIGTERM'))
  process.once('SIGINT', () => void shutdown('SIGINT'))
}

main().catch((e) => {
  console.error('[worker] fatal', e)
  process.exit(1)
})
