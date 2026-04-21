'use client'

import { useState } from 'react'
import { Copy, Check, MessageCircle, ShoppingBag, Palette, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { completeOnboarding } from '@/lib/actions/onboarding'

const NEXT_STEPS = [
  { icon: ShoppingBag, label: 'Agregá más productos a tu catálogo' },
  { icon: Palette, label: 'Personalizá los colores y el diseño' },
  { icon: Share2, label: 'Compartí el link con tus clientes' },
]

export function DoneClient({ catalogUrl }: { catalogUrl: string | null }) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    if (!catalogUrl) return
    await navigator.clipboard.writeText(catalogUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsappMessage = catalogUrl
    ? encodeURIComponent(`¡Mirá mi catálogo digital! 🛍️ ${catalogUrl}`)
    : ''

  return (
    <div className="space-y-4">
      {catalogUrl && (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Link de tu catálogo
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono truncate flex-1 text-foreground">{catalogUrl}</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={copyLink}
            >
              {copied ? (
                <><Check className="h-4 w-4 mr-1.5 text-green-600" /> Copiado</>
              ) : (
                <><Copy className="h-4 w-4 mr-1.5" /> Copiar link</>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              render={<a href={`https://wa.me/?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" />}
            >
              <MessageCircle className="h-4 w-4 mr-1.5 text-green-600" />
              Compartir
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Próximos pasos
        </p>
        <ul className="space-y-2">
          {NEXT_STEPS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <form action={completeOnboarding}>
        <Button type="submit" className="w-full">
          Ir a mi panel →
        </Button>
      </form>
    </div>
  )
}
