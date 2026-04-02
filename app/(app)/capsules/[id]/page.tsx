import Link from 'next/link'

import { CapsuleDetail } from '@/components/capsules/CapsuleDetail'

export default async function CapsuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link
        href="/capsules"
        className="text-sm text-violet-600 underline-offset-2 hover:underline dark:text-violet-400"
      >
        ← Back to capsules
      </Link>
      <div className="mt-6">
        <CapsuleDetail capsuleId={id} />
      </div>
    </main>
  )
}
