import type { Metadata } from 'next'

import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { loadAnalyticsData } from '@/lib/analytics/load-analytics-data'

export const metadata: Metadata = {
  title: 'Analytics',
}

export default async function AnalyticsPage() {
  const data = await loadAnalyticsData()
  return <AnalyticsDashboard data={data} />
}
