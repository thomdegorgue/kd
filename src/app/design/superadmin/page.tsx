import { Metadata } from 'next'
import { SuperadminPreview } from '@/components/design/superadmin-preview'

export const metadata: Metadata = { title: 'Superadmin' }

export default function DesignSuperadminPage() {
  return <SuperadminPreview />
}
