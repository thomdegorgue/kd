'use client'

import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UploadedImage {
  url: string
  file?: File
}

interface ImageUploaderProps {
  onUpload: (urls: string[]) => void
  maxFiles?: number
  folder?: string
  accept?: string
  maxSizeMB?: number
  storeId: string
  /** URLs de imágenes ya existentes (para edición) */
  existingUrls?: string[]
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

export function ImageUploader({
  onUpload,
  maxFiles = 1,
  folder = 'products',
  accept = 'image/*',
  maxSizeMB = 5,
  storeId,
  existingUrls = [],
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>(
    existingUrls.map((url) => ({ url })),
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = maxFiles - images.length

  const uploadToCloudinary = useCallback(
    async (file: File): Promise<string> => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET ?? '')
      formData.append('folder', `kitdigital/${storeId}/${folder}`)

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData },
      )

      if (!res.ok) throw new Error('Error al subir imagen')

      const data = (await res.json()) as { secure_url: string }
      return data.secure_url
    },
    [storeId, folder],
  )

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(files).slice(0, remaining)

      if (fileArray.length === 0) {
        if (remaining <= 0) setError(`Máximo ${maxFiles} imagen(es)`)
        return
      }

      // Validar tamaño
      const maxBytes = maxSizeMB * 1024 * 1024
      const oversized = fileArray.find((f) => f.size > maxBytes)
      if (oversized) {
        setError(`"${oversized.name}" excede ${maxSizeMB}MB`)
        return
      }

      setUploading(true)
      try {
        const urls = await Promise.all(fileArray.map(uploadToCloudinary))
        const newImages = [
          ...images,
          ...urls.map((url) => ({ url })),
        ]
        setImages(newImages)
        onUpload(newImages.map((i) => i.url))
      } catch {
        setError('Error al subir imagen(es). Intentá de nuevo.')
      } finally {
        setUploading(false)
      }
    },
    [remaining, maxFiles, maxSizeMB, images, onUpload, uploadToCloudinary],
  )

  const removeImage = useCallback(
    (index: number) => {
      const newImages = images.filter((_, i) => i !== index)
      setImages(newImages)
      onUpload(newImages.map((i) => i.url))
    },
    [images, onUpload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles],
  )

  return (
    <div className="space-y-3">
      {/* Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={img.url} className="group relative h-24 w-24 overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {remaining > 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading
              ? 'Subiendo...'
              : remaining === maxFiles
                ? 'Arrastrá o hacé click para subir'
                : `Podés agregar ${remaining} más`}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={remaining > 1}
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files) }}
            className="hidden"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  )
}
