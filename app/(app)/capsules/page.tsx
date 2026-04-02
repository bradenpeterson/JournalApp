import Link from 'next/link'

import { CapsuleList } from '@/components/capsules/CapsuleList'

export default function CapsulesPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Time capsules</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Lock away a note until a date you choose. Your past self writes; your future self reads.
          </p>
        </div>
        <Link
          href="/capsules/new"
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          New capsule
        </Link>
      </div>
      <CapsuleList />
    </main>
  )
}
