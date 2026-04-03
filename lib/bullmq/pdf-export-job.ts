export const PDF_EXPORT_JOB_NAME = 'generate-full-journal-pdf' as const

export type PdfExportJobPayload = {
  dbUserId: string
}

export type PdfExportJobResult = {
  bucket: string
  objectPath: string
}
