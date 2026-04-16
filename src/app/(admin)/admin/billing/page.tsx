'use client'

import { Zap } from 'lucide-react'
import { BillingPanel } from '@/components/admin/billing-panel'

export default function BillingPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5" />
        <div>
          <h2 className="text-lg font-semibold">Suscripción</h2>
          <p className="text-sm text-muted-foreground">
            Gestioná tu plan, tier de productos y módulos pro.
          </p>
        </div>
      </div>
      <BillingPanel />
    </div>
  )
}
