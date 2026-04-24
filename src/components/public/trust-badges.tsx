'use client'

import { Truck, Shield, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function TrustBadges() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <Card className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2" />
        <h4 className="text-xs sm:text-sm font-medium leading-tight">Envío en 24–48hs</h4>
      </Card>
      <Card className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2" />
        <h4 className="text-xs sm:text-sm font-medium leading-tight">Compra segura</h4>
      </Card>
      <Card className="flex flex-col items-center justify-center p-4 sm:p-6 text-center">
        <RotateCcw className="h-6 w-6 sm:h-8 sm:w-8 text-primary mb-2" />
        <h4 className="text-xs sm:text-sm font-medium leading-tight">Cambio sin costo</h4>
      </Card>
    </div>
  )
}
