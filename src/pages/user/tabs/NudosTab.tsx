import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { CheckCircle2, X, Pencil, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getNudos, getHiloNombre, respuestasApi } from '@/services/api'
import { nudoColor, type Pregunta, type Respuesta } from '@/types'
import { todayISO } from '@/lib/utils'
import { BraidCanvas, type HiloCanvas } from '@/components/BraidCanvas'

function isToday(createdAt: string): boolean {
  const today = todayISO()
  const d = new Date(Number(createdAt))
  if (isNaN(d.getTime())) return false
  return d.toISOString().split('T')[0] === today
}

interface NudoConHilos {
  id: string
  name: string
  color: string
  hilos: HiloCanvas[]
  preguntas: Pregunta[]
}

type MomentState = 'calm' | 'query' | 'reveal' | 'insight'

function getMomentState(answered: number, total: number): MomentState {
  if (total === 0) return 'calm'
  const p = answered / total
  if (p === 0) return 'calm'
  if (p < 0.5) return 'query'
  if (p < 1) return 'reveal'
  return 'insight'
}

const STATE_DOT_COLORS: Record<MomentState, string> = {
  calm: '#5588AA',
  query: '#F0C030',
  reveal: '#AADDFF',
  insight: '#10b981',
}

function hiloCode(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return `UN-${(Math.abs(hash) % 9000) + 1000}`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="space-y-3">
        <div className="h-6 w-6 rounded-full border-2 border-dashed border-[#F0C030] animate-[spin_4s_linear_infinite] mx-auto" />
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-mn-sky animate-pulse">SYNCHRONIZING…</p>
      </div>
    </div>
  )
}

// ─── HiloModal ────────────────────────────────────────────────────────────────

function HiloModal({ nudo, hilo, preguntas, respuestasHoyMap, guardando, onGuardar, open, onClose }: {
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
  const [editando, setEditando] = useState<Set<string>>(new Set())

  function isEditando(id: string) { return editando.has(id) }
  function toggleEdit(p: Pregunta) {
    setEditando(prev => {
      const next = new Set(prev)
      if (next.has(p.id)) { next.delete(p.id) } else {
        next.add(p.id)
        setDrafts(d => ({ ...d, [p.id]: respuestasHoyMap[p.id]?.body ?? '' }))
      }
      return next
    })
  }
  function draft(p: Pregunta) { return drafts[p.id] ?? respuestasHoyMap[p.id]?.body ?? '' }
  function handleSave(p: Pregunta) {
    const val = draft(p).trim()
    if (!val) return
    onGuardar(p.id, val)
    setEditando(prev => { const next = new Set(prev); next.delete(p.id); return next })
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content
          className="fixed inset-x-4 top-[8%] z-50 rounded-[28px] border border-[#5588AA]/30 bg-[#1A1535] p-6 max-w-sm mx-auto focus:outline-none"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-mn-sky">{nudo.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: hilo.color }} />
                <Dialog.Title className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  MEM REVEAL: {hilo.name}
                </Dialog.Title>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[#5588AA] hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            {preguntas.map(p => {
              const resp = respuestasHoyMap[p.id]
              const isAnswered = !!resp && !isEditando(p.id)
              const val = draft(p)
              return (
                <div key={p.id} className={`rounded-2xl border p-4 space-y-3 transition-all ${resp ? 'border-[#5588AA]/40 bg-white/5' : 'border-[#2D2440] bg-white/3'}`}>
                  <p className="text-[9px] font-bold leading-relaxed text-white uppercase tracking-wide">{p.body}</p>
                  {isAnswered ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} style={{ color: hilo.color }} className="shrink-0" />
                      <span className="text-xs text-[#AADDFF] flex-1">{resp.body}</span>
                      <button onClick={() => toggleEdit(p)} className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/10 transition-colors shrink-0">
                        <Pencil size={11} className="text-mn-sky" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={val}
                        onChange={e => setDrafts(d => ({ ...d, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSave(p)}
                        placeholder="Reveal data…"
                        autoFocus={isEditando(p.id)}
                        className="flex-1 bg-[#2D2440] border border-[#5588AA]/30 rounded-xl px-3 py-2 text-xs text-white placeholder:text-[#5588AA] focus:outline-none focus:border-[#F0C030] transition-colors font-mono"
                      />
                      <button
                        onClick={() => handleSave(p)}
                        disabled={!val.trim() || guardando}
                        className="px-3 py-2 rounded-xl text-[9px] font-bold tracking-wider uppercase disabled:opacity-40 active:scale-95 transition-all"
                        style={{ backgroundColor: hilo.color, color: '#1A1535' }}
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
            className="mt-6 w-full font-bold uppercase text-[9px] tracking-[0.2em] py-4 rounded-2xl transition-transform active:scale-95"
            style={{ backgroundColor: '#F0C030', color: '#1A1535' }}
          >
            INTEGRATE REVEAL
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ─── NudosTab ─────────────────────────────────────────────────────────────────

export default function NudosTab() {
  const { current } = useAuth()
  const userId = current?.id
  const qc = useQueryClient()

  const [seleccion, setSeleccion] = useState<{ nudo: NudoConHilos; hilo: HiloCanvas } | null>(null)
  const [activeNudoIdx, setActiveNudoIdx] = useState(0)

  const { data: nudosRaw } = useQuery({ queryKey: ['nudos'], queryFn: getNudos, staleTime: Infinity })

  const { data: respuestasData, isLoading } = useQuery({
    queryKey: ['respuestas-all', userId],
    queryFn: () => respuestasApi.list(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,
  })

  const mutation = useMutation({
    mutationFn: async ({ questionId, body, respuestaId }: { questionId: string; body: string; respuestaId?: string }) => {
      if (respuestaId) { await respuestasApi.update(respuestaId, body); return }
      await respuestasApi.create(questionId, body)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['respuestas-all', userId] }); toast.success('Respuesta guardada') },
    onError: () => toast.error('No se pudo guardar'),
  })

  const todasRespuestas: Respuesta[] = respuestasData?.answers ?? []
  const preguntasMap: Record<string, Pregunta> = {}
  todasRespuestas.forEach(r => { if (r.question) preguntasMap[r.question.id] = r.question })
  const todasPreguntas = Object.values(preguntasMap)

  const respuestasHoy = todasRespuestas.filter(r => isToday(r.createdAt))
  const respuestasHoyMap = Object.fromEntries(respuestasHoy.map(r => [r.questionId, r]))

  const nudosConHilos: NudoConHilos[] = (nudosRaw ?? [])
    .map((nudo, nudoIdx) => {
      const nudoPreguntas = todasPreguntas.filter(p => p.categoryId === nudo.id)
      if (nudoPreguntas.length === 0) return null
      const hiloIds = [...new Set(nudoPreguntas.map(p => p.groupId))]
      const hilos: HiloCanvas[] = hiloIds.map((hiloId, j) => ({
        id: hiloId,
        name: getHiloNombre(hiloId),
        color: nudoColor(hiloId, nudoIdx * 3 + j),
      }))
      return { id: nudo.id, name: nudo.name, color: nudoColor(nudo.id, nudoIdx), hilos, preguntas: nudoPreguntas }
    })
    .filter((n): n is NudoConHilos => n !== null)

  const safeIdx = Math.min(activeNudoIdx, Math.max(0, nudosConHilos.length - 1))
  const activeNudo = nudosConHilos[safeIdx] ?? null

  const nudoAnswered = activeNudo ? respuestasHoy.filter(r => activeNudo.preguntas.some(p => p.id === r.questionId)).length : 0
  const nudoTotal = activeNudo?.preguntas.length ?? 0
  const momentState = getMomentState(nudoAnswered, nudoTotal)

  // Primera pregunta sin responder del hilo seleccionado
  const hiloSeleccionado = seleccion ? activeNudo?.hilos.find(h => h.id === seleccion.hilo.id) : null
  const preguntasPendientes = hiloSeleccionado
    ? (activeNudo?.preguntas.filter(p => p.groupId === hiloSeleccionado.id && !respuestasHoyMap[p.id]) ?? [])
    : []
  const firstUnanswered = preguntasPendientes[0]

  function goNext() { setActiveNudoIdx(i => Math.min(nudosConHilos.length - 1, i + 1)); setSeleccion(null) }
  function goPrev() { setActiveNudoIdx(i => Math.max(0, i - 1)); setSeleccion(null) }

  if (isLoading) return <Skeleton />

  if (nudosConHilos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <CheckCircle2 className="mb-4 h-12 w-12 text-[#DDD5EE]" />
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-mn-plum">Sin preguntas asignadas</h3>
        <p className="text-[9px] text-mn-sky mt-2">Tu coordinador te agregará a un hilo pronto.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="flex flex-col min-h-full bg-mn-bg pb-24 select-none"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        if (info.offset.x < -50) goNext()
        else if (info.offset.x > 50) goPrev()
      }}
    >
      {/* 1) Barra de navegación de tiempo */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
        <button onClick={goPrev} disabled={safeIdx === 0} className="p-1 text-mn-plum disabled:opacity-30 hover:text-mn-sky transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="h-[1px] flex-1 bg-[#DDD5EE]" />
        <span className="font-mono text-[8px] font-bold text-mn-plum tracking-[0.16em] uppercase whitespace-nowrap">
          // {hiloCode(activeNudo?.id ?? 'x')} · {activeNudo?.name ?? '–'}
        </span>
        <div className="h-[1px] flex-1 bg-[#DDD5EE]" />
        <button onClick={goNext} disabled={safeIdx === nudosConHilos.length - 1} className="p-1 text-mn-plum disabled:opacity-30 hover:text-mn-sky transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 2) State matrix — time options con nombres reales */}
      <div className="px-4 mb-2 shrink-0 overflow-x-auto">
        <div className="flex items-center justify-between min-w-0 gap-1">
          {nudosConHilos.map((nudo, i) => {
            const ans = respuestasHoy.filter(r => nudo.preguntas.some(p => p.id === r.questionId)).length
            const state = getMomentState(ans, nudo.preguntas.length)
            const isActive = i === safeIdx
            const dotColor = isActive ? '#1A1535' : STATE_DOT_COLORS[state]

            return (
              <button
                key={nudo.id}
                onClick={() => { setActiveNudoIdx(i); setSeleccion(null) }}
                className="flex flex-col items-center gap-0.5 focus:outline-none transition-all hover:scale-105 flex-1 min-w-0"
              >
                <div
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: isActive ? 8 : 6,
                    height: isActive ? 8 : 6,
                    backgroundColor: dotColor,
                  }}
                />
                <span
                  className="font-mono tracking-[0.06em] uppercase transition-colors truncate w-full text-center"
                  style={{
                    fontSize: '6px',
                    color: isActive ? '#1A1535' : '#B0A8CC',
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {nudo.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3) BraidCanvas */}
      {activeNudo && (
        <div className="px-4 pb-2">
          <BraidCanvas
            hilos={activeNudo.hilos}
            preguntas={activeNudo.preguntas}
            respuestas={respuestasHoy.filter(r => activeNudo.preguntas.some(p => p.id === r.questionId))}
            hiloActivoId={seleccion?.hilo.id ?? null}
            onHiloClick={(hiloId) => {
              const hilo = activeNudo.hilos.find(h => h.id === hiloId)
              if (hilo) setSeleccion({ nudo: activeNudo, hilo })
            }}
            momentState={momentState}
          />
        </div>
      )}

      {/* 4) Panel HUD — 2 secciones */}
      {activeNudo && (
        <div className="mx-4 mt-1 bg-white border border-[#DDD5EE] rounded-[24px] overflow-hidden shadow-sm flex flex-col p-4 space-y-3">

          {/* Sección superior: archivo seleccionado o hint */}
          <div className="min-h-[48px]">
            {seleccion && hiloSeleccionado ? (
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-[8px] font-bold tracking-[0.1em] uppercase"
                    style={{ color: hiloSeleccionado.color }}
                  >
                    // {hiloCode(hiloSeleccionado.id)} · {hiloSeleccionado.name}
                  </span>
                  <span className="font-mono text-[7px] text-mn-sky uppercase font-bold tracking-widest animate-pulse">
                    Conexión Activa
                  </span>
                </div>
                <div className="font-mono text-[10px] text-mn-plum mt-2 leading-relaxed line-clamp-2">
                  {firstUnanswered ? (
                    <span>&gt; {firstUnanswered.body}</span>
                  ) : (
                    <span className="text-mn-sky italic">core synched — node sequence active.</span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-mono text-[8px] font-bold text-mn-sky tracking-[0.1em] uppercase">
                  // ACTIVE MATRIX STATUS
                </div>
                <div className="font-mono text-[9px] text-[#B0A8CC] mt-2 italic">
                  _ select any node above on the channel lines to integrate state...
                </div>
              </div>
            )}
          </div>

          {/* Sección inferior: progreso */}
          <div className="border-t border-[#EDE9F8] pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[8px] font-bold text-mn-sky tracking-[0.1em] uppercase">
                // SYNC METRIC
              </span>
              <span className="font-mono text-[9px] font-bold text-mn-plum tracking-widest">
                {nudoAnswered}/{nudoTotal} SECURED
              </span>
            </div>

            <div className="relative h-5 bg-[#FAF9FD] border border-[#DDD5EE] rounded-xl overflow-hidden flex items-center p-0.5">
              <div
                className="h-full bg-mn-plum rounded-lg transition-all duration-500"
                style={{ width: nudoTotal > 0 ? `${Math.round((nudoAnswered / nudoTotal) * 100)}%` : '0%' }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={`font-mono text-[8px] font-bold tracking-[0.1em] ${nudoAnswered / Math.max(nudoTotal, 1) > 0.55 ? 'text-white' : 'text-mn-plum'}`}>
                  {nudoTotal > 0 ? Math.round((nudoAnswered / nudoTotal) * 100) : 0}% COMPLETE
                </span>
              </div>
            </div>

            <div className="flex gap-1.5 mt-2">
              {activeNudo.preguntas.map(p => {
                const answered = !!respuestasHoyMap[p.id]
                const hiloColor = activeNudo.hilos.find(h => h.id === p.groupId)?.color ?? '#F0C030'
                return (
                  <div
                    key={p.id}
                    className="flex-1 h-1 rounded-sm transition-all"
                    style={{ backgroundColor: answered ? hiloColor : '#EDE9F8' }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {seleccion && (
        <HiloModal
          nudo={seleccion.nudo}
          hilo={seleccion.hilo}
          preguntas={seleccion.nudo.preguntas.filter(p => p.groupId === seleccion.hilo.id)}
          respuestasHoyMap={respuestasHoyMap}
          guardando={mutation.isPending}
          onGuardar={(qId, body) => mutation.mutate({ questionId: qId, body, respuestaId: respuestasHoyMap[qId]?.id })}
          open={!!seleccion}
          onClose={() => setSeleccion(null)}
        />
      )}
    </motion.div>
  )
}
