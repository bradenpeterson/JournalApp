import 'server-only'

import { Queue } from 'bullmq'
import IORedis, { type RedisOptions } from 'ioredis'

import { TIME_CAPSULE_UNLOCK_JOB_NAME, type TimeCapsuleJobPayload } from '@/lib/bullmq/capsule-job-name'
import { QUEUE_TIME_CAPSULE } from '@/workers/queue-names'

/** ~10 years — BullMQ delayed jobs; avoid absurd `unlock_at` values. */
export const MAX_CAPSULE_DELAY_MS = Math.floor(10 * 365.25 * 24 * 60 * 60 * 1000)

const redisOpts: Partial<RedisOptions> = {
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    return Math.min(times * 300, 10_000)
  },
}

const g = globalThis as unknown as {
  __timeCapsuleRedis?: IORedis
  __timeCapsuleQueue?: Queue
}

export function getTimeCapsuleQueue(): Queue {
  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    throw new Error('REDIS_URL is not set')
  }
  if (!g.__timeCapsuleQueue) {
    const connection = new IORedis(url, redisOpts)
    g.__timeCapsuleRedis = connection
    g.__timeCapsuleQueue = new Queue(QUEUE_TIME_CAPSULE, { connection })
  }
  return g.__timeCapsuleQueue
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim())
}

export async function scheduleCapsuleUnlockJob(
  capsuleId: string,
  delayMs: number,
): Promise<string> {
  const queue = getTimeCapsuleQueue()
  const job = await queue.add(
    TIME_CAPSULE_UNLOCK_JOB_NAME,
    { capsuleId } satisfies TimeCapsuleJobPayload,
    {
      delay: delayMs,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 50 },
    },
  )
  const id = job.id
  if (id == null) {
    throw new Error('BullMQ job has no id')
  }
  return String(id)
}

/** Best-effort remove delayed job (e.g. before capsule delete). */
export async function removeCapsuleJobById(bullJobId: string | null): Promise<void> {
  if (!bullJobId || !isRedisConfigured()) return
  try {
    const queue = getTimeCapsuleQueue()
    const job = await queue.getJob(bullJobId)
    if (job) await job.remove()
  } catch (e) {
    console.warn('[time-capsule] removeCapsuleJobById', bullJobId, e)
  }
}
