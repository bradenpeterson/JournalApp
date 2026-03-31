import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'

import { EntryEditForm } from '@/components/entries/EntryEditForm'
import { createSupabaseServerClient } from '@/lib/db/supabase-server'
import { isUuid } from '@/lib/utils/uuid'

export default async function EditEntryPage({
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
    .select('id, title, body')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('EditEntryPage load', error)
    throw new Error('Failed to load entry')
  }

  if (!data) {
    notFound()
  }

  return (
    <main>
      <EntryEditForm key={data.id} entryId={data.id} initialTitle={data.title} initialBody={data.body} />
    </main>
  )
}
