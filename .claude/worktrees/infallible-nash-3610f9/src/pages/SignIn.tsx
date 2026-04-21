import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  identifier: z.string().min(1, 'Ingresa tu email o usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type FormData = z.infer<typeof schema>

export default function SignIn() {
  const { login, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  if (session) {
    return <Navigate to={session.role === 'HOST' ? '/host' : '/user'} replace />
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await login(data.identifier, data.password)
    } catch {
      toast.error('Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  const currentId = watch('identifier') ?? ''
  const isHost = currentId.includes('@')

  return (
    <div className="min-h-dvh bg-[#EDE9F8] flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Blobs decorativos */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#DDD5EE] opacity-60 translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#DDD5EE] opacity-50 -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="mb-10 text-center">
          <img src="/logo_png.png" alt="Fulla" className="w-20 h-20 object-contain mx-auto mb-3 drop-shadow-sm" />
          <h1 className="text-2xl font-black tracking-[0.25em] text-[#2D2440] uppercase">Fulla</h1>
          <p className="mt-1 text-[#B0A8CC] text-[9px] tracking-[.25em] uppercase font-bold">
            Hilos de hábitos
          </p>
        </div>

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
              className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3.5 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors"
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
              className="w-full bg-white border-2 border-[#DDD5EE] rounded-2xl px-4 py-3.5 text-sm text-[#2D2440] placeholder:text-[#B0A8CC] focus:outline-none focus:border-[#F0C030] transition-colors"
            />
            {errors.password && (
              <p className="text-[#E8503A] text-[10px] font-bold">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-4 rounded-2xl font-black text-[11px] tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50 shadow-[4px_4px_0px_rgba(45,36,64,0.15)]"
            style={{ backgroundColor: '#F0C030', color: '#2D2440' }}
          >
            {loading ? 'Conectando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-8 text-[#B0A8CC] text-[9px] text-center tracking-wider uppercase">
          Email → Host · Usuario → Participante
        </p>
      </div>
    </div>
  )
}
