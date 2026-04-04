import { redirect } from 'next/navigation'

/** Prefer the Sanctuary journal composer; pending-entry reuse is handled on `/journal`. */
export default function NewEntryPage() {
  redirect('/journal')
}
