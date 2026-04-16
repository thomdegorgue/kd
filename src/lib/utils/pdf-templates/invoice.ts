import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PDFTemplateInput, PDFTemplateResult } from './index'

export interface InvoicePDFData {
  invoiceNumber: string
  customer: string
  date: string
  dueDate?: string
  lines: { description: string; qty: number; unitPrice: number; subtotal: number }[]
  total: number
  notes?: string
}

function money(n: number) {
  return `$${Math.abs(n).toLocaleString('es-AR')}`
}

export function generateInvoicePDF(input: PDFTemplateInput<InvoicePDFData>): PDFTemplateResult {
  const { data, storeConfig } = input
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(27, 27, 27)
  doc.text(storeConfig.name, margin, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text('Factura / Recibo', margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(`N.° ${data.invoiceNumber}`, margin, y); y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Cliente: ${data.customer}`, margin, y); y += 4
  doc.text(`Fecha: ${data.date}`, margin, y); y += 4
  if (data.dueDate) {
    doc.text(`Vencimiento: ${data.dueDate}`, margin, y); y += 4
  }
  y += 3

  autoTable(doc, {
    startY: y,
    head: [['Descripción', 'Cant.', 'P. unit.', 'Subtotal']],
    body: data.lines.map((l) => [l.description, String(l.qty), money(l.unitPrice), money(l.subtotal)]),
    foot: [['', '', 'Total', money(data.total)]],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: [20, 20, 20] },
    headStyles: { fillColor: [27, 27, 27], textColor: 255, fontStyle: 'bold' },
    footStyles: { fontStyle: 'bold', fillColor: [246, 246, 246], textColor: [20, 20, 20] },
    margin: { left: margin, right: margin },
  })

  if (data.notes) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    doc.setFontSize(8)
    doc.setTextColor(90, 90, 90)
    doc.text(`Notas: ${data.notes}`, margin, finalY)
  }

  return {
    doc,
    filename: `factura-${data.invoiceNumber.replace(/\s/g, '_')}`,
  }
}
