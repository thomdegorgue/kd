import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Configurá tu tienda — KitDigital.ar',
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="h-14 border-b bg-background flex items-center px-4 shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="KitDigital" width={28} height={28} className="rounded-lg" />
          <span className="font-semibold text-sm">KitDigital.ar</span>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-slide-in">
          {children}
        </div>
      </main>
    </div>
  )
}
