import { Metadata } from 'next'
import { VitrinePreview } from '@/components/design/vitrine-preview'

export const metadata: Metadata = { title: 'Catálogo' }

export default function DesignVitrinePage() {
  return <VitrinePreview />
}
