import type { Metadata } from 'next'
import { DesignNav } from '@/components/design/design-nav'

export const metadata: Metadata = { title: { default: 'Design System', template: '%s — Design' } }

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DesignNav />
      {children}
    </div>
  )
}
