import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Acceder — KitDigital.ar',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/">
            <Image
              src="/logo.jpg"
              alt="KitDigital"
              width={48}
              height={48}
              className="rounded-xl"
            />
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
