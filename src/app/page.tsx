import Image from 'next/image'
import Link from 'next/link'
import { LandingNav } from '@/components/landing/nav'
import { PricingCalculator } from '@/components/landing/pricing-calculator'

// Slots disponibles para el lanzamiento (drop limitado)
const SLOTS_AVAILABLE = 10

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* ─── HERO ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen bg-[#1b1b1b] flex flex-col items-center justify-center text-white overflow-hidden px-6">

        {/* Subtle grid overlay */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
          }}
        />

        {/* Radial glow */}
        <div
          aria-hidden
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center gap-10">

          {/* Launch badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium tracking-widest uppercase text-white/60">
              Lanzamiento limitado
            </span>
          </div>

          {/* Main heading */}
          <div className="space-y-3">
            <h1 className="text-[clamp(3rem,10vw,7rem)] font-bold tracking-tighter leading-[0.92] text-balance">
              Tu catálogo{' '}
              <span className="text-white/25">digital.</span>
            </h1>
            <p className="text-base md:text-lg text-white/45 max-w-md mx-auto leading-relaxed">
              Publicá tus productos. Recibí pedidos por WhatsApp.
              Gestioná todo desde un panel simple.
            </p>
          </div>

          {/* Price callout */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[clamp(2rem,6vw,4rem)] font-bold tracking-tight tabular-nums">
                $20.000
              </span>
              <span className="text-white/30 text-xl md:text-2xl font-normal">/mes</span>
            </div>
            <p className="text-xs text-white/35 tracking-wide">
              por cada 100 productos · sin costo de setup · sin permanencia
            </p>
          </div>

          {/* Scarcity counter */}
          <div className="border border-white/10 rounded-2xl px-10 py-6 bg-white/[0.04] backdrop-blur-sm">
            <div className="flex items-baseline gap-4 justify-center">
              <span className="text-[4.5rem] leading-none font-bold tabular-nums font-mono">
                {SLOTS_AVAILABLE}
              </span>
              <div className="text-left">
                <p className="text-base font-semibold text-white leading-snug">catálogos</p>
                <p className="text-base text-white/35 leading-snug">disponibles</p>
              </div>
            </div>
            <p className="text-xs text-white/25 text-center mt-3 tracking-widest uppercase">
              en este lanzamiento
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-sm sm:max-w-none">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto h-12 px-8 rounded-full bg-white text-[#1b1b1b] text-sm font-semibold hover:bg-white/92 transition-all duration-200 inline-flex items-center justify-center shadow-lg shadow-black/20"
            >
              Crear mi catálogo gratis →
            </Link>
            <a
              href="#modulos"
              className="w-full sm:w-auto h-12 px-8 rounded-full border border-white/15 text-white/55 text-sm font-medium hover:border-white/30 hover:text-white/80 transition-all duration-200 inline-flex items-center justify-center"
            >
              Ver módulos ↓
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 select-none pointer-events-none">
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-white/15" />
          <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        </div>
      </section>

      {/* ─── MÓDULOS + PRICING ───────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 pt-28 pb-8 text-center">
          <h2 className="text-[clamp(2rem,6vw,4rem)] font-bold tracking-tighter text-[#1b1b1b] text-balance leading-tight">
            Pagá solo lo que
            <br />
            tu negocio necesita.
          </h2>
          <p className="text-base md:text-lg text-[#6e6e73] mt-4 max-w-md mx-auto leading-relaxed">
            Activá los módulos que uses. Desactivá los que no.
            Sin planes fijos, sin sorpresas.
          </p>
        </div>
        <PricingCalculator />
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-[#e0e0e0] py-10 bg-white">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.jpg"
              alt="KitDigital"
              width={22}
              height={22}
              className="rounded-md"
            />
            <span className="text-sm font-semibold text-[#1b1b1b]">KitDigital.ar</span>
          </div>
          <p className="text-xs text-[#6e6e73]">
            © 2025 KitDigital.ar · Catálogos digitales para emprendedores argentinos
          </p>
        </div>
      </footer>
    </div>
  )
}
