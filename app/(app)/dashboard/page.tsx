import { Suspense } from 'react'

import { DashboardHome } from '@/components/dashboard/DashboardHome'
import { loadDashboardStats } from '@/lib/dashboard/load-dashboard-stats'

async function DashboardWithStats() {
  const stats = await loadDashboardStats()
  return <DashboardHome stats={stats} />
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <Suspense fallback={<DashboardHome />}>
        <DashboardWithStats />
      </Suspense>
    </div>
  )
}
