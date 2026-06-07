import { useState, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { healthApi } from '@/services/api'
import MnesticsLogo from '@/components/MnesticsLogo'

const schema = z.object({
  identifier: z.string().min(1, 'Ingresa tu email o usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

const WAKE_ESTIMATE_S = 75
const POLL_INTERVAL_MS = 8000

type SystemState = 'checking' | 'sleeping' | 'waking' | 'awake'

// ─── Banner de estado del sistema ─────────────────────────────────────────────

function SystemBanner({ state, countdown, onWake, wasAwakeOnMount }: {
  state: SystemState
  countdown: number
  onWake: () => void
  wasAwakeOnMount: boolean
}) {
  if (state === 'checking') {
    return (
      <div className="mb-5 flex items-center justify-center gap-2 text-[#5588AA]">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Verificando sistema…</span>
      </div>
    )
  }

  if (state === 'sleeping') {
    return (
      <div className="mb-5 rounded-2xl border border-[#5588AA]/30 bg-[#1A1535] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[#F0C030] shrink-0" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white">Sistema en reposo</p>
            <p className="text-[8px] text-[#5588AA] mt-0.5">El servidor está apagado. Dale un toque para despertarlo.</p>
          </div>
        </div>
        <button
          onClick={onWake}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[9px] tracking-[0.2em] uppercase transition-all active:scale-95"
          style={{ backgroundColor: '#F0C030', color: '#1A1535' }}
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
      <div className="mb-5 rounded-2xl border border-[#5588AA]/30 bg-[#1A1535] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-[#AADDFF] animate-spin shrink-0" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white">Despertando sistema…</p>
            <p className="text-[8px] text-[#5588AA] mt-0.5">
              {countdown > 0 ? `~${countdown}s restantes · hasta un minuto` : 'Tomó más de lo esperado, sigue intentando…'}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-1.5 bg-[#2D2440] rounded-full overflow-hidden">
            <div className="h-full bg-[#F0C030] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[7px] font-bold text-[#5588AA] uppercase tracking-widest">
            <span>Iniciando</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'awake' && !wasAwakeOnMount) {
    return (
      <div className="mb-5 flex items-center justify-center gap-2 text-[#10b981]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Sistema activo · ya puedes entrar</span>
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

  useEffect(() => {
    let cancelled = false
    healthApi.ping().then(result => {
      if (cancelled) return
      if (result === 'awake') { setWasAwakeOnMount(true); setSystemState('awake') }
      else setSystemState('sleeping')
    })
    return () => { cancelled = true }
  }, [])

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
    countdownRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    pollRef.current = setInterval(async () => {
      const result = await healthApi.ping()
      if (result === 'awake') {
        clearInterval(pollRef.current!); clearInterval(countdownRef.current!)
        setSystemState('awake'); setWasAwakeOnMount(false)
      }
    }, POLL_INTERVAL_MS)
  }

  if (session) return <Navigate to={session.role === 'HOST' ? '/host' : '/user'} replace />

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await login(data.identifier, data.password)
    } catch (err: any) {
      if (err?.code === 'SLEEPING') startWaking()
      else toast.error('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  const currentId = watch('identifier') ?? ''
  const isHost = currentId.includes('@')
  const formDisabled = loading || systemState === 'checking' || systemState === 'waking'

  return (
    <div className="min-h-dvh bg-mn-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#DDD5EE] opacity-40 translate-x-1/3 -translate-y-1/3 pointer-events-none blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#DDD5EE] opacity-30 -translate-x-1/3 translate-y-1/3 pointer-events-none blur-2xl" />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo + wordmark */}
        <div className="mb-8 text-center">
          <MnesticsLogo size="xl" variant="reveal" className="mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-2xl font-bold tracking-tight text-mn-plum lowercase">
            mnestics<span className="text-mn-sky">.app</span>
          </h1>
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-mn-sky mt-1.5">
            Stable memory core <span className="text-mn-gold">•</span> dynamic reveal
          </p>
        </div>

        {/* Banner de estado */}
        <SystemBanner state={systemState} countdown={countdown} onWake={startWaking} wasAwakeOnMount={wasAwakeOnMount} />

        {/* Role hint */}
        {currentId.length > 0 && (
          <div
            className="mb-4 px-3 py-2 rounded-xl border text-[8px] font-bold uppercase tracking-[0.2em] text-center transition-all"
            style={{
              backgroundColor: isHost ? '#1A153522' : '#F0C03022',
              borderColor: isHost ? '#1A1535' : '#F0C030',
              color: isHost ? '#1A1535' : '#5A4A7A',
            }}
          >
            {isHost ? '// Acceso Host' : '// Acceso Participante'}
          </div>
        )}

        {/* Card form */}
        <div className="rounded-3xl border border-[#DDD5EE] bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-[#1A1535]/5 border-b border-[#DDD5EE]/50 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-mn-gold" />
            <span className="text-[9px] font-bold tracking-[0.15em] text-mn-plum uppercase">Access Core Memory</span>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[8px] font-bold tracking-[0.2em] text-mn-sky uppercase ml-1">Core Identifier</label>
              <input
                {...register('identifier')}
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                placeholder="email o usuario"
                disabled={formDisabled}
                className="w-full bg-mn-bg/30 border border-[#DDD5EE] rounded-2xl px-4 py-3 text-sm text-mn-plum placeholder:text-[#B0A8CC] focus:outline-none focus:border-mn-gold transition-colors disabled:opacity-50 font-mono"
              />
              {errors.identifier && <p className="text-[#E8503A] text-[9px] font-bold uppercase tracking-wide">{errors.identifier.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-[8px] font-bold tracking-[0.2em] text-mn-sky uppercase ml-1">Access Key</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={formDisabled}
                className="w-full bg-mn-bg/30 border border-[#DDD5EE] rounded-2xl px-4 py-3 text-sm text-mn-plum placeholder:text-[#B0A8CC] focus:outline-none focus:border-mn-gold transition-colors disabled:opacity-50 font-mono"
              />
              {errors.password && <p className="text-[#E8503A] text-[9px] font-bold uppercase tracking-wide">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={formDisabled}
              className="w-full py-3.5 rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1A1535', color: '#F0C030' }}
            >
              {loading ? 'SYNCING…' : systemState === 'waking' ? 'ESPERANDO SISTEMA…' : 'INITIATE CORE'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-[8px] text-mn-sky text-center tracking-wider uppercase">
          Email → Host · Usuario → Participante
        </p>
      </div>
    </div>
  )
}
