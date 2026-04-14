import { Metadata } from 'next'
import { VitrinePreview } from '@/components/design/vitrine-preview'

export const metadata: Metadata = { title: 'Vitrina' }

export default function DesignVitrinePage() {
  return <VitrinePreview />
}
