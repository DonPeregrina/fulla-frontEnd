import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { deleteImage } from '@/lib/voice/archive'
import { momentLabel } from '@/lib/voice/moments'
import { ARCHIVE_KEY, useArchiveImages, type ArchivedView } from '@/lib/voice/useArchive'
import { parseDiaISO } from '@/lib/utils'

/** Archivo de imágenes de comida guardadas en este dispositivo, agrupadas por día. */
export default function ArchiveGallery() {
  const { current } = useAuth()
  const userId = current?.id
  const qc = useQueryClient()
  const images = useArchiveImages(userId)
  const [open, setOpen] = useState<ArchivedView | null>(null)

  const byDay = new Map<string, ArchivedView[]>()
  images.forEach(img => byDay.set(img.day, [...(byDay.get(img.day) ?? []), img]))

  async function remove(img: ArchivedView) {
    if (!userId) return
    await deleteImage(userId, img.day, img.moment)
    setOpen(null)
    qc.invalidateQueries({ queryKey: [ARCHIVE_KEY, userId] })
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#DDD5EE] bg-white/40 px-6 py-10 text-center">
        <span className="text-3xl">🍽️</span>
        <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-mn-sky">Aún no hay imágenes</p>
        <p className="max-w-[260px] text-[10px] leading-relaxed text-[#8878AA]">
          Aquí quedan las imágenes de lo que comes y bebes cuando contestas con el asistente. Con el modo pruebas encendido no se guardan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="font-mono text-[8px] tracking-[0.06em] text-[#B0A8CC]">
        {images.length} {images.length === 1 ? 'imagen' : 'imágenes'} · guardadas solo en este teléfono
      </p>

      {[...byDay.entries()].map(([day, items]) => (
        <section key={day} className="space-y-2">
          <h3 className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-mn-sky">
            {format(parseDiaISO(day), "d 'de' MMMM yyyy", { locale: es })}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {items.map(img => (
              <button
                key={img.key}
                onClick={() => setOpen(img)}
                className="overflow-hidden rounded-2xl border border-[#DDD5EE] bg-white text-left transition-transform active:scale-[0.98]"
              >
                <img src={img.url} alt={`Comida de ${momentLabel(img.moment)}`} className="aspect-square w-full object-cover" />
                <div className="space-y-1 px-2.5 py-2">
                  <span className="inline-block rounded-full bg-[#2D2440] px-2 py-0.5 font-mono text-[7px] font-bold tracking-[0.1em] text-[#F0C030]">
                    {momentLabel(img.moment)}
                  </span>
                  <p className="line-clamp-2 text-[9px] leading-snug text-[#5A4A7A]">{img.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      <Dialog.Root open={!!open} onOpenChange={o => { if (!o) setOpen(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content className="fixed inset-x-4 top-[8%] z-50 mx-auto max-w-sm space-y-3 rounded-[24px] border border-[#DDD5EE] bg-white p-4 focus:outline-none">
            {open && (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Dialog.Title className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-mn-plum">
                      {momentLabel(open.moment)} · {format(parseDiaISO(open.day), "d 'de' MMMM", { locale: es })}
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-[11px] leading-snug text-[#5A4A7A]">{open.description}</Dialog.Description>
                  </div>
                  <Dialog.Close className="rounded-full bg-[#EDE9F8] p-1.5 text-mn-plum" aria-label="Cerrar"><X size={14} /></Dialog.Close>
                </div>
                <img src={open.url} alt={open.description} className="w-full rounded-2xl border border-[#DDD5EE]" />
                <button
                  onClick={() => void remove(open)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E8503A]/40 py-2.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#E8503A]"
                >
                  <Trash2 size={13} /> Borrar de este teléfono
                </button>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
