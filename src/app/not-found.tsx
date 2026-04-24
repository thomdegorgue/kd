import Link from 'next/link'

export const metadata = {
  title: 'Página no encontrada',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="text-6xl font-bold text-[#1b1b1b] mb-2">404</div>
          <h1 className="text-2xl font-semibold text-[#1b1b1b] mb-2">Página no encontrada</h1>
          <p className="text-[#6e6e73]">
            Lo sentimos, la página que buscás no existe o fue movida.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center h-12 px-6 rounded-full bg-[#1b1b1b] text-white text-sm font-semibold hover:bg-[#2a2a2a] transition-colors"
          >
            Volver al inicio
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center h-12 px-6 rounded-full border border-[#e0e0e0] text-[#1b1b1b] text-sm font-semibold hover:bg-[#f5f5f5] transition-colors"
          >
            Crear mi catálogo
          </Link>
        </div>
      </div>
    </div>
  )
}
