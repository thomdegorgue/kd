import { Metadata } from 'next'
import { AdminPreview } from '@/components/design/admin-preview'

export const metadata: Metadata = { title: 'Panel Admin' }

export default function DesignAdminPage() {
  return <AdminPreview />
}
