interface StoreArchivedEmailProps {
  ownerEmail: string
  storeName: string
  restoreUrl: string
}

export function StoreArchivedEmail({
  ownerEmail,
  storeName,
  restoreUrl,
}: StoreArchivedEmailProps) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu tienda ha sido pausada</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #ef4444;">

    <!-- Alert Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 40px; margin-bottom: 10px;">⏸️</div>
      <h1 style="margin: 0; color: #1b1b1b; font-size: 24px; font-weight: 600;">
        Tu tienda ha sido pausada
      </h1>
    </div>

    <!-- Body -->
    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hola <strong>${ownerEmail}</strong>,
    </p>

    <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 6px;">
      <p style="color: #7f1d1d; font-size: 15px; line-height: 1.6; margin: 0;">
        <strong>${storeName}</strong> ha sido pausada debido a que no hay una suscripción activa desde hace más de 30 días.
      </p>
    </div>

    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      En este estado:
    </p>
    <ul style="color: #666; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
      <li>Tu catálogo público no es visible para clientes</li>
      <li>No puedes recibir nuevos pedidos</li>
      <li>Tus datos y configuración se mantienen seguros</li>
    </ul>

    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      ¿Querés volver? Es muy fácil. Simplemente activa una suscripción y tu tienda volverá a estar online en minutos.
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="${restoreUrl}"
         style="display: inline-block; background: #1b1b1b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background 0.2s;">
        Reactivar tienda
      </a>
    </div>

    <!-- Info -->
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h3 style="color: #1b1b1b; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">¿Necesitás ayuda?</h3>
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
        Si tenés preguntas sobre tu suscripción o necesitás soporte, escribinos a
        <a href="mailto:soporte@kitdigital.ar" style="color: #0284c7; text-decoration: none;">soporte@kitdigital.ar</a>
        o contactanos por WhatsApp.
      </p>
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
