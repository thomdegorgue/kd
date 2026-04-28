import Link from 'next/link'

export const metadata = {
  title: 'Términos y Condiciones',
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''

function formatWhatsApp(num: string): string {
  if (!num) return ''
  // Formato internacional con guiones: 5491123456789 → +54 9 11 2345-6789
  const clean = num.replace(/\D/g, '')
  if (clean.length < 11) return `+${clean}`
  const country = clean.slice(0, 2)
  const mobile = clean.slice(2, 3)
  const area = clean.slice(3, 5)
  const first = clean.slice(5, 9)
  const last = clean.slice(9)
  return `+${country} ${mobile} ${area} ${first}-${last}`
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-8">
          ← Volver
        </Link>

        <h1 className="text-4xl font-bold tracking-tight text-[#1b1b1b] mb-2">Términos y Condiciones</h1>
        <p className="text-sm text-[#6e6e73] mb-8">Última actualización: abril de 2026</p>

        <div className="prose prose-sm max-w-none text-[#1b1b1b] [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_li]:mb-2 [&_ul]:mb-6">

          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al acceder y usar KitDigital.ar (&quot;Plataforma&quot;), aceptás estos Términos y Condiciones. Si no estás de acuerdo con algún término, no debes usar la Plataforma.
          </p>

          <h2>2. Descripción del Servicio</h2>
          <p>
            KitDigital.ar es una plataforma SaaS que permite que emprendedores y pequeñas empresas publiquen catálogos digitales de productos, reciban pedidos a través de WhatsApp y gestionen su negocio desde un panel administrativo.
          </p>

          <h2>3. Derechos de Uso</h2>
          <p>
            Te otorgamos una licencia limitada, no exclusiva y revocable para usar la Plataforma, sujeta a estos Términos. No debes:
          </p>
          <ul>
            <li>Reproducir, modificar o distribuir el código, diseño o contenido de KitDigital.ar</li>
            <li>Usar la Plataforma para actividades ilegales o fraudulentas</li>
            <li>Intentar acceder a sistemas sin autorización</li>
            <li>Vender, transferir o revender acceso a la Plataforma</li>
            <li>Crear scraping o recopilación automatizada de datos</li>
          </ul>

          <h2>4. Cuenta de Usuario</h2>
          <p>
            Eres responsable de mantener la confidencialidad de tus credenciales de acceso. Cualquier actividad realizada con tu cuenta es de tu responsabilidad. Notificanos inmediatamente si sospechás acceso no autorizado.
          </p>

          <h2>5. Contenido del Usuario</h2>
          <p>
            Al subir productos, imágenes, descripciones u otro contenido a la Plataforma, reconocés que:
          </p>
          <ul>
            <li>Eres el propietario o tenés licencia del contenido</li>
            <li>El contenido no infringe derechos de terceros</li>
            <li>El contenido no es ilegal, obsceno o difamatorio</li>
            <li>Nos otorgás permiso para almacenar y mostrar el contenido</li>
          </ul>
          <p>
            KitDigital.ar se reserva el derecho de remover contenido que viole estos términos sin previo aviso.
          </p>

          <h2>6. Suscripción y Pagos</h2>
          <p>
            El acceso a funcionalidades avanzadas requiere una suscripción paga. Los precios se calculan según:
          </p>
          <ul>
            <li>Cantidad de productos en el catálogo ($20.000 ARS por cada 100 productos/mes)</li>
            <li>Módulos adicionales activados (según tarifa modular)</li>
          </ul>
          <p>
            Las suscripciones se procesan a través de Mercado Pago. Aceptás los términos de servicio de Mercado Pago como procesador de pagos. Las suscripciones se renuevan automáticamente cada período de facturación a menos que las canceles.
          </p>

          <h2>7. Reembolsos</h2>
          <p>
            No ofrecemos reembolsos por suscripciones ya consumidas. Sin embargo, podés cancelar tu suscripción en cualquier momento desde el panel de facturación, y no se realizarán cargos futuros.
          </p>

          <h2>8. Trial Gratuito</h2>
          <p>
            Si accedés a un período de prueba gratuito, el acceso es limitado a las funcionalidades del plan de prueba. Al vencer el período de prueba, tu tienda pasará a estado &quot;past_due&quot; y las operaciones será limitadas hasta que actives una suscripción paga.
          </p>

          <h2>9. Limitación de Responsabilidad</h2>
          <p>
            KitDigital.ar se proporciona &quot;tal como está&quot;. En la máxima medida permitida por ley:
          </p>
          <ul>
            <li>No garantizamos disponibilidad continua del servicio</li>
            <li>No somos responsables por pérdida de datos, ingresos o ganancias</li>
            <li>No somos responsables por daños directos, indirectos o punitivos</li>
            <li>La responsabilidad total está limitada al monto pagado en los últimos 12 meses</li>
          </ul>

          <h2>10. Privacidad y Protección de Datos</h2>
          <p>
            El procesamiento de datos personales se rige por nuestra Política de Privacidad. Al usar la Plataforma, aceptás el procesamiento de datos conforme a esa política.
          </p>

          <h2>11. Procesadores de Datos Terceros</h2>
          <p>
            La Plataforma utiliza servicios de terceros que pueden procesar datos:
          </p>
          <ul>
            <li><strong>Supabase:</strong> base de datos y autenticación</li>
            <li><strong>Cloudinary:</strong> almacenamiento y distribución de imágenes</li>
            <li><strong>Mercado Pago:</strong> procesamiento de pagos</li>
            <li><strong>OpenAI:</strong> procesamiento de solicitudes del asistente IA</li>
            <li><strong>Resend:</strong> envío de emails transaccionales</li>
          </ul>
          <p>
            Cada servicio tiene sus propios términos y políticas de privacidad. Asumís el riesgo de usar dichos servicios.
          </p>

          <h2>12. Cancelación de Cuenta</h2>
          <p>
            Podés solicitar la cancelación de tu cuenta en cualquier momento. Al cancelar:
          </p>
          <ul>
            <li>Perderás acceso a la Plataforma y tus datos</li>
            <li>Los datos se eliminarán conforme a nuestra política de retención</li>
            <li>Las suscripciones activas se cancelarán</li>
          </ul>

          <h2>13. Cambios a los Términos</h2>
          <p>
            Nos reservamos el derecho de actualizar estos Términos en cualquier momento. Los cambios significativos se notificarán con 30 días de anticipación. El uso continuo de la Plataforma constituye aceptación de los términos modificados.
          </p>

          <h2>14. Ley Aplicable</h2>
          <p>
            Estos Términos se rigen por las leyes de la República Argentina. Cualquier disputa se resolverá en los tribunales competentes de Buenos Aires.
          </p>

          <h2>15. Contacto</h2>
          <p>
            Para consultas sobre estos Términos, contactanos en:
          </p>
          <ul>
            <li><strong>Email:</strong> soporte@kitdigital.ar</li>
            {WHATSAPP_NUMBER && (
              <li><strong>WhatsApp:</strong> <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">{formatWhatsApp(WHATSAPP_NUMBER)}</a></li>
            )}
          </ul>

        </div>
      </div>
    </div>
  )
}
