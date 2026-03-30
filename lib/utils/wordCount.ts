export function wordCountFromPlainText(text: string): number {
  const t = text.trim()
  if (!t) return 0
  return t.split(/\s+/).length
}
