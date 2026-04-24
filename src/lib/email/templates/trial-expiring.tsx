interface TrialExpiringEmailProps {
  ownerEmail: string
  storeName: string
  daysLeft: number
  billingUrl: string
}

export function TrialExpiringEmail({
  ownerEmail,
  storeName,
  daysLeft,
  billingUrl,
}: TrialExpiringEmailProps) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu período de prueba está por vencer</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #fbbf24;">

    <!-- Alert Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 40px; margin-bottom: 10px;">⏰</div>
      <h1 style="margin: 0; color: #1b1b1b; font-size: 24px; font-weight: 600;">
        Tu período de prueba está por vencer
      </h1>
    </div>

    <!-- Body -->
    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hola <strong>${ownerEmail}</strong>,
    </p>

    <div style="background: #fffbeb; border-left: 4px solid #fbbf24; padding: 16px; margin: 20px 0; border-radius: 6px;">
      <p style="color: #92400e; font-size: 15px; line-height: 1.6; margin: 0;">
        <strong>${storeName}</strong> tiene un período de prueba activo que vence en <strong>${daysLeft} día${daysLeft === 1 ? '' : 's'}</strong>.
      </p>
    </div>

    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Para seguir usando KitDigital sin interrupciones, necesitás activar una suscripción paga antes de que expire el período de prueba.
    </p>

    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Si no activas una suscripción, tu tienda pasará a estado <strong>"pausa"</strong> y no podrás recibir nuevos pedidos.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="${billingUrl}"
         style="display: inline-block; background: #1b1b1b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background 0.2s;">
        Ver planes de suscripción
      </a>
    </div>

    <!-- Info -->
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #1b1b1b; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">¿Qué pasa cuando vence el período de prueba?</h3>
      <ul style="color: #666; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Tu tienda quedará en estado "pausa"</li>
        <li style="margin-bottom: 8px;">Los clientes no podrán ver ni comprar desde tu catálogo público</li>
        <li style="margin-bottom: 8px;">Podés reactivar la suscripción en cualquier momento</li>
        <li>Tus datos y configuración se mantienen intactos</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        KitDigital.ar — Catálogos digitales para emprendedores
      </p>
      <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
        <a href="https://kitdigital.ar" style="color: #0284c7; text-decoration: none;">kitdigital.ar</a>
      </p>
    </div>

  </div>
</body>
</html>
  `
}
