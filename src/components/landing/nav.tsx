'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/92 backdrop-blur-xl border-b border-[#e0e0e0]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.jpg"
            alt="KitDigital"
            width={26}
            height={26}
            className="rounded-md"
          />
          <span
            className={`text-sm font-semibold tracking-tight transition-colors duration-300 ${
              scrolled ? 'text-[#1b1b1b]' : 'text-white'
            }`}
          >
            KitDigital.ar
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-0.5">
          <a
            href="#modulos"
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors duration-200 ${
              scrolled
                ? 'text-[#6e6e73] hover:text-[#1b1b1b] hover:bg-[#f6f6f6]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
          >
            Módulos
          </a>
          <a
            href="#precio"
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors duration-200 ${
              scrolled
                ? 'text-[#6e6e73] hover:text-[#1b1b1b] hover:bg-[#f6f6f6]'
                : 'text-white/55 hover:text-white hover:bg-white/8'
            }`}
          >
            Precio
          </a>
        </nav>

        {/* CTA */}
        <Button
          render={<Link href="/auth/signup" />}
          className={`h-8 px-4 text-sm font-medium rounded-full border-0 transition-all duration-300 ${
            scrolled
              ? 'bg-[#1b1b1b] text-white hover:bg-[#1b1b1b]/80'
              : 'bg-white text-[#1b1b1b] hover:bg-white/90'
          }`}
        >
          Crear catálogo →
        </Button>
      </div>
    </header>
  )
}
