interface NewSaleEmailProps {
  ownerEmail: string
  storeName: string
  adminOrderUrl: string
  orderId: string
  totalARS: string
  paymentMethodLabel: string
  customerName?: string | null
  customerPhone?: string | null
}

export function NewSaleEmail({
  ownerEmail,
  storeName,
  adminOrderUrl,
  orderId,
  totalARS,
  paymentMethodLabel,
  customerName,
  customerPhone,
}: NewSaleEmailProps) {
  const customerLine =
    customerName || customerPhone
      ? `<p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
           <strong>Cliente:</strong> ${[customerName, customerPhone].filter(Boolean).join(' · ')}
         </p>`
      : ''

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva venta</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #e5e7eb;">

    <div style="text-align: center; margin-bottom: 22px;">
      <div style="font-size: 44px; margin-bottom: 8px;">🧾</div>
      <h1 style="margin: 0; color: #1b1b1b; font-size: 22px; font-weight: 700;">
        Nueva venta en ${storeName}
      </h1>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Registrada desde el POS.
      </p>
    </div>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hola <strong>${ownerEmail}</strong>,
    </p>

    <div style="background: #f5f5f5; padding: 18px; border-radius: 10px; margin: 18px 0;">
      <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; line-height: 1.6;">
        <strong>Pedido:</strong> #${orderId.slice(0, 8)}
      </p>
      <p style="margin: 0 0 8px 0; color: #111827; font-size: 14px; line-height: 1.6;">
        <strong>Total:</strong> ${totalARS}
      </p>
      <p style="margin: 0; color: #111827; font-size: 14px; line-height: 1.6;">
        <strong>Método:</strong> ${paymentMethodLabel}
      </p>
      ${customerLine}
    </div>

    <div style="text-align: center; margin-top: 22px;">
      <a href="${adminOrderUrl}"
         style="display: inline-block; background: #1b1b1b; color: white; padding: 12px 22px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">
        Ver pedido
      </a>
    </div>

    <div style="text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 18px;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        KitDigital.ar — Catálogos digitales para emprendedores
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 6px 0 0 0;">
        <a href="https://kitdigital.ar" style="color: #0284c7; text-decoration: none;">kitdigital.ar</a>
      </p>
    </div>

  </div>
</body>
</html>
  `
}
