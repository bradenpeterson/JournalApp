import Link from 'next/link'

/**
 * Placeholder until §2.6 (full fetch + TiptapEditor + title).
 * `/entries/new` redirects here so the route must exist.
 */
export default async function EditEntryPlaceholderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <p className="text-neutral-600 dark:text-neutral-400">
        Draft <span className="font-mono text-sm">{id}</span> — editor UI arrives in §2.6.
      </p>
      <Link
        href="/entries/new"
        className="text-sm text-violet-600 underline underline-offset-2 dark:text-violet-400"
      >
        New entry
      </Link>
    </main>
  )
}
