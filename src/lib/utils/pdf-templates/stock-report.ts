import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PDFTemplateInput, PDFTemplateResult } from './index'

export interface StockReportPDFData {
  date: string
  items: { name: string; sku: string; stock: number; minStock: number }[]
  totalProducts: number
  lowStockCount: number
}

export function generateStockReportPDF(input: PDFTemplateInput<StockReportPDFData>): PDFTemplateResult {
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
  doc.text('Reporte de stock', margin, y)
  y += 5
  doc.text(`Generado: ${data.date}`, margin, y)
  y += 5
  doc.text(`Total productos: ${data.totalProducts} | Stock bajo: ${data.lowStockCount}`, margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Producto', 'SKU', 'Stock', 'Mín.', 'Estado']],
    body: data.items.map((item) => [
      item.name,
      item.sku || '—',
      String(item.stock),
      String(item.minStock),
      item.stock <= item.minStock ? '⚠ Bajo' : 'OK',
    ]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: [20, 20, 20] },
    headStyles: { fillColor: [27, 27, 27], textColor: 255, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  })

  return {
    doc,
    filename: `reporte-stock-${data.date}`,
  }
}
