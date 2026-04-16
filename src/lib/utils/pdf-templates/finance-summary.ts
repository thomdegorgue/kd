import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PDFTemplateInput, PDFTemplateResult } from './index'

export interface FinanceSummaryPDFData {
  period: string
  entries: { date: string; description: string; type: 'income' | 'expense'; amount: number }[]
  totalIncome: number
  totalExpenses: number
  balance: number
}

function money(n: number) {
  const abs = Math.abs(n)
  const formatted = `$${abs.toLocaleString('es-AR')}`
  return n < 0 ? `-${formatted}` : formatted
}

export function generateFinanceSummaryPDF(input: PDFTemplateInput<FinanceSummaryPDFData>): PDFTemplateResult {
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
  doc.text('Resumen financiero', margin, y)
  y += 5
  doc.text(`Período: ${data.period}`, margin, y)
  y += 8

  // Summary line
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(`Ingresos: ${money(data.totalIncome)}   |   Gastos: ${money(data.totalExpenses)}   |   Balance: ${money(data.balance)}`, margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['Fecha', 'Descripción', 'Tipo', 'Monto']],
    body: data.entries.map((e) => [
      e.date,
      e.description,
      e.type === 'income' ? 'Ingreso' : 'Gasto',
      money(e.amount),
    ]),
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: [20, 20, 20] },
    headStyles: { fillColor: [27, 27, 27], textColor: 255, fontStyle: 'bold' },
    margin: { left: margin, right: margin },
  })

  return {
    doc,
    filename: `resumen-financiero-${data.period.replace(/\s/g, '_')}`,
  }
}
