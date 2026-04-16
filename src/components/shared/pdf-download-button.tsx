'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  downloadPDF,
  type TemplateName,
  type StoreConfigForPDF,
} from '@/lib/utils/pdf-templates'

interface PDFDownloadButtonProps {
  template: TemplateName
  data: Record<string, unknown>
  storeConfig: StoreConfigForPDF
  label?: string
  className?: string
}

export function PDFDownloadButton({
  template,
  data,
  storeConfig,
  label = 'Descargar PDF',
  className,
}: PDFDownloadButtonProps) {
  const [generating, setGenerating] = useState(false)

  const handleClick = () => {
    setGenerating(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      downloadPDF(template, { data: data as any, storeConfig })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={generating}
      className={className}
    >
      {generating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  )
}
