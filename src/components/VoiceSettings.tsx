import { Mic } from 'lucide-react'
import { ENGINES } from '@/lib/voice/engines'
import { useVoiceSettings, type VoiceOut } from '@/lib/voice/settings'
import TestModeSwitch from '@/components/TestModeSwitch'

const VOICES: { id: VoiceOut; label: string; hint: string }[] = [
  { id: 'elevenlabs', label: 'ElevenLabs', hint: 'Voz natural (usa la nube)' },
  { id: 'browser', label: 'Navegador', hint: 'Voz del dispositivo, gratis' },
]

function Option({ active, disabled, label, hint, onClick }: {
  active: boolean; disabled?: boolean; label: string; hint: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="radio"
      aria-checked={active}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-35 ${active ? 'bg-[#EDE9F8]' : ''}`}
    >
      <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${active ? 'border-[#1A1535] bg-[#F0C030]' : 'border-[#C4BAD8] bg-white'}`} />
      <span className="flex-1 text-[9px] font-bold uppercase tracking-widest text-mn-plum">
        {label}
        <span className="block mt-0.5 normal-case tracking-normal font-normal text-[#B0A8CC]">{hint}</span>
      </span>
    </button>
  )
}

/** Sección de Perfil: todo lo configurable del asistente de voz en un solo lugar. */
export default function VoiceSettings() {
  const { engineId, voiceOut, setEngineId, setVoiceOut } = useVoiceSettings()

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Mic size={12} className="text-mn-sky" />
        <h3 className="text-[8px] font-bold uppercase tracking-[.2em] text-mn-sky">// Asistente de voz</h3>
      </div>

      <div className="bg-white rounded-2xl border border-[#DDD5EE] divide-y divide-[#DDD5EE] overflow-hidden">
        <p className="px-4 pt-3 pb-1 font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-mn-sky">Dictado</p>
        <div role="radiogroup" aria-label="Motor de dictado" className="divide-y divide-[#F1EDF9]">
          {ENGINES.map(e => (
            <Option
              key={e.id}
              active={engineId === e.id}
              disabled={!e.supported()}
              label={`${e.label}${e.live ? ' · en vivo' : ''}`}
              hint={e.supported() ? e.hint : 'No disponible en este dispositivo'}
              onClick={() => setEngineId(e.id)}
            />
          ))}
        </div>

        <p className="px-4 pt-3 pb-1 font-mono text-[8px] font-bold tracking-[0.12em] uppercase text-mn-sky">Voz del asistente</p>
        <div role="radiogroup" aria-label="Voz del asistente" className="divide-y divide-[#F1EDF9]">
          {VOICES.map(v => (
            <Option key={v.id} active={voiceOut === v.id} label={v.label} hint={v.hint} onClick={() => setVoiceOut(v.id)} />
          ))}
        </div>

        <TestModeSwitch />
      </div>
    </section>
  )
}
