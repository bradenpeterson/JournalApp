/** sessionStorage key: last draft created from `/journal` (or legacy `/entries/new` redirect; avoids duplicate blank rows on refresh). */
export const PENDING_ENTRY_SESSION_KEY = 'journal:pendingEntryId'

export function getPendingEntryIdFromSession(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PENDING_ENTRY_SESSION_KEY)
}

export function setPendingEntryIdInSession(id: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PENDING_ENTRY_SESSION_KEY, id)
}

export function clearPendingEntryIdFromSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PENDING_ENTRY_SESSION_KEY)
}
