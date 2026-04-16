'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildWhatsAppMessage } from '@/lib/utils/whatsapp'

interface CartItem {
  name: string
  quantity: number
  unit_price: number
  variant_label?: string
}

interface WhatsAppCheckoutButtonProps {
  items: CartItem[]
  storeName: string
  storeWhatsapp: string
  shippingMethod?: { name: string; price: number }
  customerName?: string
  customerNotes?: string
  disabled?: boolean
  className?: string
}

export function WhatsAppCheckoutButton({
  items,
  storeName,
  storeWhatsapp,
  shippingMethod,
  customerName,
  customerNotes,
  disabled,
  className,
}: WhatsAppCheckoutButtonProps) {
  const handleClick = () => {
    const { whatsappUrl } = buildWhatsAppMessage({
      items,
      storeConfig: { name: storeName, whatsapp: storeWhatsapp },
      shippingMethod,
      customerName,
      customerNotes,
    })
    window.open(whatsappUrl, '_blank')
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || items.length === 0}
      className={className}
      size="lg"
    >
      <MessageCircle className="mr-2 h-5 w-5" />
      Enviar pedido por WhatsApp
    </Button>
  )
}
