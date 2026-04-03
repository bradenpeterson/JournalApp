type AccountSummaryProps = {
  email: string | null
  displayLine: string | null
}

export function AccountSummary({ email, displayLine }: AccountSummaryProps) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Account</h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Signed in with Clerk.</p>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Email</dt>
          <dd className="mt-0.5 text-neutral-900 dark:text-neutral-100">{email ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Name</dt>
          <dd className="mt-0.5 text-neutral-900 dark:text-neutral-100">{displayLine ?? '—'}</dd>
        </div>
      </dl>
    </section>
  )
}
