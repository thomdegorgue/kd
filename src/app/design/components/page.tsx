import { Metadata } from 'next'
import { ComponentsTab } from '@/components/design/components-tab'

export const metadata: Metadata = { title: 'Componentes' }

export default function DesignComponentsPage() {
  return (
    <div className="max-w-screen-lg mx-auto px-6 py-8">
      <ComponentsTab />
    </div>
  )
}
