interface AnnualExpiredEmailProps {
  ownerEmail: string
  storeName: string
  billingUrl: string
}

export function AnnualExpiredEmail({
  ownerEmail,
  storeName,
  billingUrl,
}: AnnualExpiredEmailProps) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu plan anual venció</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #fecaca;">

    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 40px; margin-bottom: 10px;">📆</div>
      <h1 style="margin: 0; color: #1b1b1b; font-size: 24px; font-weight: 600;">
        Tu plan anual venció
      </h1>
    </div>

    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hola <strong>${ownerEmail}</strong>,
    </p>

    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 6px;">
      <p style="color: #7f1d1d; font-size: 15px; line-height: 1.6; margin: 0;">
        El plan anual de <strong>${storeName}</strong> venció y tu tienda pasó a estado <strong>vencido</strong>.
      </p>
    </div>

    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Podés renovar desde el panel para volver a activar todos los módulos incluidos.
    </p>

    <div style="text-align: center; margin-bottom: 10px;">
      <a href="${billingUrl}"
         style="display: inline-block; background: #1b1b1b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Renovar plan
      </a>
    </div>

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
