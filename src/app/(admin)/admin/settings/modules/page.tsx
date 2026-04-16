'use client'

import { ModuleToggleList } from '@/components/admin/module-toggle-list'

export default function ModulesPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Módulos</h2>
        <p className="text-sm text-muted-foreground">
          Activá o desactivá las funcionalidades de tu tienda.
        </p>
      </div>
      <ModuleToggleList />
    </div>
  )
}
