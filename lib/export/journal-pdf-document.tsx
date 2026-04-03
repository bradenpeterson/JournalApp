import { Document, Page, StyleSheet, Text } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

import type { JournalJsonExport } from '@/lib/export/build-export-payload'

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, marginBottom: 6, fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: 9, color: '#444444', marginBottom: 14 },
  body: { fontSize: 10, lineHeight: 1.45 },
  mood: { fontSize: 9, marginTop: 10, color: '#333333' },
  footer: { position: 'absolute', bottom: 28, left: 48, right: 48, fontSize: 8, color: '#888888' },
})

export function JournalPdfDocument({ payload }: { payload: JournalJsonExport }): ReactElement {
  const { entries, exported_at } = payload

  if (entries.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Journal export</Text>
          <Text style={styles.meta}>Exported {exported_at}</Text>
          <Text style={styles.body}>No entries yet.</Text>
        </Page>
      </Document>
    )
  }

  return (
    <Document>
      {entries.map((e) => {
        const moodLine = e.mood
          ? `Mood: ${e.mood.mood_label} (${e.mood.score}/10)`
          : 'Mood: —'
        const imagesLine =
          e.images.length > 0
            ? `Images: ${e.images.map((i) => i.file_name).join(', ')}`
            : null
        return (
          <Page key={e.id} size="A4" style={styles.page}>
            <Text style={styles.title}>{e.title?.trim() || 'Untitled'}</Text>
            <Text style={styles.meta}>
              {e.created_at} · {e.word_count} words
            </Text>
            <Text style={styles.body}>{e.body_text ?? ''}</Text>
            <Text style={styles.mood}>{moodLine}</Text>
            {imagesLine ? <Text style={styles.mood}>{imagesLine}</Text> : null}
            <Text style={styles.footer} fixed>
              Entry {e.id.slice(0, 8)}…
            </Text>
          </Page>
        )
      })}
    </Document>
  )
}
