interface InvitationEmailProps {
  invitedEmail: string
  inviterName: string
  storeName: string
  acceptUrl: string
  role: string
}

export function InvitationEmail({
  invitedEmail,
  inviterName,
  storeName,
  acceptUrl,
  role,
}: InvitationEmailProps) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a ${storeName}</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9f9f9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #e0e0e0;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="margin: 0; color: #1b1b1b; font-size: 24px; font-weight: 600;">
        ¡Te han invitado a ${storeName}!
      </h1>
    </div>

    <!-- Body -->
    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Hola <strong>${invitedEmail}</strong>,
    </p>

    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>${inviterName}</strong> te ha invitado a colaborar en <strong>${storeName}</strong> en KitDigital como <strong>${role}</strong>.
    </p>

    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
      Como ${role.toLowerCase()}, podrás ${
    role === 'owner'
      ? 'acceder a todos los datos y configuraciones de la tienda.'
      : role === 'admin'
        ? 'gestionar productos, órdenes, clientes y operaciones de la tienda.'
        : 'colaborar con productos, órdenes y otras tareas de la tienda.'
  }
    </p>

    <!-- CTA Button -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="${acceptUrl}"
         style="display: inline-block; background: #1b1b1b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background 0.2s;">
        Aceptar invitación
      </a>
    </div>

    <p style="color: #999; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0;">
      O copia este enlace en tu navegador:
    </p>
    <p style="color: #0284c7; font-size: 12px; word-break: break-all; margin: 0 0 30px 0; padding: 12px; background: #f5f5f5; border-radius: 6px;">
      ${acceptUrl}
    </p>

    <p style="color: #999; font-size: 12px; line-height: 1.5; margin: 0; border-top: 1px solid #e0e0e0; padding-top: 20px;">
      Esta invitación expira en 72 horas.
    </p>

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
