import { NextRequest, NextResponse } from 'next/server'
import {
  generatePDF,
  type TemplateName,
  type StoreConfigForPDF,
} from '@/lib/utils/pdf-templates'
import { pdfLimiter } from '@/lib/ratelimit'

const VALID_TEMPLATES = new Set<TemplateName>(['order', 'invoice', 'stock-report', 'finance-summary'])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ template: string }> },
) {
  const { template } = await params

  // Rate limit: 10 requests per 60s per IP
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await pdfLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!VALID_TEMPLATES.has(template as TemplateName)) {
    return NextResponse.json({ error: 'Template no válido' }, { status: 400 })
  }

  const body = (await request.json()) as { data: Record<string, unknown>; storeConfig: StoreConfigForPDF }

  if (!body.data || !body.storeConfig) {
    return NextResponse.json({ error: 'Faltan data o storeConfig' }, { status: 400 })
  }

  try {
    const { doc, filename } = generatePDF(
      template as TemplateName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { data: body.data as any, storeConfig: body.storeConfig },
    )

    const pdfBuffer = doc.output('arraybuffer')

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
