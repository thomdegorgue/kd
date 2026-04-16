'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { enableModule, disableModule } from '@/lib/actions/modules'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { queryKeys } from '@/lib/hooks/query-keys'
import type { ModuleName } from '@/lib/types'

export function useToggleModule() {
  const queryClient = useQueryClient()
  const { store_id } = useAdminContext()

  return useMutation({
    mutationFn: async ({ module, enabled }: { module: ModuleName; enabled: boolean }) => {
      const result = enabled ? await enableModule(module) : await disableModule(module)
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.storeConfig(store_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.storeModules(store_id) })
      toast.success(variables.enabled ? 'Módulo activado' : 'Módulo desactivado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
