'use client'

import Image from 'next/image'
import { Camera, Globe, MessageCircle } from 'lucide-react'
import { useStore } from '@/components/public/store-context'

interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const store = useStore()
  const brand = store.config?.primary_color ?? '#0f0f0f'
  const showSocial = !!store.modules.social && !!store.config?.social
  const social = store.config?.social

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f6f6] text-foreground">
      <main className="flex-1">{children}</main>

      <footer className="bg-background border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={24}
                  height={24}
                  className="rounded object-cover h-6 w-6"
                />
              ) : (
                <div
                  className="h-6 w-6 rounded flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: brand }}
                >
                  {store.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold">{store.name}</span>
            </div>

            {showSocial && (
              <div className="flex items-center gap-2">
                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="h-7 w-7 rounded-full flex items-center justify-center border border-border hover:border-foreground/30 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {social?.instagram && (
                  <a
                    href={`https://instagram.com/${social.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="h-7 w-7 rounded-full flex items-center justify-center border border-border hover:border-foreground/30 transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
                {social?.facebook && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="h-7 w-7 rounded-full flex items-center justify-center border border-border hover:border-foreground/30 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {store.name} · Tienda creada con{' '}
            <a
              href="https://kitdigital.ar"
              className="font-medium text-foreground hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              KitDigital.ar
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
