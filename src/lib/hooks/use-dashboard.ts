'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/lib/actions/dashboard'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys, staleTimes, gcTimes } from '@/lib/hooks/query-keys'

export function useDashboardStats() {
  const { store_id } = useAdminContext()

  return useQuery({
    queryKey: queryKeys.dashboardStats(store_id),
    queryFn: async () => {
      const result = await getDashboardStats()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    staleTime: staleTimes.dashboardStats,
    gcTime: gcTimes.dashboardStats,
    refetchInterval: 60 * 1000, // polling cada 60s
  })
}
