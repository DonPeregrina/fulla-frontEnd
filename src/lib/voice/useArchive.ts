import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listImages, type ArchivedImage } from './archive'

export const ARCHIVE_KEY = 'archive-images'

export interface ArchivedView extends ArchivedImage {
  /** URL local para mostrar la imagen (se libera sola al desmontar). */
  url: string
}

/** Imágenes archivadas del usuario en este dispositivo, listas para pintar. */
export function useArchiveImages(userId?: string): ArchivedView[] {
  const { data } = useQuery({
    queryKey: [ARCHIVE_KEY, userId],
    queryFn: () => listImages(userId!),
    enabled: !!userId,
    staleTime: Infinity,
  })
  const [views, setViews] = useState<ArchivedView[]>([])

  // Las URLs se crean y se liberan en el MISMO efecto: así sobreviven al montaje doble de React (StrictMode) sin
  // quedar apuntando a una URL ya liberada.
  useEffect(() => {
    const created = (data ?? []).map(img => ({ ...img, url: URL.createObjectURL(img.blob) }))
    setViews(created)
    return () => { created.forEach(v => URL.revokeObjectURL(v.url)) }
  }, [data])

  return views
}
