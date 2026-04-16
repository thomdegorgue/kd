'use client'

import { StoreSettingsForm } from '@/components/admin/store-settings-form'

export default function SettingsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configuración</h2>
        <p className="text-sm text-muted-foreground">Datos generales de tu tienda.</p>
      </div>
      <StoreSettingsForm />
    </div>
  )
}
