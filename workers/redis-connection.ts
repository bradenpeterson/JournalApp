import IORedis, { type RedisOptions } from 'ioredis'

/**
 * Shared Redis client options for BullMQ (§4.1).
 * `maxRetriesPerRequest: null` is required so BullMQ can issue blocking commands.
 */
const connectionOptions: Partial<RedisOptions> = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  /**
   * Exponential backoff with cap — survives brief Railway / Redis restarts.
   */
  retryStrategy(times: number) {
    return Math.min(times * 300, 10_000)
  },
  /**
   * After failover, Redis may briefly return READONLY; allow reconnect.
   */
  reconnectOnError(err: Error) {
    if (err.message.includes('READONLY')) return true
    return false
  },
}

/**
 * Create a dedicated IORedis connection for BullMQ workers.
 * Callers should use `duplicate()` per Worker so each has its own connection.
 */
export function createBullmqConnection(): IORedis {
  const url = process.env.REDIS_URL?.trim()
  if (!url) {
    throw new Error('REDIS_URL is required to run the worker process (§4.1).')
  }
  return new IORedis(url, connectionOptions)
}
