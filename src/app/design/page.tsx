import { Metadata } from 'next'
import { ConfigHub } from '@/components/design/config-hub'

export const metadata: Metadata = { title: 'Configuración' }

export default function DesignConfigPage() {
  return <ConfigHub />
}
