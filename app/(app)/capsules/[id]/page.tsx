import Link from 'next/link'

import { CapsuleDetail } from '@/components/capsules/CapsuleDetail'

export default async function CapsuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <div className="mx-auto w-full max-w-[1280px] px-6 py-6 sm:px-10 lg:px-12">
      <Link
        href="/capsules"
        className="text-sm text-sanctuary-primary underline-offset-2 hover:underline dark:text-teal-300"
      >
        ← Back to capsules
      </Link>
      <div className="mt-8">
        <CapsuleDetail capsuleId={id} />
      </div>
    </div>
  )
}
