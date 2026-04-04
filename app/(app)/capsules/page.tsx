import Link from 'next/link'

import { CapsuleList } from '@/components/capsules/CapsuleList'

export default function CapsulesPage() {
  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6 sm:px-10 lg:px-12">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl italic leading-tight text-sanctuary-text dark:text-zinc-100 sm:text-5xl">
            Time capsules
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-sanctuary-muted dark:text-zinc-400">
            Lock away a note until a date you choose. Your past self writes; your future self reads.
          </p>
        </div>
        <Link
          href="/capsules/new"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-sanctuary-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-sanctuary-primary-hover dark:bg-teal-400 dark:text-zinc-950 dark:hover:bg-teal-300"
        >
          New capsule
        </Link>
      </header>
      <CapsuleList />
    </div>
  )
}
