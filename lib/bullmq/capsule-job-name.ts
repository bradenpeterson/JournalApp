/** Job name for delayed unlock — worker (§4.7) must use the same string. */
export const TIME_CAPSULE_UNLOCK_JOB_NAME = 'unlock' as const

export type TimeCapsuleJobPayload = { capsuleId: string }
