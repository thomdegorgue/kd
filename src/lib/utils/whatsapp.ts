interface CartItem {
  name: string
  quantity: number
  unit_price: number
  variant_label?: string
}

interface StoreConfig {
  name: string
  whatsapp: string
  currency?: string
}

interface ShippingMethod {
  name: string
  price: number
}

interface BuildMessageInput {
  items: CartItem[]
  storeConfig: StoreConfig
  shippingMethod?: ShippingMethod
  customerName?: string
  deliveryType?: 'pickup' | 'shipping'
  address?: string
  paymentMethod?: string
  customerNotes?: string
  trackingUrl?: string
}

interface BuildMessageOutput {
  messageText: string
  whatsappUrl: string
}

function formatMoney(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('es-AR')}`
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Genera mensaje formateado para WhatsApp y la URL wa.me.
 * 100% client-side — no toca backend.
 */
export function buildWhatsAppMessage({
  items,
  storeConfig,
  shippingMethod,
  customerName,
  deliveryType,
  address,
  paymentMethod,
  customerNotes,
  trackingUrl,
}: BuildMessageInput): BuildMessageOutput {
  const lines: string[] = []

  lines.push(`🛒 *Pedido desde ${storeConfig.name}*`)
  lines.push('')

  // Productos
  lines.push('📦 Productos:')
  let subtotal = 0
  for (const item of items) {
    const itemTotal = item.quantity * item.unit_price
    subtotal += itemTotal
    const variant = item.variant_label ? ` (${item.variant_label})` : ''
    lines.push(`• ${item.quantity}x ${item.name}${variant} — ${formatMoney(itemTotal)}`)
  }
  lines.push('')

  // Envío
  let total = subtotal
  if (shippingMethod) {
    total += shippingMethod.price
    lines.push(`🚚 Envío: ${shippingMethod.name} — ${formatMoney(shippingMethod.price)}`)
    lines.push('')
  }

  // Total
  lines.push(`💰 *Total: ${formatMoney(total)}*`)
  lines.push('')

  // Cliente
  if (customerName) {
    lines.push(`👤 Nombre: ${customerName}`)
  }
  if (deliveryType === 'pickup') {
    lines.push('📍 Entrega: Retiro en local')
  } else if (deliveryType === 'shipping') {
    lines.push('🚚 Entrega: Envío a domicilio')
    if (address) lines.push(`📍 Dirección: ${address}`)
  }
  if (paymentMethod) {
    lines.push(`💳 Pago: ${paymentMethod}`)
  }
  if (customerNotes) {
    lines.push(`📝 Nota: ${customerNotes}`)
  }
  if (customerName || deliveryType || paymentMethod || customerNotes) {
    lines.push('')
  }

  // Tracking
  if (trackingUrl) {
    lines.push(`📦 Seguimiento: ${trackingUrl}`)
    lines.push('')
  }

  lines.push('_Enviado desde KitDigital.ar_')

  const messageText = lines.join('\n')
  const phone = cleanPhone(storeConfig.whatsapp)
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`

  return { messageText, whatsappUrl }
}
