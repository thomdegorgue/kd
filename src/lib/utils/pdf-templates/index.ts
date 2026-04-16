import type { jsPDF } from 'jspdf'
import { generateOrderPDF, type OrderPDFData } from './order'
import { generateInvoicePDF, type InvoicePDFData } from './invoice'
import { generateStockReportPDF, type StockReportPDFData } from './stock-report'
import { generateFinanceSummaryPDF, type FinanceSummaryPDFData } from './finance-summary'

export interface StoreConfigForPDF {
  name: string
  logoUrl?: string
  whatsapp?: string
}

export interface PDFTemplateInput<T> {
  data: T
  storeConfig: StoreConfigForPDF
}

export interface PDFTemplateResult {
  doc: jsPDF
  filename: string
}

export type TemplateName = 'order' | 'invoice' | 'stock-report' | 'finance-summary'

type TemplateDataMap = {
  order: OrderPDFData
  invoice: InvoicePDFData
  'stock-report': StockReportPDFData
  'finance-summary': FinanceSummaryPDFData
}

type GeneratorFn<T> = (input: PDFTemplateInput<T>) => PDFTemplateResult

const TEMPLATE_REGISTRY: { [K in TemplateName]: GeneratorFn<TemplateDataMap[K]> } = {
  order: generateOrderPDF,
  invoice: generateInvoicePDF,
  'stock-report': generateStockReportPDF,
  'finance-summary': generateFinanceSummaryPDF,
}

/**
 * Genera un PDF usando el template indicado.
 * Retorna el jsPDF doc y el filename sugerido.
 */
export function generatePDF<K extends TemplateName>(
  template: K,
  input: PDFTemplateInput<TemplateDataMap[K]>,
): PDFTemplateResult {
  const generator = TEMPLATE_REGISTRY[template]
  return generator(input)
}

/**
 * Genera y descarga el PDF directamente en el browser.
 */
export function downloadPDF<K extends TemplateName>(
  template: K,
  input: PDFTemplateInput<TemplateDataMap[K]>,
): void {
  const { doc, filename } = generatePDF(template, input)
  doc.save(`${filename}.pdf`)
}

export type { OrderPDFData, InvoicePDFData, StockReportPDFData, FinanceSummaryPDFData }
