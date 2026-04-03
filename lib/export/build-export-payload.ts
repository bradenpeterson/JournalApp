export type MoodExport = {
  score: number
  mood_label: string
  summary: string | null
  created_at: string
} | null

export type ImageExport = {
  id: string
  public_url: string
  file_name: string
  mime_type: string
}

export type EntryExportRow = {
  id: string
  title: string
  body_text: string | null
  word_count: number
  created_at: string
  updated_at: string
  mood_analyses: Array<{
    id: string
    score: number
    mood_label: string
    summary: string | null
    created_at: string
  }> | null
  entry_images: Array<{
    id: string
    public_url: string
    file_name: string
    mime_type: string
  }> | null
}

export type JournalJsonExport = {
  exported_at: string
  user: { id: string; email: string; display_name: string | null }
  entries: Array<{
    id: string
    title: string
    body_text: string | null
    word_count: number
    created_at: string
    updated_at: string
    mood: MoodExport
    images: ImageExport[]
  }>
}

function latestMood(
  rows: EntryExportRow['mood_analyses']
): MoodExport {
  if (!rows?.length) return null
  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const m = sorted[0]
  return {
    score: m.score,
    mood_label: m.mood_label,
    summary: m.summary,
    created_at: m.created_at,
  }
}

export function buildJournalJsonExport(
  user: JournalJsonExport['user'],
  rows: EntryExportRow[]
): JournalJsonExport {
  const exported_at = new Date().toISOString()
  const entries = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body_text: r.body_text,
    word_count: r.word_count,
    created_at: r.created_at,
    updated_at: r.updated_at,
    mood: latestMood(r.mood_analyses),
    images: (r.entry_images ?? []).map((img) => ({
      id: img.id,
      public_url: img.public_url,
      file_name: img.file_name,
      mime_type: img.mime_type,
    })),
  }))
  return { exported_at, user, entries }
}
