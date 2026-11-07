import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, Send, CheckCircle2 } from 'lucide-react'
import ArchiveGallery from '@/components/ArchiveGallery'
import FoodCard from '@/components/FoodCard'
import MicButton from '@/components/MicButton'
import VoiceOrb from '@/components/VoiceOrb'
import { ENGINES } from '@/lib/voice/engines'
import { useAssistant, type Status } from '@/lib/voice/useAssistant'
import { useArchiveImages } from '@/lib/voice/useArchive'
import { useAuth } from '@/contexts/AuthContext'

const STATUS_LABEL: Record<Status, string> = {
  idle: 'mantén para hablar',
  listening: 'escuchando…',
  thinking: 'pensando…',
  speaking: 'hablando… (toca para interrumpir)',
}

const AGENT_STATE: Record<Status, string> = {
  idle: 'EN LÍNEA',
  listening: 'ESCUCHANDO',
  thinking: 'PENSANDO',
  speaking: 'HABLANDO',
}

export default function AsistenteTab() {
  const a = useAssistant()
  const { current } = useAuth()
  const archivadas = useArchiveImages(current?.id).length
  const [view, setView] = useState<'chat' | 'archivo'>('chat')
  const [typed, setTyped] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [a.lines, a.partial, a.moments, a.status])

  // La tarjeta más reciente de cada momento del día es la vigente; las anteriores quedan como miniatura
  const lastCardOfMoment: Record<string, number> = {}
  a.lines.forEach(l => { if (l.who === 'card' && l.moment) lastCardOfMoment[l.moment] = l.id })

  return (
    <div className="flex flex-col min-h-full bg-mn-bg pb-56 px-4 pt-3 gap-3 select-none">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] font-bold text-mn-sky tracking-[0.1em] uppercase">
          // Asistente de voz
          {a.testMode && <span className="ml-2 rounded-full bg-[#E8503A] px-2 py-0.5 text-[8px] text-white">Modo pruebas</span>}
        </span>
        {a.started && (
          <button onClick={a.reset} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-mn-plum">
            <RotateCcw size={12} /> Reiniciar
          </button>
        )}
      </div>

      {/* Los ajustes (dictado, voz, modo pruebas) viven en Perfil */}
      <p className="font-mono text-[8px] tracking-[0.06em] text-[#B0A8CC]">
        Dictado: {ENGINES.find(e => e.id === a.engineId)?.label} · Voz: {a.voiceOut === 'elevenlabs' ? 'ElevenLabs' : 'Navegador'} ·{' '}
        <Link to="/user/perfil" className="font-bold text-mn-sky underline">cambiar en Perfil</Link>
      </p>

      <div className="flex gap-1 rounded-xl bg-[#E3DCF2] p-1" role="tablist" aria-label="Vista del asistente">
        {([['chat', 'Chat'], ['archivo', `Archivo${archivadas ? ` · ${archivadas}` : ''}`]] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`flex-1 rounded-lg py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition-colors ${view === id ? 'bg-white text-mn-plum shadow-sm' : 'text-[#8878AA]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'archivo' ? (
        <ArchiveGallery />
      ) : !a.started ? (
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <div className="pt-4"><VoiceOrb status="idle" size={96} /></div>
          <div className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[#B0A8CC]">// AGENTE_μ · EN LÍNEA</div>
          <div className="max-w-[270px] rounded-[14px] rounded-tl-[3px] border border-[#DDD5EE] bg-white px-3 py-2.5 text-left text-[11px] leading-relaxed text-[#5A4A7A]">
            Hola. Soy tu agente de memoria. <b className="text-[#2D2440]">Te preguntaré en qué momento del día estás</b> y luego tus preguntas, una por una. Responde hablando.
          </div>
          <button
            onClick={() => void a.begin()}
            className="px-8 py-4 rounded-2xl bg-[#F0C030] text-[#1A1535] text-[10px] font-bold uppercase tracking-[0.2em] active:scale-95 transition-transform"
          >
            Empezar
          </button>
        </div>
      ) : (
        <>
          {/* Estado del agente: siempre visible arriba mientras se desplaza el chat */}
          <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 border-b border-[#E3DCF2] bg-mn-bg/95 px-4 py-2 backdrop-blur">
            <VoiceOrb status={a.status} size={52} />
            <div className="font-mono">
              <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#B0A8CC]">// AGENTE_μ</div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-mn-plum">
                <span className={`h-1.5 w-1.5 rounded-full ${a.status === 'idle' ? 'bg-[#3DB86E]' : a.status === 'listening' ? 'bg-[#E8503A]' : 'bg-[#F0C030]'} animate-pulse`} />
                {AGENT_STATE[a.status]}
              </div>
            </div>
          </div>

          {/* Conversación */}
          <div className="flex flex-col gap-2">
            {a.lines.map(l => {
              if (l.who === 'card') {
                const isLatest = lastCardOfMoment[l.moment!] === l.id
                const active = isLatest && a.question?.id === l.questionId
                return (
                  <FoodCard
                    key={l.id}
                    moment={l.moment!}
                    questionId={l.questionId!}
                    data={a.moments[l.moment!]}
                    live={active ? a.partial : ''}
                    active={active}
                    listening={a.status === 'listening'}
                    compact={!isLatest}
                  />
                )
              }
              return (
                <div
                  key={l.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed ${
                    l.who === 'yo'
                      ? 'self-end bg-[#1A1535] text-white'
                      : 'self-start bg-white border border-[#DDD5EE] text-mn-plum'
                  }`}
                >
                  {l.text}
                </div>
              )
            })}
            {a.partial && !a.question?.imagen && (
              <div className="self-end max-w-[85%] rounded-2xl px-4 py-3 text-[12px] italic bg-[#EDE9F8] text-mn-plum">
                {a.partial}…
              </div>
            )}
            {/* El margen deja el final del chat por encima del micrófono fijo; sin él el texto en vivo quedaba tapado */}
            <div ref={endRef} className="scroll-mb-64" />
          </div>

          {a.savedCount > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              <CheckCircle2 size={14} /> {a.savedCount} {a.savedCount === 1 ? 'respuesta guardada' : 'respuestas guardadas'}
            </div>
          )}

          {a.done ? (
            <div className="text-center py-4">
              <p className="text-[11px] text-mn-plum mb-3">Sesión terminada.</p>
              <button onClick={a.reset} className="px-6 py-3 rounded-2xl bg-[#1A1535] text-[#F0C030] text-[9px] font-bold uppercase tracking-widest">
                Nueva sesión
              </button>
            </div>
          ) : (
            <div className="pointer-events-none fixed inset-x-0 bottom-[72px] z-40 flex flex-col items-center gap-1.5 bg-gradient-to-t from-mn-bg via-mn-bg/95 to-transparent px-4 pb-2 pt-4">
              <MicButton
                recording={a.status === 'listening'}
                disabled={a.status === 'thinking'}
                onPress={() => void a.pressStart()}
                onRelease={a.pressEnd}
              />
              <span className="font-mono text-[9px] font-bold tracking-[0.08em] text-[#8878AA]">{STATUS_LABEL[a.status]}</span>
              <form
                className="pointer-events-auto flex w-full max-w-sm gap-2"
                onSubmit={e => { e.preventDefault(); a.sendText(typed); setTyped('') }}
              >
                <input
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  placeholder="o escribe tu respuesta…"
                  className="flex-1 rounded-xl border border-[#DDD5EE] bg-white px-3 py-2 text-[12px] text-mn-plum focus:outline-none focus:border-[#F0C030]"
                />
                <button type="submit" disabled={!typed.trim() || a.status !== 'idle'} className="rounded-xl bg-[#1A1535] px-3 text-[#F0C030] disabled:opacity-35">
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}
