/**
 * Railway / long-running worker entry (§4.1).
 * Run locally: `REDIS_URL=... npm run worker`
 * On Railway: add a second service with start command `npm run worker` and the same env as the web app where applicable.
 */
import { Queue, Worker } from 'bullmq'

import { createBullmqConnection } from './redis-connection'
import { QUEUE_TIME_CAPSULE } from './queue-names'
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

  workers.push(
    new Worker(
      QUEUE_TIME_CAPSULE,
      async (job) => {
        console.info(`[${QUEUE_TIME_CAPSULE}] stub processor (implement §4.7)`, job.id, job.name)
      },
      { connection: shared.duplicate() },
    ),
  )

  for (const w of workers) {
    w.on('error', (err) => {
      console.error(`[worker:${w.name}]`, err)
    })
  }

  console.info('[worker] BullMQ workers registered (weekly digest + time-capsule stub)')

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
