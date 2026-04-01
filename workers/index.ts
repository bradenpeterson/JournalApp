/**
 * Railway / long-running worker entry (§4.1).
 * Run locally: `REDIS_URL=... npm run worker`
 * On Railway: add a second service with start command `npm run worker` and the same env as the web app where applicable.
 */
import { Worker } from 'bullmq'

import { createBullmqConnection } from './redis-connection'

/** Queue names — keep in sync with §4.3 / §4.6–4.7 when those ship. */
export const QUEUE_WEEKLY_DIGEST = 'weekly-digest'
export const QUEUE_TIME_CAPSULE = 'time-capsule'

async function main() {
  const shared = createBullmqConnection()

  shared.on('error', (err) => {
    console.error('[redis] connection error', err)
  })

  const workers: Worker[] = [
    new Worker(
      QUEUE_WEEKLY_DIGEST,
      async (job) => {
        console.info(`[${QUEUE_WEEKLY_DIGEST}] stub processor (implement §4.3)`, job.id, job.name)
      },
      { connection: shared.duplicate() },
    ),
    new Worker(
      QUEUE_TIME_CAPSULE,
      async (job) => {
        console.info(`[${QUEUE_TIME_CAPSULE}] stub processor (implement §4.7)`, job.id, job.name)
      },
      { connection: shared.duplicate() },
    ),
  ]

  for (const w of workers) {
    w.on('error', (err) => {
      console.error(`[worker:${w.name}]`, err)
    })
  }

  console.info('[worker] BullMQ workers registered:', QUEUE_WEEKLY_DIGEST, QUEUE_TIME_CAPSULE)

  const shutdown = async (signal: string) => {
    console.info(`[worker] ${signal} — closing workers…`)
    await Promise.all(workers.map((w) => w.close()))
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
