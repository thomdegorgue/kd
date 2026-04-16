import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PDFTemplateInput, PDFTemplateResult } from './index'

export interface OrderPDFData {
  orderId: string
  customer: string
  date: string
  statusLabel: string
  trackingCode?: string
  lines: { name: string; qty: number; unitPrice: number; subtotal: number }[]
  total: number
}

function money(n: number) {
  return `$${Math.abs(n).toLocaleString('es-AR')}`
}

export function generateOrderPDF(input: PDFTemplateInput<OrderPDFData>): PDFTemplateResult {
  const { data, storeConfig } = input
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  let y = margin

  // Header: store name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(27, 27, 27)
  doc.text(storeConfig.name, margin, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text('Comprobante de pedido', margin, y)
  y += 8

  // Order details
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`Pedido ${data.orderId}`, margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Cliente: ${data.customer}`, margin, y); y += 4
  doc.text(`Fecha: ${data.date}`, margin, y); y += 4
  doc.text(`Estado: ${data.statusLabel}`, margin, y); y += 4
  if (data.trackingCode) {
    doc.text(`Seguimiento: ${data.trackingCode}`, margin, y); y += 4
  }
  y += 3

  // Items table
  autoTable(doc, {
    startY: y,
    head: [['Producto', 'Cant.', 'P. unit.', 'Subtotal']],
    body: data.lines.map((l) => [l.name, String(l.qty), money(l.unitPrice), money(l.subtotal)]),
    foot: [['', '', 'Total', money(data.total)]],
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

  return {
    doc,
    filename: `comprobante-pedido-${data.orderId.replace(/#/g, '').replace(/\s/g, '_')}`,
  }
}
