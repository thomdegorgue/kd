import Image from 'next/image'
import { MessageCircle, MapPin, Clock } from 'lucide-react'

interface PublicLayoutProps {
  children: React.ReactNode
  store: {
    name: string
    logo_url: string | null
    whatsapp: string | null
    config?: {
      primary_color?: string
      city?: string | null
      hours?: string | null
      social?: {
        instagram?: string
        facebook?: string
        tiktok?: string
      }
    }
  }
}

export function PublicLayout({ children, store }: PublicLayoutProps) {
  const brandColor = store.config?.primary_color

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      style={brandColor ? { '--brand-color': brandColor } as React.CSSProperties : undefined}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur"
        style={brandColor ? { borderBottomColor: `${brandColor}22` } : undefined}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: brandColor ?? 'hsl(var(--primary))' }}
                >
                  {store.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-sm truncate">{store.name}</h1>
                {(store.config?.city || store.config?.hours) && (
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {store.config?.city && (
                      <div className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>{store.config.city}</span>
                      </div>
                    )}
                    {store.config?.hours && (
                      <div className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{store.config.hours}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {store.whatsapp && (
              <a
                href={`https://wa.me/${store.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center space-y-2">
          {store.config?.social && (
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              {store.config.social.instagram && (
                <a
                  href={`https://instagram.com/${store.config.social.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Instagram
                </a>
              )}
              {store.config.social.facebook && (
                <a
                  href={store.config.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  Facebook
                </a>
              )}
              {store.config.social.tiktok && (
                <a
                  href={`https://tiktok.com/@${store.config.social.tiktok}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  TikTok
                </a>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Potenciado por{' '}
            <a
              href="https://kitdigital.ar"
              className="hover:text-foreground transition-colors"
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
