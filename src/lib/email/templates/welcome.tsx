interface WelcomeEmailProps {
  ownerEmail: string
  storeName: string
  adminUrl: string
  catalogUrl: string
}

export function WelcomeEmail({
  ownerEmail,
  storeName,
  adminUrl,
  catalogUrl,
}: WelcomeEmailProps) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a KitDigital</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #e5e7eb;">

    <div style="text-align: center; margin-bottom: 26px;">
      <div style="font-size: 44px; margin-bottom: 10px;">✅</div>
      <h1 style="margin: 0; color: #1b1b1b; font-size: 24px; font-weight: 700;">
        ¡Tu tienda ya está activa!
      </h1>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Bienvenido/a a KitDigital. En minutos podés tener tu catálogo listo para vender.
      </p>
    </div>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
      Hola <strong>${ownerEmail}</strong>,
    </p>

    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 18px 0;">
      Tu tienda <strong>${storeName}</strong> ya está configurada. Acá tenés los accesos:
    </p>

    <div style="background: #f5f5f5; padding: 18px; border-radius: 10px; margin: 18px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #111827;">
        <strong>Panel admin:</strong> <a href="${adminUrl}" style="color: #0284c7; text-decoration: none;">${adminUrl}</a>
      </p>
      <p style="margin: 0; font-size: 14px; color: #111827;">
        <strong>Catálogo público:</strong> <a href="${catalogUrl}" style="color: #0284c7; text-decoration: none;">${catalogUrl}</a>
      </p>
    </div>

    <div style="margin: 22px 0 10px 0;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #111827; font-weight: 600;">
        3 tips para empezar rápido:
      </p>
      <ol style="margin: 0; padding-left: 18px; color: #374151; font-size: 14px; line-height: 1.6;">
        <li style="margin-bottom: 8px;">Subí 5–10 productos con foto y precio.</li>
        <li style="margin-bottom: 8px;">Personalizá tu logo y color para que se vea profesional.</li>
        <li>Compartí el link del catálogo en tu WhatsApp/Instagram.</li>
      </ol>
    </div>

    <div style="text-align: center; margin-top: 26px;">
      <a href="${adminUrl}"
         style="display: inline-block; background: #1b1b1b; color: white; padding: 14px 26px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px;">
        Ir al panel
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
