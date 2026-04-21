import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { CheckCircle2, X, History } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import { getNudos, getHiloNombre, respuestasApi } from '@/services/api'
import { nudoColor, type Pregunta, type Respuesta } from '@/types'
import { todayISO, formatDate } from '@/lib/utils'
import { BraidCanvas, type HiloCanvas } from '@/components/BraidCanvas'

function isToday(createdAt: string): boolean {
  const today = todayISO()
  const d = new Date(Number(createdAt))
  if (isNaN(d.getTime())) return false
  return d.toISOString().split('T')[0] === today
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface NudoConHilos {
  id: string
  name: string
  color: string
  hilos: HiloCanvas[]
  preguntas: Pregunta[]
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-4 space-y-8">
      {[1, 2].map(i => (
        <div key={i} className="space-y-3 animate-pulse">
          <div className="flex justify-center"><div className="h-3 w-24 bg-[#DDD5EE] rounded-full" /></div>
          <div className="h-[340px] w-full bg-[#DDD5EE] rounded-2xl" />
        </div>
      ))}
    </div>
  )
}

// ─── Modal de respuestas (preguntas de un Hilo dentro de un Nudo) ─────────────

function HiloModal({
  nudo,
  hilo,
  preguntas,
  respuestasHoyMap,
  guardando,
  onGuardar,
  open,
  onClose,
}: {
  nudo: NudoConHilos
  hilo: HiloCanvas
  preguntas: Pregunta[]
  respuestasHoyMap: Record<string, Respuesta>
  guardando: boolean
  onGuardar: (questionId: string, body: string) => void
  open: boolean
  onClose: () => void
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  function draft(p: Pregunta) {
    return drafts[p.id] ?? respuestasHoyMap[p.id]?.body ?? ''
  }

  function handleSave(p: Pregunta) {
    const val = draft(p).trim()
    if (!val) return
    onGuardar(p.id, val)
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          className="fixed inset-x-4 top-[8%] z-50 rounded-[28px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6 max-w-sm mx-auto focus:outline-none"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[.2em] text-[#B0A8CC]">{nudo.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hilo.color }} />
                <Dialog.Title className="text-[10px] font-bold uppercase tracking-[.2em] text-[#2D2440]">
                  {hilo.name}
                </Dialog.Title>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white/50 text-[#8878AA] hover:text-[#2D2440] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            {preguntas.map(p => {
              const resp = respuestasHoyMap[p.id]
              const isAnswered = !!resp
              const val = draft(p)

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border-2 p-4 space-y-3 transition-all ${isAnswered ? 'border-[#C4BAD8] bg-white/50' : 'border-[#DDD5EE] bg-white'}`}
                >
                  <p className="text-[10px] font-bold leading-relaxed text-[#2D2440] uppercase tracking-wide">
                    {p.body}
                  </p>
                  {isAnswered ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} style={{ color: hilo.color }} className="shrink-0" />
                      <span className="text-xs text-[#5A4A7A] flex-1">{resp.body}</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={val}
                        onChange={e => setDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSave(p)}
                        placeholder="Tu respuesta…"
                        className="flex-1 bg-white border border-[#DDD5EE] rounded-xl px-3 py-2 text-xs text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors"
                      />
                      <button
                        onClick={() => handleSave(p)}
                        disabled={!val.trim() || guardando}
                        className="px-3 py-2 rounded-xl text-xs font-black tracking-wider uppercase disabled:opacity-40 active:scale-95 transition-all"
                        style={{ backgroundColor: hilo.color, color: '#fff' }}
                      >
                        {guardando ? '…' : 'OK'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full bg-[#F0C030] hover:bg-[#FFDD55] text-[#2D2440] font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl shadow transition-transform active:scale-95"
          >
            CONFIRMAR
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── Resumen del Nudo ─────────────────────────────────────────────────────────

function NudoResumen({ preguntas, respuestasHoy }: { preguntas: Pregunta[]; respuestasHoy: Respuesta[] }) {
  const answered = respuestasHoy.filter(r => preguntas.some(p => p.id === r.questionId)).length
  const total = preguntas.length
  const isComplete = total > 0 && answered === total

  return (
    <div className="px-4">
      <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-dashed border-[#DDD5EE] bg-white/30">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm border border-[#DDD5EE]">
            <History className="h-4 w-4 text-[#F0C030]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#2D2440] uppercase tracking-wider">{answered}/{total}</p>
            <p className="text-[8px] font-bold text-[#B0A8CC] uppercase">Respondidas</p>
          </div>
        </div>
        <div className="h-6 w-1 bg-[#DDD5EE] rounded-full" />
        <div className="text-right">
          <p className="text-[9px] font-bold text-[#2D2440] uppercase">{isComplete ? 'COMPLETO' : 'EN CURSO'}</p>
          <div className="flex gap-1 justify-end mt-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-1 w-2 rounded-full"
                style={{ backgroundColor: i < Math.ceil((answered / total) * 4) ? '#F0C030' : '#DDD5EE' }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── NudosTab ─────────────────────────────────────────────────────────────────

export default function NudosTab() {
  const { current } = useAuth()
  const userId = current?.id
  const qc = useQueryClient()

  const [seleccion, setSeleccion] = useState<{ nudo: NudoConHilos; hilo: HiloCanvas } | null>(null)

  // Nudos (hardcodeados hasta que backend exponga categories con user token)
  const { data: nudosRaw } = useQuery({
    queryKey: ['nudos'],
    queryFn: getNudos,
    staleTime: Infinity,
  })

  // Todas las respuestas del usuario con preguntas embebidas
  const { data: respuestasData, isLoading } = useQuery({
    queryKey: ['respuestas-all', userId],
    queryFn: () => respuestasApi.list(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })

  const mutation = useMutation({
    mutationFn: ({ questionId, body }: { questionId: string; body: string }) =>
      respuestasApi.create(questionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['respuestas-all', userId] })
      toast.success('Respuesta guardada')
    },
    onError: () => toast.error('No se pudo guardar'),
  })

  const todasRespuestas: Respuesta[] = respuestasData?.answers ?? []

  // Preguntas únicas derivadas del historial
  const preguntasMap: Record<string, Pregunta> = {}
  todasRespuestas.forEach(r => { if (r.question) preguntasMap[r.question.id] = r.question })
  const todasPreguntas = Object.values(preguntasMap)

  // Respuestas de hoy
  const respuestasHoy = todasRespuestas.filter(r => isToday(r.createdAt))
  const respuestasHoyMap = Object.fromEntries(respuestasHoy.map(r => [r.questionId, r]))

  // Construir estructura: Nudo → Hilos → Preguntas
  const nudosConHilos: NudoConHilos[] = (nudosRaw ?? [])
    .map((nudo, nudoIdx) => {
      const nudoPreguntas = todasPreguntas.filter(p => p.categoryId === nudo.id)
      if (nudoPreguntas.length === 0) return null

      // Hilos únicos dentro de este nudo (derivados de answer.question.groupId)
      const hiloIds = [...new Set(nudoPreguntas.map(p => p.groupId))]
      const hilos: HiloCanvas[] = hiloIds.map((hiloId, j) => ({
        id: hiloId,
        name: getHiloNombre(hiloId),
        color: nudoColor(hiloId, nudoIdx * 3 + j),
      }))

      return {
        id: nudo.id,
        name: nudo.name,
        color: nudoColor(nudo.id, nudoIdx),
        hilos,
        preguntas: nudoPreguntas,
      }
    })
    .filter((n): n is NudoConHilos => n !== null)

  // Progreso global de hoy
  const totalHoy = todasPreguntas.length
  const respondidosHoy = respuestasHoy.length
  const pctGlobal = totalHoy > 0 ? Math.round((respondidosHoy / totalHoy) * 100) : 0

  const hour = new Date().getHours()
  const turno = hour < 12 ? 'Mañana' : hour < 18 ? 'Tarde' : 'Noche'
  const nombre = current && 'username' in current ? current.username : 'tú'

  return (
    <div className="flex flex-col min-h-full bg-[#EDE9F8] overflow-y-auto pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-[10px] uppercase tracking-[.15em] text-[#5A4A7A]">
          {turno} · {format(new Date(), "d 'de' MMMM", { locale: es })}
        </p>
        <h1 className="text-xl font-black tracking-tight text-[#2D2440] mt-0.5">
          Hola, {nombre}
        </h1>
        {totalHoy > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-[9px] font-bold text-[#B0A8CC] uppercase tracking-widest">
              <span>{respondidosHoy}/{totalHoy} respuestas hoy</span>
              <span>{pctGlobal}%</span>
            </div>
            <div className="h-1.5 bg-[#DDD5EE] rounded-full overflow-hidden">
              <div className="h-full bg-[#F0C030] rounded-full transition-all duration-500" style={{ width: `${pctGlobal}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <Skeleton />
      ) : nudosConHilos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <CheckCircle2 className="mb-4 h-12 w-12 text-[#DDD5EE]" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A4A7A]">Sin preguntas asignadas</h3>
          <p className="text-[10px] text-[#B0A8CC] mt-2 leading-relaxed">Tu coordinador te agregará a un hilo pronto.</p>
        </div>
      ) : (
        <div className="space-y-12 pb-4">
          {nudosConHilos.map(nudo => {
            const answered = respuestasHoy.filter(r => nudo.preguntas.some(p => p.id === r.questionId)).length
            const isComplete = answered === nudo.preguntas.length

            return (
              <div key={nudo.id} className="space-y-2">
                {/* Header del Nudo */}
                <div className="flex flex-col items-center justify-center gap-1 py-2 bg-gradient-to-r from-transparent via-[#DDD5EE]/20 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isComplete ? '#F0C030' : '#C4BAD8' }} />
                    <span className="text-[9px] font-bold uppercase tracking-[.25em]"
                      style={{ color: isComplete ? '#2D2440' : '#B0A8CC' }}>
                      {nudo.name}{isComplete ? ' · COMPLETO' : ''}
                    </span>
                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isComplete ? '#F0C030' : '#C4BAD8' }} />
                  </div>
                  <span className="text-[8px] text-[#B0A8CC] tracking-wider">
                    {formatDate(todayISO(), "EEEE d 'de' MMM")}
                  </span>
                </div>

                {/* BraidCanvas — satélites = Hilos */}
                <BraidCanvas
                  hilos={nudo.hilos}
                  preguntas={nudo.preguntas}
                  respuestas={respuestasHoy.filter(r => nudo.preguntas.some(p => p.id === r.questionId))}
                  hiloActivoId={seleccion?.nudo.id === nudo.id ? seleccion.hilo.id : null}
                  onHiloClick={(hiloId) => {
                    const hilo = nudo.hilos.find(h => h.id === hiloId)
                    if (hilo) setSeleccion({ nudo, hilo })
                  }}
                />

                {/* Resumen */}
                <NudoResumen preguntas={nudo.preguntas} respuestasHoy={respuestasHoy} />
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de respuestas por Hilo */}
      {seleccion && (
        <HiloModal
          nudo={seleccion.nudo}
          hilo={seleccion.hilo}
          preguntas={seleccion.nudo.preguntas.filter(p => p.groupId === seleccion.hilo.id)}
          respuestasHoyMap={respuestasHoyMap}
          guardando={mutation.isPending}
          onGuardar={(qId, body) => mutation.mutate({ questionId: qId, body })}
          open={!!seleccion}
          onClose={() => setSeleccion(null)}
        />
      )}
    </div>
  )
}
