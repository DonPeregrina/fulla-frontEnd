import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { healthApi } from '@/services/api'

const schema = z.object({
  identifier: z.string().min(1, 'Ingresa tu email o usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

// Tiempo estimado de arranque de Azure App Service en segundos
const WAKE_ESTIMATE_S = 75
const POLL_INTERVAL_MS = 8000

type SystemState = 'checking' | 'sleeping' | 'waking' | 'awake'

// ─── Banner de estado del sistema ─────────────────────────────────────────────

function SystemBanner({
  state,
  countdown,
  onWake,
  wasAwakeOnMount,
}: {
  state: SystemState
  countdown: number
  onWake: () => void
  wasAwakeOnMount: boolean
}) {
  if (state === 'checking') {
    return (
      <div className="mb-5 flex items-center justify-center gap-2 text-[#B0A8CC]">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-[9px] font-bold uppercase tracking-widest">Verificando sistema…</span>
      </div>
    )
  }

  if (state === 'sleeping') {
    return (
      <div className="mb-5 rounded-2xl border-2 border-[#DDD5EE] bg-white/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[#F0C030] shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2D2440]">Sistema en reposo</p>
            <p className="text-[9px] text-[#B0A8CC] mt-0.5">El servidor está apagado. Dale un toque para despertarlo.</p>
          </div>
        </div>
        <button
          onClick={onWake}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] tracking-widest uppercase transition-all active:scale-95"
          style={{ backgroundColor: '#2D2440', color: '#F0C030' }}
        >
          <Zap className="h-3.5 w-3.5" />
          Despertar sistema
        </button>
      </div>
    )
  }

  if (state === 'waking') {
    const pct = Math.max(0, Math.round(((WAKE_ESTIMATE_S - countdown) / WAKE_ESTIMATE_S) * 100))
    return (
      <div className="mb-5 rounded-2xl border-2 border-[#DDD5EE] bg-white/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-[#2D2440] animate-spin shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#2D2440]">Despertando sistema…</p>
            <p className="text-[9px] text-[#B0A8CC] mt-0.5">
              {countdown > 0 ? `~${countdown}s restantes · esto puede tomar hasta un minuto` : 'Tomó más de lo esperado, sigue intentando…'}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 bg-[#DDD5EE] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F0C030] rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-bold text-[#B0A8CC] uppercase tracking-widest">
            <span>Iniciando</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>
    )
  }

  // Solo mostrar "activo" si el sistema estuvo dormido y se despertó durante esta sesión
  if (state === 'awake' && !wasAwakeOnMount) {
    return (
      <div className="mb-5 flex items-center justify-center gap-2 text-[#10b981]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="text-[9px] font-bold uppercase tracking-widest">Sistema activo · ya puedes entrar</span>
      </div>
    )
  }

  return null
}

// ─── SignIn ───────────────────────────────────────────────────────────────────

export default function SignIn() {
  const { login, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [systemState, setSystemState] = useState<SystemState>('checking')
  const [countdown, setCountdown] = useState(WAKE_ESTIMATE_S)
  const [wasAwakeOnMount, setWasAwakeOnMount] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // ── Ping en mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    healthApi.ping().then(result => {
      if (cancelled) return
      if (result === 'awake') {
        setWasAwakeOnMount(true)
        setSystemState('awake')
      } else {
        setSystemState('sleeping')
      }
    })
    return () => { cancelled = true }
  }, [])

  // No hay banner cuando el sistema ya estaba activo al cargar — wasAwakeOnMount
  // se pasa al SystemBanner para suprimir el verde en ese caso

  // ── Limpiar timers al desmontar ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [])

  function startWaking() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    setSystemState('waking')
    setCountdown(WAKE_ESTIMATE_S)

    // Countdown visual cada segundo
    countdownRef.current = setInterval(() => {
      setCountdown(c => Math.max(0, c - 1))
    }, 1000)

    // Polling real cada POLL_INTERVAL_MS
    pollRef.current = setInterval(async () => {
      const result = await healthApi.ping()
      if (result === 'awake') {
        clearInterval(pollRef.current!)
        clearInterval(countdownRef.current!)
        setSystemState('awake')
        setWasAwakeOnMount(false) // que muestre el banner verde
      }
    }, POLL_INTERVAL_MS)
  }

  if (session) {
    return <Navigate to={session.role === 'HOST' ? '/host' : '/user'} replace />
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await login(data.identifier, data.password)
    } catch (err: any) {
      if (err?.code === 'SLEEPING') {
        // El servidor respondió con error de red → iniciar flujo de wake-up
        startWaking()
      } else {
        toast.error('Credenciales incorrectas')
      }
    } finally {
      setLoading(false)
    }
  }

  const currentId = watch('identifier') ?? ''
  const isHost = currentId.includes('@')
  const formDisabled = loading || systemState === 'checking' || systemState === 'waking'

  return (
    <div className="min-h-dvh bg-[#EDE9F8] flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Blobs decorativos */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#DDD5EE] opacity-60 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#DDD5EE] opacity-50 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-[0.3em] text-[#2D2440] uppercase leading-none translate-x-[14px]">Fulla</h1>
          <img src="/logo_png.png" alt="Fulla" className="w-52 h-52 object-contain mx-auto -mt-2 drop-shadow-sm" />
          <p className="-mt-[4px] text-[#B0A8CC] text-[9px] tracking-[.25em] uppercase font-bold">
            Hilos de hábitos
          </p>
        </div>

        {/* Banner de estado del sistema */}
        <SystemBanner
          state={systemState}
          countdown={countdown}
          onWake={startWaking}
          wasAwakeOnMount={wasAwakeOnMount}
        />

        {/* Role hint */}
        {currentId.length > 0 && (
          <div
            className="mb-4 px-3 py-2 rounded-xl border text-[9px] font-bold uppercase tracking-widest text-center transition-all"
            style={{
              backgroundColor: isHost ? '#2D244022' : '#F0C03022',
              borderColor: isHost ? '#2D2440' : '#F0C030',
              color: isHost ? '#2D2440' : '#5A4A7A',
            }}
          >
            {isHost ? '🔑 Acceso Host' : '👤 Acceso Participante'}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold tracking-[.2em] text-[#5A4A7A] uppercase">
              Email o usuario
            </label>
            <input
              {...register('identifier')}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="tu@email.com  ·  o tu usuario"
              disabled={formDisabled}
              className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3.5 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors disabled:opacity-50"
            />
            {errors.identifier && (
              <p className="text-[#E8503A] text-[10px] font-bold">{errors.identifier.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-bold tracking-[.2em] text-[#5A4A7A] uppercase">
              Contraseña
            </label>
            <input
              {...register('password')}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={formDisabled}
              className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3.5 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors disabled:opacity-50"
            />
            {errors.password && (
              <p className="text-[#E8503A] text-[10px] font-bold">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={formDisabled}
            className="w-full mt-2 py-4 rounded-2xl font-black text-[11px] tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50 shadow-[4px_4px_0px_rgba(45,36,64,0.15)]"
            style={{ backgroundColor: '#F0C030', color: '#2D2440' }}
          >
            {loading ? 'Conectando…' : systemState === 'waking' ? 'Esperando sistema…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-8 text-[#B0A8CC] text-[9px] text-center tracking-wider uppercase">
          Email → Host · Usuario → Participante
        </p>
      </div>
    </div>
  )
}
