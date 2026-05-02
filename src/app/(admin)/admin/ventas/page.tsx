'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  CheckCircle2,
  MessageCircle,
  History,
  X,
  ChevronDown,
  ChevronUp,
  Truck,
  ChevronsUpDown,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useProducts } from '@/lib/hooks/use-products'
import { useCreateSale, useDailySalesSummary, useSalesHistory } from '@/lib/hooks/use-sales'
import { useCustomers, useCreateCustomer } from '@/lib/hooks/use-customers'
import { useAdminContext } from '@/lib/hooks/use-admin-context'
import { useCurrency } from '@/lib/hooks/use-currency'
import { cn } from '@/lib/utils'
import type { SalePaymentMethod, CreateSaleInput } from '@/lib/validations/sale'

// ── Types ────────────────────────────────────────────────────

type CartItem = {
  product_id: string
  name: string
  price: number
  image_url: string | null
  stock: number | null
  quantity: number
}

type SaleResult = {
  id: string
  total: number
  subtotal: number
  discount_amount: number
  payment_method: SalePaymentMethod
  payment_amount: number
}

const PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  mp_link: 'Link Mercado Pago',
  savings: 'Cuenta de ahorro',
  other: 'Otro',
}

// ── Hooks ────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

// ── ProductGrid ──────────────────────────────────────────────

function ProductGrid({
  search,
  onAdd,
  cartItems,
  stockModuleActive,
}: {
  search: string
  onAdd: (item: CartItem) => void
  cartItems: CartItem[]
  stockModuleActive: boolean
}) {
  const { data, isLoading } = useProducts({
    search: search || undefined,
    is_active: true,
    pageSize: 30,
  })
  const { formatPrice } = useCurrency()

  const cartMap = new Map(cartItems.map((c) => [c.product_id, c.quantity]))

  const products = (data?.items ?? []) as {
    id: string
    name: string
    price: number
    image_url: string | null
    stock: number | null
  }[]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {search ? 'Sin resultados para esa búsqueda.' : 'No hay productos activos.'}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {products.map((p) => {
        const outOfStock = stockModuleActive && p.stock !== null && p.stock <= 0
        const inCart = cartMap.get(p.id) ?? 0

        return (
          <button
            key={p.id}
            onClick={() =>
              !outOfStock &&
              onAdd({
                product_id: p.id,
                name: p.name,
                price: p.price,
                image_url: p.image_url,
                stock: p.stock,
                quantity: 1,
              })
            }
            disabled={outOfStock}
            className={[
              'relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
              outOfStock
                ? 'opacity-50 cursor-not-allowed bg-muted'
                : 'hover:bg-accent hover:border-primary/30 cursor-pointer',
              inCart > 0 ? 'border-primary/50 bg-primary/5' : '',
            ].join(' ')}
          >
            {p.image_url && (
              <div className="relative w-10 h-10 rounded overflow-hidden shrink-0 bg-muted mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-xs font-medium leading-tight line-clamp-2">{p.name}</p>
            <p className="text-xs font-semibold text-primary">{formatPrice(p.price)}</p>
            {outOfStock && (
              <span className="absolute top-1 right-1 text-[10px] bg-destructive text-destructive-foreground rounded px-1">
                Sin stock
              </span>
            )}
            {inCart > 0 && (
              <span className="absolute top-1 right-1 text-[10px] bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {inCart}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── CartList ─────────────────────────────────────────────────

function CartList({
  items,
  onChangeQty,
  onRemove,
  formatPrice,
}: {
  items: CartItem[]
  onChangeQty: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  formatPrice: (v: number) => string
}) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
        Buscá productos y hacé click para agregar al carrito.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.product_id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{formatPrice(item.price)} c/u</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChangeQty(item.product_id, item.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const maxQty = item.stock !== null ? item.stock : 999
                if (item.quantity < maxQty) onChangeQty(item.product_id, item.quantity + 1)
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm font-semibold tabular-nums w-20 text-right shrink-0">
            {formatPrice(item.price * item.quantity)}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onRemove(item.product_id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// ── SuccessTicket ────────────────────────────────────────────

function SuccessTicket({
  sale,
  onNew,
  onClose,
}: {
  sale: SaleResult
  onNew: () => void
  onClose: () => void
}) {
  const { formatPrice } = useCurrency()
  const orderId = (sale as { id?: string }).id?.slice(0, 8).toUpperCase() ?? '—'

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-9 w-9 text-green-600" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">¡Venta registrada!</p>
        <p className="text-sm text-muted-foreground">Pedido #{orderId}</p>
      </div>
      <div className="w-full rounded-lg border divide-y text-sm">
        <div className="flex justify-between px-4 py-2">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(sale.subtotal)}</span>
        </div>
        {sale.discount_amount > 0 && (
          <div className="flex justify-between px-4 py-2 text-green-700">
            <span>Descuento</span>
            <span>-{formatPrice(sale.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between px-4 py-2 font-semibold">
          <span>Total</span>
          <span>{formatPrice(sale.total)}</span>
        </div>
        <div className="flex justify-between px-4 py-2">
          <span className="text-muted-foreground">Método de pago</span>
          <span>{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</span>
        </div>
      </div>
      <div className="flex gap-2 w-full">
        <Button variant="outline" className="flex-1" onClick={onNew}>
          Nueva venta
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const msg = encodeURIComponent(
              `Comprobante de venta #${orderId}\nTotal: ${formatPrice(sale.total)}\nMétodo: ${PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}`,
            )
            window.open(`https://wa.me/?text=${msg}`, '_blank')
          }}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  )
}

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

// ── HistoryPanel ─────────────────────────────────────────────

function HistoryPanel() {
  const { formatPrice } = useCurrency()
  const todayIso = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState<string>(todayIso)

  const { data: summary, isLoading: sumLoading } = useDailySalesSummary(selectedDate)
  const { data: history, isLoading: histLoading } = useSalesHistory({
    date_from: `${selectedDate}T00:00:00.000Z`,
    date_to: `${selectedDate}T23:59:59.999Z`,
    pageSize: 50,
  })

  const isToday = selectedDate === todayIso

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm shrink-0">
          {isToday ? 'Hoy' : formatDateLabel(selectedDate)}
        </h3>
        <Input
          type="date"
          value={selectedDate}
          max={todayIso}
          onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value) }}
          className="h-8 text-xs w-auto"
        />
      </div>

      {/* Daily summary */}
      {sumLoading ? (
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total del día</p>
              <p className="text-lg font-bold">{formatPrice(summary?.total_sales ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className="text-lg font-bold">{summary?.total_orders ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* By method */}
      {!sumLoading && summary && Object.keys(summary.by_method).length > 0 && (
        <div className="rounded-lg border divide-y text-sm">
          {Object.entries(summary.by_method).map(([method, total]) => (
            <div key={method} className="flex justify-between items-center px-3 py-2">
              <span className="text-muted-foreground">{PAYMENT_LABELS[method as SalePaymentMethod] ?? method}</span>
              <span className="font-medium">{formatPrice(total)}</span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Sales list */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ventas</p>
        {histLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : (history?.items ?? []).length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Sin ventas en esta fecha.</p>
        ) : (
          <div className="space-y-1">
            {(history?.items ?? []).map((sale) => {
              const s = sale as {
                id: string
                total: number
                metadata: Record<string, unknown>
                customer: { name: string } | null
                created_at: string
              }
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.customer?.name ?? 'Sin cliente'}</p>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_LABELS[(s.metadata?.payment_method as SalePaymentMethod) ?? 'other'] ?? '—'} ·{' '}
                      {formatTime(s.created_at)}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums shrink-0">{formatPrice(s.total)}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function VentasPage() {
  const { modules } = useAdminContext()
  const { formatPrice } = useCurrency()
  const stockModuleActive = modules?.stock === true
  const savingsModuleActive = modules?.savings_account === true

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountValue, setDiscountValue] = useState(0)

  // Customer
  const [isNewCustomer, setIsNewCustomer] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [showCustomer, setShowCustomer] = useState(false)
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [selectedSavingsAccountId, setSelectedSavingsAccountId] = useState<string | null>(null)

  // Shipping
  const [showShipping, setShowShipping] = useState(false)
  const [shippingAddress, setShippingAddress] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [shippingNotes, setShippingNotes] = useState('')

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('cash')
  const [notes, setNotes] = useState('')

  // UI
  const [successSale, setSuccessSale] = useState<SaleResult | null>(null)

  const debouncedSearch = useDebounce(searchQuery, 300)
  const debouncedCustomerSearch = useDebounce(customerSearchQuery, 300)
  const { mutate: createSale, isPending } = useCreateSale()
  const { mutateAsync: createCustomerAsync, isPending: isCreatingCustomer } = useCreateCustomer()
  const { data: customersData } = useCustomers({ search: debouncedCustomerSearch, pageSize: 5 })

  const customers = useMemo(() => {
    return ((customersData?.items ?? []) as { id: string; name: string; phone: string | null; savings_accounts?: { id: string; name: string }[] }[])
  }, [customersData])

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const discountAmount =
    discountType === 'percent'
      ? Math.round((subtotal * discountValue) / 100)
      : Math.round(discountValue * 100)
  const total = Math.max(0, subtotal - discountAmount)

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product_id === item.product_id)
      if (existing) {
        const maxQty = existing.stock !== null ? existing.stock : 999
        if (existing.quantity >= maxQty) return prev
        return prev.map((c) =>
          c.product_id === item.product_id ? { ...c, quantity: c.quantity + 1 } : c,
        )
      }
      return [...prev, item]
    })
  }, [])

  const changeQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.product_id !== productId))
    } else {
      setCart((prev) =>
        prev.map((c) => (c.product_id === productId ? { ...c, quantity: qty } : c)),
      )
    }
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.product_id !== productId))
  }, [])

  const resetSale = useCallback(() => {
    setCart([])
    setDiscountValue(0)
    setIsNewCustomer(true)
    setCustomerName('')
    setCustomerPhone('')
    setSelectedCustomerId(null)
    setSelectedSavingsAccountId(null)
    setNotes('')
    setPaymentMethod('cash')
    setShowCustomer(false)
    setShowShipping(false)
    setShippingAddress('')
    setDeliveryDate('')
    setShippingNotes('')
    setCustomerSearchQuery('')
  }, [])

  const handleConfirm = () => {
    if (cart.length === 0) return

    // Validación: si es savings, debe haber cliente
    if (paymentMethod === 'savings' && !selectedCustomerId && !customerName.trim()) {
      toast.error('Debes seleccionar o crear un cliente para usar cuenta de ahorro')
      return
    }

    const shippingPart = shippingAddress.trim()
      ? `Envío: ${shippingAddress}${deliveryDate ? ` · Entrega: ${deliveryDate}` : ''}${shippingNotes ? ` · ${shippingNotes}` : ''}`
      : ''

    const combinedNotes = [notes.trim(), shippingPart].filter(Boolean).join(' | ')

    const input: CreateSaleInput = {
      items: cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_sale: item.price,
        name_snapshot: item.name,
      })),
      payment_method: paymentMethod,
      payment_amount: total,
      discount_amount: discountAmount,
      ...(customerName.trim() ? { customer_name: customerName.trim() } : {}),
      ...(customerPhone.trim() ? { customer_phone: customerPhone.trim() } : {}),
      ...(selectedCustomerId ? { customer_id: selectedCustomerId } : {}),
      ...(paymentMethod === 'savings' && selectedSavingsAccountId ? { savings_account_id: selectedSavingsAccountId } : {}),
      ...(combinedNotes ? { notes: combinedNotes } : {}),
    }

    createSale(input, {
      onSuccess: (data) => {
        const result = data as unknown as SaleResult
        setSuccessSale({ ...result, subtotal, discount_amount: discountAmount })
      },
    })
  }

  // ── POS Panel ──────────────────────────────────────────────

  const CajaPanel = (
    <div className="flex flex-col gap-4 h-full">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="pl-9"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Products */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <ProductGrid
          search={debouncedSearch}
          onAdd={addToCart}
          cartItems={cart}
          stockModuleActive={stockModuleActive}
        />
      </div>

      {/* Cart */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            Carrito {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
          </p>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={resetSale}>
              Limpiar
            </Button>
          )}
        </div>
        <CartList
          items={cart}
          onChangeQty={changeQty}
          onRemove={removeFromCart}
          formatPrice={formatPrice}
        />

        {/* Discount */}
        {cart.length > 0 && (
          <div className="flex gap-2 items-center">
            <Select value={discountType} onValueChange={(v) => { if (v) setDiscountType(v as 'amount' | 'percent') }}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Descuento $</SelectItem>
                <SelectItem value="percent">Descuento %</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              placeholder={discountType === 'percent' ? '0%' : '0'}
              className="h-8 text-xs flex-1"
            />
          </div>
        )}
      </div>
    </div>
  )

  const PaymentPanel = (
    <div className="flex flex-col gap-4 h-full">
      {/* Totals */}
      <div className="rounded-lg border divide-y text-sm">
        <div className="flex justify-between px-4 py-2 text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between px-4 py-2 text-green-700">
            <span>Descuento</span>
            <span>-{formatPrice(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between px-4 py-2 font-bold text-base">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* Customer (collapsible) */}
      <div className="rounded-lg border">
        <button
          onClick={() => setShowCustomer((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          Cliente {customerName ? <Badge variant="outline" className="text-xs font-normal">{customerName}</Badge> : <span className="text-xs text-muted-foreground font-normal">Opcional</span>}
          {showCustomer ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showCustomer && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            {/* Toggle: Nuevo vs Existente */}
            <RadioGroup value={isNewCustomer ? 'new' : 'existing'} onValueChange={(v) => {
              setIsNewCustomer(v === 'new')
              setSelectedCustomerId(null)
              setCustomerName('')
              setCustomerPhone('')
              setCustomerSearchQuery('')
            }}>
              <div className="flex gap-3">
                <Label htmlFor="customer-new" className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm flex-1 transition-colors" style={{
                  backgroundColor: isNewCustomer ? 'var(--primary-fg)' : 'transparent',
                  borderColor: isNewCustomer ? 'var(--primary)' : 'var(--border)',
                }}>
                  <RadioGroupItem id="customer-new" value="new" className="sr-only" />
                  Nuevo cliente
                </Label>
                <Label htmlFor="customer-existing" className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm flex-1 transition-colors" style={{
                  backgroundColor: !isNewCustomer ? 'var(--primary-fg)' : 'transparent',
                  borderColor: !isNewCustomer ? 'var(--primary)' : 'var(--border)',
                }}>
                  <RadioGroupItem id="customer-existing" value="existing" className="sr-only" />
                  Cliente existente
                </Label>
              </div>
            </RadioGroup>

            {/* Nuevo cliente: nombre + teléfono libres */}
            {isNewCustomer && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre</Label>
                  <Input
                    placeholder="Nombre del cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Input
                  placeholder="Teléfono (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-8 text-sm"
                />
              </>
            )}

            {/* Cliente existente: popover para buscar */}
            {!isNewCustomer && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre</Label>
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger>
                      <button
                        className="w-full h-8 px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent text-foreground flex items-center justify-between"
                      >
                        {customerName || 'Buscar cliente...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0" align="start">
                      <Command>
                        <div className="p-2 border-b">
                          <Input
                            placeholder="Buscar cliente..."
                            value={customerSearchQuery}
                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <CommandEmpty>
                          {customerSearchQuery.trim()
                            ? 'Sin coincidencias'
                            : 'Escribí para buscar clientes'}
                        </CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={customer.name}
                              onSelect={() => {
                                setCustomerName(customer.name)
                                setCustomerPhone(customer.phone || '')
                                setSelectedCustomerId(customer.id)
                                // Auto-select linked savings account
                                const linked = customer.savings_accounts?.[0]
                                if (linked) {
                                  setSelectedSavingsAccountId(linked.id)
                                }
                                setCustomerSearchOpen(false)
                                setCustomerSearchQuery('')
                              }}
                              className="text-xs h-7"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-3 w-3',
                                  selectedCustomerId === customer.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{customer.name}</p>
                                {customer.phone && (
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {customer.phone}
                                  </p>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  placeholder="Teléfono (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-8 text-sm"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Shipping (collapsible) */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowShipping((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            Envío
          </span>
          <span className="flex items-center gap-2">
            {shippingAddress && (
              <span className="text-xs text-muted-foreground font-normal truncate max-w-[140px]">
                {shippingAddress}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-normal">Opcional</span>
            {showShipping ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        </button>
        {showShipping && (
          <div className="px-4 pb-4 space-y-2 border-t pt-3">
            <Input
              placeholder="Dirección de entrega"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fecha de entrega (opcional)</label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <Input
              placeholder="Notas de envío (opcional)"
              value={shippingNotes}
              onChange={(e) => setShippingNotes(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}
      </div>

      {/* Payment method */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Método de cobro</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(v) => setPaymentMethod(v as SalePaymentMethod)}
          className="grid grid-cols-2 gap-2"
        >
          {(['cash', 'transfer', 'card', 'mp_link'] as const).map((method) => (
            <Label
              key={method}
              htmlFor={`method-${method}`}
              className={[
                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                paymentMethod === method ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted',
              ].join(' ')}
            >
              <RadioGroupItem id={`method-${method}`} value={method} className="sr-only" />
              {PAYMENT_LABELS[method]}
            </Label>
          ))}
          {savingsModuleActive && (
            <Label
              htmlFor="method-savings"
              className={[
                'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm col-span-2 transition-colors',
                paymentMethod === 'savings' ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted',
              ].join(' ')}
            >
              <RadioGroupItem id="method-savings" value="savings" className="sr-only" />
              {PAYMENT_LABELS.savings}
            </Label>
          )}
        </RadioGroup>
      </div>

      {/* Notes */}
      <Textarea
        placeholder="Nota (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="text-sm resize-none"
        rows={2}
      />

      {/* Confirm */}
      <Button
        size="lg"
        className="w-full font-semibold"
        disabled={cart.length === 0 || isPending}
        onClick={handleConfirm}
      >
        {isPending ? 'Procesando...' : `Confirmar venta ${total > 0 ? `· ${formatPrice(total)}` : ''}`}
      </Button>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b shrink-0">
        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold leading-none">Ventas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Registrá ventas en el mostrador</p>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Caja (60%) */}
        <div className="flex-[3] border-r overflow-y-auto p-6">
          {CajaPanel}
        </div>

        {/* Center: Payment (30%) */}
        <div className="flex-[2] border-r overflow-y-auto p-6">
          {PaymentPanel}
        </div>

        {/* Right: History (remaining) */}
        <div className="flex-[2] overflow-y-auto p-6">
          <HistoryPanel />
        </div>
      </div>

      {/* Mobile layout: tabs */}
      <div className="lg:hidden flex-1 overflow-hidden">
        <Tabs defaultValue="caja" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-3 grid grid-cols-2 shrink-0">
            <TabsTrigger value="caja">
              <ShoppingBag className="h-4 w-4 mr-1.5" />
              Caja
            </TabsTrigger>
            <TabsTrigger value="historial">
              <History className="h-4 w-4 mr-1.5" />
              Historial
            </TabsTrigger>
          </TabsList>
          <TabsContent value="caja" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
            {CajaPanel}
            <Separator />
            {PaymentPanel}
          </TabsContent>
          <TabsContent value="historial" className="flex-1 overflow-y-auto p-4 mt-0">
            <HistoryPanel />
          </TabsContent>
        </Tabs>
      </div>

      {/* Success dialog */}
      <Dialog open={!!successSale} onOpenChange={(open) => { if (!open) setSuccessSale(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Venta registrada</DialogTitle>
          </DialogHeader>
          {successSale && (
            <SuccessTicket
              sale={successSale}
              onNew={() => { resetSale(); setSuccessSale(null) }}
              onClose={() => setSuccessSale(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
