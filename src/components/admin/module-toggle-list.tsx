'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { useTogglePack } from '@/lib/hooks/use-billing'
import { PACKS } from '@/lib/billing/packs'
import { PackCard } from '@/components/admin/pack-card'
import type { PackId } from '@/lib/billing/packs'

export function ModuleToggleList() {
  const { user_role, billing_status } = useAdminContext()
  const togglePackMutation = useTogglePack()
  const isOwner = user_role === 'owner'
  const isActive = billing_status === 'active'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-4">Tus módulos</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Cada pack agrupa módulos relacionados para que tu tienda funcione mejor. Actívalos según lo que necesites.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PACKS.map(pack => (
          <PackCard
            key={pack.id}
            pack={pack}
            isActive={pack.id === 'core'} // Placeholder: debería leer del store
            onToggle={
              pack.id !== 'core' && isOwner && isActive
                ? (enabled) => {
                    togglePackMutation.mutate({ pack_id: pack.id as PackId, enabled })
                  }
                : undefined
            }
            disabled={pack.id === 'core' || !isOwner || !isActive}
            isLoading={togglePackMutation.isPending}
          />
        ))}
      </div>

      {!isActive && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-800 font-medium mb-2">
            Necesitás una suscripción activa para cambiar packs.
          </p>
          <Link href="/admin/billing" className="text-sm font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" />
            Ir a Suscripción
          </Link>
        </div>
      )}
    </div>
  )
}
