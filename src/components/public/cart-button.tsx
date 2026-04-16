'use client'

import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartItemCount } from '@/lib/stores/cart-store'

interface CartButtonProps {
  onClick: () => void
}

export function CartButton({ onClick }: CartButtonProps) {
  const itemCount = useCartItemCount()

  if (itemCount === 0) return null

  return (
    <Button
      onClick={onClick}
      size="lg"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg"
    >
      <ShoppingCart className="h-5 w-5" />
      <Badge
        variant="destructive"
        className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs"
      >
        {itemCount}
      </Badge>
    </Button>
  )
}
