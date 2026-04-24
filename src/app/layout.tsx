import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

// ── Inter — fuente principal (Google Fonts) ───────────────────
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

// ── Geist Mono — fuente de código ────────────────────────────
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'KitDigital.ar',
    template: '%s — KitDigital.ar',
  },
  description: 'Catálogos digitales con carrito WhatsApp para emprendedores argentinos.',
  icons: {
    icon: '/logo.jpg',
  },
  openGraph: {
    title: 'KitDigital.ar — Tu catálogo digital con WhatsApp',
    description: 'Publicá tus productos. Recibí pedidos por WhatsApp. Gestioná todo desde un panel simple.',
    url: 'https://kitdigital.ar',
    type: 'website',
    images: [
      {
        url: 'https://kitdigital.ar/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'KitDigital.ar — Catálogos digitales para emprendedores',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KitDigital.ar',
    description: 'Tu catálogo digital con carrito WhatsApp',
    images: ['https://kitdigital.ar/og-image.jpg'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
