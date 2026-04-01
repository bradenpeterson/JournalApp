/** Job name for delayed unlock — API (`scheduleCapsuleUnlockJob`) and worker must match. */
export const TIME_CAPSULE_UNLOCK_JOB_NAME = 'unlock' as const

/** Periodic sweep for missed delayed jobs (§4.7 reconciliation). */
export const TIME_CAPSULE_RECONCILE_JOB_NAME = 'reconcile-due-capsules' as const

export type TimeCapsuleJobPayload = { capsuleId: string }
