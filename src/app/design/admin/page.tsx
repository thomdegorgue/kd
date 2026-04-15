import { AdminPreview } from '@/components/design/admin-preview'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Panel Admin' }

export default function DesignAdminPage() {
  return <AdminPreview />
}
