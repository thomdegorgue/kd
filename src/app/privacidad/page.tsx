import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidad',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-8">
          ← Volver
        </Link>

        <h1 className="text-4xl font-bold tracking-tight text-[#1b1b1b] mb-2">Política de Privacidad</h1>
        <p className="text-sm text-[#6e6e73] mb-8">Última actualización: abril de 2026</p>

        <div className="prose prose-sm max-w-none text-[#1b1b1b] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_li]:mb-2 [&_ul]:mb-6">

          <h2>1. Introducción</h2>
          <p>
            En KitDigital.ar, la privacidad de tus datos es importante para nosotros. Esta Política de Privacidad explica cómo recopilamos, usamos, compartimos y protegemos tu información personal.
          </p>

          <h2>2. Información que Recopilamos</h2>
          <h3>Información de Registro</h3>
          <ul>
            <li>Nombre, email, contraseña</li>
            <li>Nombre del negocio / tienda</li>
            <li>Número de WhatsApp</li>
            <li>Ubicación (opcional)</li>
          </ul>

          <h3>Información de Contenido</h3>
          <ul>
            <li>Productos (nombres, descripciones, imágenes, precios)</li>
            <li>Categorías de productos</li>
            <li>Información de envío</li>
            <li>Configuración de tienda (colores, logo, datos de contacto)</li>
          </ul>

          <h3>Información de Transacciones</h3>
          <ul>
            <li>Historiales de órdenes de clientes</li>
            <li>Información de pagos (procesada por Mercado Pago)</li>
            <li>Detalles de suscripción y facturación</li>
          </ul>

          <h3>Información de Uso</h3>
          <ul>
            <li>Dirección IP</li>
            <li>Tipo de navegador y dispositivo</li>
            <li>Páginas visitadas y acciones realizadas</li>
            <li>Timestamps de acceso</li>
          </ul>

          <h2>3. Cómo Usamos tu Información</h2>
          <p>Usamos tu información para:</p>
          <ul>
            <li>Proporcionar y mejorar la Plataforma</li>
            <li>Procesar pagos y facturación</li>
            <li>Enviarte confirmaciones, notificaciones y actualizaciones de servicio</li>
            <li>Responder a tus consultas y soporte técnico</li>
            <li>Realizar análisis y estadísticas (datos agregados)</li>
            <li>Detectar y prevenir fraude y abuso</li>
            <li>Cumplir con obligaciones legales</li>
          </ul>

          <h2>4. Base Legal para Procesamiento (GDPR / Argentina)</h2>
          <p>
            El procesamiento de datos personales se basa en:
          </p>
          <ul>
            <li><strong>Consentimiento:</strong> Al registrarte, consentís el procesamiento de tus datos</li>
            <li><strong>Contrato:</strong> Datos necesarios para proporcionar el servicio</li>
            <li><strong>Obligación legal:</strong> Cumplimiento de leyes (ej. Ley 25.326 de Protección de Datos Personales)</li>
          </ul>

          <h2>5. Compartir Información con Terceros</h2>
          <p>
            No vendemos tus datos. Sin embargo, compartimos información con:
          </p>

          <h3>Proveedores de Servicios</h3>
          <ul>
            <li><strong>Supabase:</strong> almacenamiento de base de datos y autenticación</li>
            <li><strong>Cloudinary:</strong> almacenamiento de imágenes</li>
            <li><strong>Mercado Pago:</strong> procesamiento de pagos (recibe nombre, email, monto)</li>
            <li><strong>Resend:</strong> envío de emails transaccionales</li>
            <li><strong>OpenAI:</strong> procesamiento de solicitudes del asistente IA (información anónima)</li>
          </ul>
          <p>
            Todos los proveedores tienen acuerdos de confidencialidad y solo procesan datos conforme a nuestras instrucciones.
          </p>

          <h3>Cumplimiento Legal</h3>
          <p>
            Podemos compartir información si es requerido por ley, orden judicial o para proteger derechos legales.
          </p>

          <h2>6. Retención de Datos</h2>
          <p>
            Retenemos datos mientras tu cuenta esté activa. Después de cancelación:
          </p>
          <ul>
            <li>Datos de transacciones: 5 años (por retención fiscal)</li>
            <li>Datos de cuenta: 1 año (luego eliminado)</li>
            <li>Logs de acceso: 90 días</li>
          </ul>
          <p>
            Podés solicitar eliminación de datos en cualquier momento (ver Sección 10).
          </p>

          <h2>7. Seguridad de Datos</h2>
          <p>
            Implementamos medidas técnicas y organizacionales para proteger tus datos:
          </p>
          <ul>
            <li>Encriptación TLS/SSL para datos en tránsito</li>
            <li>Encriptación en reposo en Supabase</li>
            <li>Autenticación de dos factores disponible</li>
            <li>Row-Level Security (RLS) en base de datos</li>
            <li>Auditoría de eventos de usuario</li>
          </ul>
          <p>
            Aunque implementamos protecciones robustas, ningún sistema es 100% seguro. Aceptás el riesgo inherente a la transmisión de datos online.
          </p>

          <h2>8. Derechos del Usuario (ARCO — Argentina)</h2>
          <p>
            Conforme a la Ley 25.326, tenés derecho a:
          </p>
          <ul>
            <li><strong>Acceso:</strong> Solicitar copia de tus datos</li>
            <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
            <li><strong>Oposición:</strong> Solicitar que no procesemos tus datos para ciertos usos</li>
            <li><strong>Cancelación:</strong> Solicitar eliminación de datos (con excepciones legales)</li>
          </ul>
          <p>
            Para ejercer estos derechos, contactanos a soporte@kitdigital.ar con tu nombre y email.
          </p>

          <h2>9. Cookies y Tecnologías de Rastreo</h2>
          <p>
            La Plataforma usa cookies para:
          </p>
          <ul>
            <li>Mantener sesión autenticada</li>
            <li>Guardar preferencias de usuario</li>
            <li>Análisis anónimo de uso (Google Analytics, si habilitado)</li>
          </ul>
          <p>
            Podés desactivar cookies en la configuración de tu navegador, pero algunas funciones pueden no trabajar correctamente.
          </p>

          <h2>10. Solicitudes de Datos (SAR — Subject Access Request)</h2>
          <p>
            Para solicitar acceso, rectificación o eliminación de tus datos:
          </p>
          <ol>
            <li>Envía un email a soporte@kitdigital.ar</li>
            <li>Incluye tu email registrado y una descripción clara de tu solicitud</li>
            <li>Verificaremos tu identidad</li>
            <li>Responderemos dentro de 30 días (conforme a Ley 25.326)</li>
          </ol>

          <h2>11. Datos de Clientes de tu Tienda</h2>
          <p>
            Los clientes que realizan pedidos en tu catálogo público proporcionan:
          </p>
          <ul>
            <li>Nombre, teléfono WhatsApp, dirección</li>
            <li>Historial de pedidos</li>
          </ul>
          <p>
            <strong>Eres responsable de:</strong>
          </p>
          <ul>
            <li>Informar a tus clientes sobre la recopilación de datos</li>
            <li>Obtener consentimiento para procesar sus datos</li>
            <li>Cumplir con leyes de protección de datos locales</li>
            <li>Mantener datos de clientes confidenciales</li>
          </ul>
          <p>
            KitDigital.ar actúa como procesador; tú eres el responsable del tratamiento.
          </p>

          <h2>12. Transferencias Internacionales de Datos</h2>
          <p>
            Supabase (base de datos) está ubicado en Irlanda (UE). Los datos pueden ser procesados fuera de Argentina. Al usar la Plataforma, consentís estas transferencias internacionales.
          </p>

          <h2>13. Cambios a la Política de Privacidad</h2>
          <p>
            Podemos actualizar esta política en cualquier momento. Los cambios significativos se notificarán por email o banner en la Plataforma. El uso continuado implica aceptación de los cambios.
          </p>

          <h2>14. Contacto — Responsable de Datos</h2>
          <p>
            Para consultas sobre privacidad o solicitudes ARCO:
          </p>
          <ul>
            <li><strong>Email:</strong> soporte@kitdigital.ar</li>
            <li><strong>Sitio web:</strong> kitdigital.ar</li>
          </ul>

          <h2>15. Organismo de Control</h2>
          <p>
            Si tenés preocupaciones sobre el tratamiento de datos, podés contactar a:
          </p>
          <ul>
            <li><strong>AEPD (España, si aplica):</strong> www.aepd.es</li>
            <li><strong>AFIP (Argentina):</strong> Para cuestiones de protección de datos personales, según Ley 25.326</li>
          </ul>

        </div>
      </div>
    </div>
  )
}
