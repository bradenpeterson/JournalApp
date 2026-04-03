export function ExportDownloads() {
  return (
    <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Export journal</h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Download all entries with mood and image metadata. Exports use your signed-in session.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href="/api/export/json"
          className="inline-flex items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500"
        >
          Download JSON
        </a>
        <a
          href="/api/export/pdf"
          className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Download PDF
        </a>
      </div>
    </section>
  )
}
