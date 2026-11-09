import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info, KeyRound } from 'lucide-react'
import type { KeyApi } from '@/services/progress'

interface Props {
  title: string
  /** Explicación que se abre al tocar la "i": para qué sirve y que se pide al sponsor */
  help: string
  /** Identifica la llave en la caché (cambia por usuario/host) */
  cacheKey: string
  api: KeyApi
  /** Consultas que se refrescan al guardar o quitar la llave (p. ej. Progreso) */
  refresh?: string[]
}

function errorMessage(e: unknown): string {
  const m = (e as { response?: { data?: { message?: string } } } | null)?.response?.data?.message
  return m ?? 'No se pudo completar, intenta de nuevo'
}

/** Campo para pegar una llave de AgnoRag. La llave se guarda cifrada en el servidor y nunca se vuelve a mostrar. */
export default function ApiKeyField({ title, help, cacheKey, api, refresh = [] }: Props) {
  const qc = useQueryClient()
  const [value, setValue] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [editing, setEditing] = useState(false)

  const info = useQuery({ queryKey: ['api-key', cacheKey], queryFn: api.get })

  const done = () => {
    setValue('')
    setEditing(false)
    qc.invalidateQueries({ queryKey: ['api-key', cacheKey] })
    refresh.forEach(k => qc.invalidateQueries({ queryKey: [k] }))
  }
  const save = useMutation({ mutationFn: () => api.set(value.trim()), onSuccess: done })
  const remove = useMutation({ mutationFn: api.remove, onSuccess: done })
  const busy = save.isPending || remove.isPending
  const error = save.error ?? remove.error

  const configured = info.data?.configured
  const showInput = !configured || editing

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <KeyRound size={12} className="text-mn-sky" />
        <h3 className="text-[8px] font-bold uppercase tracking-[.2em] text-mn-sky">// {title}</h3>
        <button
          type="button"
          onClick={() => setShowHelp(v => !v)}
          aria-label={`Qué es ${title}`}
          aria-expanded={showHelp}
          className="ml-auto text-mn-sky"
        >
          <Info size={13} />
        </button>
      </div>

      {showHelp && (
        <p className="mb-2 rounded-xl border border-dashed border-[#C4BAD8] bg-white/60 p-2.5 text-[9px] leading-normal text-[#5A4A7A]">{help}</p>
      )}

      <div className="space-y-2 rounded-2xl border border-[#DDD5EE] bg-white p-3">
        {info.isLoading ? (
          <p className="text-[9px] italic text-[#B0A8CC]">cargando…</p>
        ) : info.isError ? (
          <p className="text-[9px] text-[#E8503A]">No se pudo leer la configuración</p>
        ) : !showInput ? (
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-[#3DB86E] px-1.5 py-0.5 text-[7.5px] font-bold tracking-[0.06em] text-white">ACTIVA</span>
            <span className="flex-1 text-[9px] font-bold tracking-wider text-mn-plum">sk-••••{info.data?.last4}</span>
            <button type="button" onClick={() => setEditing(true)} className="text-[8px] font-bold uppercase tracking-widest text-mn-sky">
              Cambiar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { if (window.confirm('¿Quitar la llave? Dejarás de ver tus analíticas.')) remove.mutate() }}
              className="text-[8px] font-bold uppercase tracking-widest text-[#E8503A] disabled:opacity-40"
            >
              Quitar
            </button>
          </div>
        ) : (
          <>
            <input
              type="password"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={value}
              onChange={e => { setValue(e.target.value); save.reset() }}
              placeholder="sk-…"
              className="w-full rounded-lg border border-[#DDD5EE] bg-mn-bg px-3 py-2 text-[10px] text-mn-plum outline-none focus:border-mn-sky"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || value.trim().length < 10}
                onClick={() => save.mutate()}
                className="rounded-full bg-mn-gold px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest text-mn-plum disabled:opacity-40"
              >
                {save.isPending ? 'Verificando…' : 'Guardar'}
              </button>
              {configured && (
                <button type="button" onClick={() => { setEditing(false); setValue(''); save.reset() }} className="text-[8px] font-bold uppercase tracking-widest text-[#8878AA]">
                  Cancelar
                </button>
              )}
            </div>
            {!configured && <p className="text-[8px] leading-normal text-[#8878AA]">Pídesela a tu sponsor.</p>}
          </>
        )}
        {error && <p className="text-[9px] text-[#E8503A]">{errorMessage(error)}</p>}
      </div>
    </section>
  )
}
