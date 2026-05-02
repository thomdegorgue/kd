'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, MessageCircle, LayoutDashboard, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DemoOverlay({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kitdigital.ar'
  const demoUrl = `${appUrl}/demo/${slug}`
  const waText = encodeURIComponent(`¡Mirá mi nueva tienda online! ${demoUrl}`)

  async function handleCopy() {
    await navigator.clipboard.writeText(demoUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 pb-safe">
      <div className="max-w-lg mx-auto bg-background border border-border rounded-2xl shadow-xl p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-snug">¡Tu tienda demo está lista!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compartila para mostrarla. Para editar y recibir pedidos reales, activá tu plan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleCopy}>
            {copied
              ? <><Check className="h-3.5 w-3.5 mr-1 text-green-600 shrink-0" /> Copiado</>
              : <><Copy className="h-3.5 w-3.5 mr-1 shrink-0" /> Copiar link</>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            render={<a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer" />}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1 text-green-600 shrink-0" />
            WhatsApp
          </Button>
          <Button size="sm" className="text-xs" render={<Link href="/admin" />}>
            <LayoutDashboard className="h-3.5 w-3.5 mr-1 shrink-0" />
            Mi panel
          </Button>
        </div>
      </div>
    </div>
  )
}
