import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Configurá tu tienda — KitDigital.ar',
}

const STEPS = [
  { label: 'Tu tienda' },
  { label: 'Logo' },
  { label: 'Primer producto' },
  { label: '¡Listo!' },
]

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b bg-background flex items-center px-4">
        <Link href="/">
          <Image src="/logo.jpg" alt="KitDigital" width={32} height={32} className="rounded-lg" />
        </Link>
        <span className="ml-2 font-semibold text-sm">KitDigital.ar</span>
      </header>

      {/* Contenido */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-8">
          {children}
        </div>
      </main>
    </div>
  )
}
