import { FlaskConical } from 'lucide-react'
import { setTestMode, useTestMode } from '@/lib/voice/testMode'

/** Renglón de Perfil: enciende el modo pruebas del asistente de voz (no guarda respuestas). */
export default function TestModeSwitch() {
  const on = useTestMode()
  return (
    <button
      onClick={() => setTestMode(!on)}
      role="switch"
      aria-checked={on}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[9px] font-bold uppercase tracking-widest text-mn-plum"
    >
      <FlaskConical size={16} className="text-mn-sky" />
      <span className="flex-1">
        Modo pruebas del asistente
        <span className="block mt-0.5 normal-case tracking-normal font-normal text-[#B0A8CC]">
          {on ? 'Encendido: no guarda tus respuestas' : 'Apagado: guarda tus respuestas'}
        </span>
      </span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-[#F0C030]' : 'bg-[#DDD5EE]'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}
