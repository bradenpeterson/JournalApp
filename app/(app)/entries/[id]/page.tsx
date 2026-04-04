import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { EntryViewActions } from '@/components/entries/EntryViewActions'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { entryBodyToHtml } from '@/lib/editor/entry-body-html'
import { isUuid } from '@/lib/utils/uuid'

function formatTimestamp(iso: string) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d)
  } catch {
    return iso
  }
}

export default async function EntryViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!isUuid(id)) {
    notFound()
  }

  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('entries')
    .select('id, title, body, body_text, word_count, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('EntryViewPage load', error)
    throw new Error('Failed to load entry')
  }

  if (!data) {
    notFound()
  }

  const html = entryBodyToHtml(data.body)
  const showFallback = !html.trim() && (data.body_text?.trim() ?? '') !== ''

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <Link
          href="/entries"
          className="text-sm text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
        >
          ← All entries
        </Link>
      </div>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
            {data.title?.trim() || 'Untitled'}
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Updated{' '}
            <time dateTime={data.updated_at}>{formatTimestamp(data.updated_at)}</time>
            {' · '}
            {data.word_count} {data.word_count === 1 ? 'word' : 'words'}
          </p>
        </div>
        <EntryViewActions entryId={data.id} />
      </header>

      <article
        className="entry-readonly-body max-w-none rounded-lg border border-neutral-200 bg-white px-4 py-6 text-[15px] leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-neutral-200 dark:[&_img]:border-neutral-700 [&_li]:my-0.5 [&_ol]:my-2 [&_p]:my-2 [&_ul]:my-2"
        {...(showFallback
          ? {}
          : { dangerouslySetInnerHTML: { __html: html || '<p></p>' } })}
      >
        {showFallback ? (
          <p className="whitespace-pre-wrap">{data.body_text ?? ''}</p>
        ) : null}
      </article>
    </div>
  )
}
