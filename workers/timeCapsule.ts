import { Queue, Worker, type Job } from 'bullmq'
import type IORedis from 'ioredis'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  TIME_CAPSULE_RECONCILE_JOB_NAME,
  TIME_CAPSULE_UNLOCK_JOB_NAME,
  type TimeCapsuleJobPayload,
} from '@/lib/bullmq/capsule-job-name'
import { createServiceRoleClient } from '@/lib/db/supabase-service-role'
import { sendCapsuleUnlockedEmail } from '@/lib/email/send-capsule-unlocked'

import { QUEUE_TIME_CAPSULE } from './queue-names'

/** Pick up rows past `unlock_at` that never got a delayed job (e.g. worker restart). */
export const TIME_CAPSULE_RECONCILE_SCHEDULER_ID = 'time-capsule-reconcile-15m'

/** Every 15 minutes UTC */
export const TIME_CAPSULE_RECONCILE_CRON = '*/15 * * * *'

type CapsuleRow = {
  id: string
  user_id: string
  title: string
  unlock_at: string
  is_unlocked: boolean
  notification_sent: boolean
}

export async function processTimeCapsuleUnlock(
  supabase: SupabaseClient,
  capsuleId: string,
): Promise<void> {
  const { data: cap, error } = await supabase
    .from('time_capsules')
    .select('id, user_id, title, unlock_at, is_unlocked, notification_sent')
    .eq('id', capsuleId)
    .maybeSingle()

  if (error) throw error
  if (!cap) {
    console.warn('[time-capsule] capsule not found', capsuleId)
    return
  }

  const row = cap as CapsuleRow

  if (row.is_unlocked && row.notification_sent) return

  if (new Date(row.unlock_at).getTime() > Date.now()) {
    console.info('[time-capsule] unlock_at not reached yet', capsuleId)
    return
  }

  if (!row.is_unlocked) {
    const { error: upErr } = await supabase
      .from('time_capsules')
      .update({ is_unlocked: true })
      .eq('id', capsuleId)
      .eq('is_unlocked', false)

    if (upErr) throw upErr
  }

  const { data: fresh, error: refErr } = await supabase
    .from('time_capsules')
    .select('notification_sent')
    .eq('id', capsuleId)
    .maybeSingle()

  if (refErr) throw refErr
  if ((fresh as { notification_sent: boolean } | null)?.notification_sent) return

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('email, display_name')
    .eq('id', row.user_id)
    .maybeSingle()

  if (userErr) throw userErr

  const to = typeof user?.email === 'string' ? user.email.trim() : ''
  if (!to) {
    console.warn('[time-capsule] no email for user', row.user_id)
    const { error: markErr } = await supabase
      .from('time_capsules')
      .update({ notification_sent: true })
      .eq('id', capsuleId)
    if (markErr) throw markErr
    return
  }

  const send = await sendCapsuleUnlockedEmail({
    to,
    title: row.title,
    unlockAtIso: row.unlock_at,
    capsuleId: row.id,
  })

  if (!send.ok) {
    if (send.reason.includes('RESEND_API_KEY')) {
      console.warn('[time-capsule] email skipped (no Resend key)', capsuleId)
      const { error: markErr } = await supabase
        .from('time_capsules')
        .update({ notification_sent: true })
        .eq('id', capsuleId)
      if (markErr) throw markErr
      return
    }
    throw new Error(send.reason)
  }

  const { error: doneErr } = await supabase
    .from('time_capsules')
    .update({ notification_sent: true })
    .eq('id', capsuleId)

  if (doneErr) throw doneErr
}

async function reconcileDueCapsules(supabase: SupabaseClient): Promise<void> {
  const iso = new Date().toISOString()
  const ids = new Set<string>()

  const { data: stillLocked, error: e1 } = await supabase
    .from('time_capsules')
    .select('id')
    .lte('unlock_at', iso)
    .eq('is_unlocked', false)

  if (e1) throw e1
  for (const r of stillLocked ?? []) ids.add((r as { id: string }).id)

  const { data: needEmail, error: e2 } = await supabase
    .from('time_capsules')
    .select('id')
    .lte('unlock_at', iso)
    .eq('is_unlocked', true)
    .eq('notification_sent', false)

  if (e2) throw e2
  for (const r of needEmail ?? []) ids.add((r as { id: string }).id)

  for (const id of ids) {
    try {
      await processTimeCapsuleUnlock(supabase, id)
    } catch (e) {
      console.error('[time-capsule] reconcile failed', id, e)
    }
  }
}

async function runJob(job: Job): Promise<void> {
  const supabase = createServiceRoleClient()

  if (job.name === TIME_CAPSULE_RECONCILE_JOB_NAME) {
    console.info('[time-capsule] reconcile job', job.id)
    await reconcileDueCapsules(supabase)
    return
  }

  if (job.name === TIME_CAPSULE_UNLOCK_JOB_NAME) {
    const payload = job.data as TimeCapsuleJobPayload
    if (typeof payload?.capsuleId !== 'string') {
      throw new Error('unlock job missing capsuleId')
    }
    await processTimeCapsuleUnlock(supabase, payload.capsuleId)
    return
  }

  console.warn('[time-capsule] unknown job name', job.name, job.id)
}

/**
 * Registers unlock processor, concurrency 1 to reduce duplicate unlock emails, and a 15m reconcile scheduler.
 */
export async function startTimeCapsuleWorker(shared: IORedis): Promise<{
  worker: Worker
  queue: Queue
}> {
  const queueConnection = shared.duplicate()
  const workerConnection = shared.duplicate()

  const queue = new Queue(QUEUE_TIME_CAPSULE, { connection: queueConnection })

  await queue.upsertJobScheduler(
    TIME_CAPSULE_RECONCILE_SCHEDULER_ID,
    { pattern: TIME_CAPSULE_RECONCILE_CRON, tz: 'UTC' },
    {
      name: TIME_CAPSULE_RECONCILE_JOB_NAME,
      data: {},
      opts: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 30 },
      },
    },
  )

  const worker = new Worker(QUEUE_TIME_CAPSULE, (job) => runJob(job), {
    connection: workerConnection,
    concurrency: 1,
  })

  console.info(
    '[time-capsule] worker ready; reconcile scheduler:',
    TIME_CAPSULE_RECONCILE_SCHEDULER_ID,
    TIME_CAPSULE_RECONCILE_CRON,
    'UTC',
  )

  void (async () => {
    try {
      const supabase = createServiceRoleClient()
      await reconcileDueCapsules(supabase)
      console.info('[time-capsule] startup reconcile finished')
    } catch (e) {
      console.error('[time-capsule] startup reconcile error', e)
    }
  })()

  return { worker, queue }
}
