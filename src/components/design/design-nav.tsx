'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDesignStore } from '@/lib/stores/design-store'
import Image from 'next/image'

const SECTIONS = [
  { href: '/design',            label: 'Config',      exact: true },
  { href: '/design/components', label: 'Componentes' },
  { href: '/design/vitrine',    label: 'Vitrina' },
  { href: '/design/admin',      label: 'Admin' },
  { href: '/design/superadmin', label: 'Superadmin' },
]

export function DesignNav() {
  const pathname = usePathname()
  const { primaryColor, secondaryColor, storeName, logoUrl } = useDesignStore()

  function isActive(section: typeof SECTIONS[0]) {
    if (section.exact) return pathname === section.href
    return pathname.startsWith(section.href)
  }

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[#1b1b1b] text-white">
      <div className="max-w-screen-2xl mx-auto px-4 h-10 flex items-center gap-3 min-w-0">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <Image src="/logo.jpg" alt="KitDigital" width={18} height={18} className="rounded opacity-90" />
          <span className="text-xs font-semibold opacity-50 tracking-tight hidden sm:block">Design</span>
        </div>

        <div className="h-4 w-px bg-white/10 shrink-0 hidden sm:block" />

        {/* Nav links — scrollable en mobile */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none min-w-0">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className={[
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0',
                isActive(s)
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/8',
              ].join(' ')}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        {/* Store indicator */}
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {logoUrl ? (
            <Image src={logoUrl} alt={storeName} width={16} height={16} className="rounded opacity-70" />
          ) : null}
          <span className="text-2xs text-white/35 hidden md:block truncate max-w-24">{storeName}</span>
          <div className="flex items-center gap-0.5">
            <span
              className="h-3 w-3 rounded-full border border-white/20"
              style={{ background: primaryColor }}
              title={`Primario: ${primaryColor}`}
            />
            <span
              className="h-3 w-3 rounded-full border border-white/20"
              style={{ background: secondaryColor }}
              title={`Secundario: ${secondaryColor}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
