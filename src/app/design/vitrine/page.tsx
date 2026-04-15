import { VitrinePreview } from '@/components/design/vitrine-preview'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Catálogo' }

export default function DesignVitrinePage() {
  return <VitrinePreview />
}
