import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { nodosApi } from '@/services/api'
import { dimensionColor, type Pregunta, type Nodo } from '@/types'
import { todayISO, formatDate } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(createdAt: string): boolean {
  const today = todayISO()
  const d = new Date(Number(createdAt))
  if (isNaN(d.getTime())) return false
  return d.toISOString().split('T')[0] === today
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3 px-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-[#1A1228] rounded-xl p-4 space-y-2 animate-pulse">
          <div className="h-3 w-24 bg-fulla-border rounded" />
          <div className="h-4 w-3/4 bg-fulla-border rounded" />
          <div className="h-10 w-full bg-fulla-border rounded-lg" />
        </div>
      ))}
    </div>
  )
}

// ─── Tarjeta de Pregunta ──────────────────────────────────────────────────────

function PreguntaCard({
  pregunta,
  respuesta,
  onGuardar,
  guardando,
}: {
  pregunta: Pregunta
  respuesta?: Nodo
  onGuardar: (questionId: string, body: string) => void
  guardando: boolean
}) {
  const [draft, setDraft] = useState(respuesta?.body ?? '')
  const [editando, setEditando] = useState(false)
  const respondida = !!respuesta && !editando
  const color = dimensionColor(pregunta.categoryId)

  function handleGuardar() {
    if (!draft.trim()) return
    onGuardar(pregunta.id, draft.trim())
    setEditando(false)
  }

  return (
    <div className={`bg-[#1A1228] rounded-xl p-4 space-y-3 border transition-colors ${
      respondida ? 'border-fulla-green/40' : 'border-fulla-border'
    }`}>
      <div
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
        style={{ backgroundColor: color + '22', color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        Categoría
      </div>

      <p className="text-sm font-medium text-[#EDE9F8] leading-snug">{pregunta.body}</p>

      {respondida ? (
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-fulla-green shrink-0" />
          <span className="text-sm text-fulla-muted flex-1">{respuesta.body}</span>
          <button
            onClick={() => { setDraft(respuesta.body); setEditando(true) }}
            className="text-[10px] text-fulla-muted/50 underline underline-offset-2"
          >
            editar
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGuardar()}
            placeholder="Tu respuesta…"
            className="flex-1 bg-[#2D2440] border border-fulla-border rounded-lg px-3 py-2 text-sm text-[#EDE9F8] placeholder:text-fulla-muted/40 focus:outline-none focus:border-fulla-gold transition-colors"
          />
          <button
            onClick={handleGuardar}
            disabled={!draft.trim() || guardando}
            className="px-4 py-2 bg-fulla-gold text-fulla-dark text-xs font-black tracking-wider uppercase rounded-lg disabled:opacity-40 active:scale-95 transition-all"
          >
            {guardando ? '…' : 'OK'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── HoyTab ───────────────────────────────────────────────────────────────────

export default function HoyTab() {
  const { current } = useAuth()
  const userId = current?.id
  const today = todayISO()
  const qc = useQueryClient()

  // Traemos TODAS las respuestas con preguntas anidadas
  // (el filtro por fecha del backend no funciona — filtramos localmente por createdAt)
  const { data, isLoading } = useQuery({
    queryKey: ['respuestas-all', userId],
    queryFn: () => nodosApi.list(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  })

  const mutation = useMutation({
    mutationFn: ({ questionId, body }: { questionId: string; body: string }) =>
      nodosApi.create(questionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['respuestas-all', userId] })
      toast.success('Respuesta guardada')
    },
    onError: () => toast.error('No se pudo guardar'),
  })

  const todasRespuestas: Nodo[] = data?.answers ?? []

  // Preguntas únicas del historial del usuario
  const preguntasMap: Record<string, Pregunta> = {}
  todasRespuestas.forEach(r => {
    if (r.question) preguntasMap[r.question.id] = r.question
  })
  const preguntas = Object.values(preguntasMap)

  // Respuestas de HOY (filtrando por createdAt unix ms)
  const respuestasHoy = todasRespuestas.filter(r => isToday(r.createdAt))
  const respuestasHoyMap = Object.fromEntries(respuestasHoy.map(r => [r.questionId, r]))

  const respondidas = respuestasHoy.length
  const total = preguntas.length
  const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0

  const hour = new Date().getHours()
  const turno = hour < 12 ? 'Mañana' : hour < 18 ? 'Tarde' : 'Noche'
  const nombre = current && 'username' in current ? current.username : 'tú'

  return (
    <div className="pb-4">
      <div className="px-4 pt-6 pb-4 space-y-1">
        <p className="text-fulla-muted text-xs tracking-widest uppercase">
          {turno} · {formatDate(today, 'EEEE d MMM')}
        </p>
        <h1 className="text-2xl font-black text-[#EDE9F8] tracking-tight">
          Hola, {nombre}
        </h1>

        {total > 0 && (
          <div className="pt-2 space-y-1">
            <div className="flex justify-between text-[10px] text-fulla-muted uppercase tracking-widest">
              <span>{respondidas}/{total} preguntas de hoy</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-fulla-border rounded-full overflow-hidden">
              <div
                className="h-full bg-fulla-gold rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton />
      ) : preguntas.length === 0 ? (
        <div className="px-4 pt-8 text-center space-y-2">
          <p className="text-fulla-muted text-sm">Aún no tienes preguntas asignadas.</p>
          <p className="text-fulla-muted/50 text-xs">Tu coordinador te agregará pronto.</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {preguntas.map(p => (
            <PreguntaCard
              key={p.id}
              pregunta={p}
              respuesta={respuestasHoyMap[p.id]}
              onGuardar={(qId, body) => mutation.mutate({ questionId: qId, body })}
              guardando={mutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
