import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type OrderReceiptLine = {
  name: string
  qty: number
  unitPrice: number
  subtotal: number
}

export type OrderReceiptInput = {
  storeName: string
  /** URL pública del logo (mismo origen o CORS permitido) */
  logoUrl: string | null
  orderId: string
  customer: string
  date: string
  statusLabel: string
  lines: OrderReceiptLine[]
  total: number
  trackingCode?: string
}

function money(n: number) {
  return `$${Math.abs(n).toLocaleString('es-AR')}`
}

async function imageToDataUrl(url: string): Promise<string | null> {
  if (!url.trim()) return null
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(new Error('read'))
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/** PDF tipo comprobante: logo o nombre, tabla de ítems, total (demo / cliente). */
export async function downloadOrderReceiptPdf(input: OrderReceiptInput): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  let y = margin

  const dataUrl = await imageToDataUrl(input.logoUrl ?? '')
  if (dataUrl) {
    const isPng = dataUrl.startsWith('data:image/png')
    const fmt = isPng ? 'PNG' : 'JPEG'
    try {
      doc.addImage(dataUrl, fmt, margin, y, 22, 22)
      y = margin + 26
    } catch {
      y = margin
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(27, 27, 27)
  doc.text(input.storeName || 'Mi tienda', margin, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text('Comprobante de pedido', margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Pedido ${input.orderId}`, margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Cliente: ${input.customer}`, margin, y)
  y += 4
  doc.text(`Fecha: ${input.date}`, margin, y)
  y += 4
  doc.text(`Estado: ${input.statusLabel}`, margin, y)
  y += 4
  if (input.trackingCode) {
    doc.text(`Seguimiento: ${input.trackingCode}`, margin, y)
    y += 4
  }

  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Producto', 'Cant.', 'P. unit.', 'Subtotal']],
    body: input.lines.map((l) => [
      l.name,
      String(l.qty),
      money(l.unitPrice),
      money(l.subtotal),
    ]),
    foot: [['', '', 'Total', money(input.total)]],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: [20, 20, 20] },
    headStyles: { fillColor: [27, 27, 27], textColor: 255, fontStyle: 'bold' },
    footStyles: { fontStyle: 'bold', fillColor: [246, 246, 246], textColor: [20, 20, 20] },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
  })

  const safe = input.orderId.replace(/#/g, '').replace(/\s/g, '_')
  doc.save(`comprobante-pedido-${safe}.pdf`)
}
