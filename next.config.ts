import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  async redirects() {
    return []
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // Scripts: self + Next.js inline + MP SDK
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com",
      // Estilos: inline necesarios para Tailwind/shadcn
      "style-src 'self' 'unsafe-inline'",
      // Imágenes: self + Cloudinary + data URIs (previews)
      "img-src 'self' res.cloudinary.com data: blob:",
      // Fuentes: self (no usa Google Fonts externas)
      "font-src 'self'",
      // Conexiones: Supabase, MP API, Sentry, Upstash
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com https://o*.ingest.sentry.io https://*.upstash.io",
      // Frames: MP checkout
      "frame-src https://www.mercadopago.com https://www.mercadopago.com.ar",
      // Medios y objetos
      "media-src 'self'",
      "object-src 'none'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ]
  },
};

const sentryConfig = {
  org: process.env.SENTRY_ORG ?? 'kitdigital',
  project: process.env.SENTRY_PROJECT ?? 'kitdigital',
  // Solo subir source maps si SENTRY_AUTH_TOKEN está configurado
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
}

export default withSentryConfig(withBundleAnalyzer(nextConfig), sentryConfig);
