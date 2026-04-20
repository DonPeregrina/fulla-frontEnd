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

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
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

  const isHostHint = (val: string) => val.includes('@')

  return (
    <div className="min-h-dvh bg-fulla-dark flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-black tracking-[0.3em] text-fulla-gold uppercase">Fulla</h1>
        <p className="mt-2 text-fulla-muted text-xs tracking-widest uppercase">
          Hilos de hábitos · Nodos de hallazgos
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold tracking-widest text-fulla-muted uppercase">
            Email o usuario
          </label>
          <input
            {...register('identifier')}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="host@fulla.io  ·  o tu usuario"
            className="w-full bg-[#1A1228] border border-fulla-border rounded-lg px-4 py-3 text-sm text-[#EDE9F8] placeholder:text-fulla-muted/50 focus:outline-none focus:border-fulla-gold transition-colors"
          />
          {errors.identifier && (
            <p className="text-red-400 text-xs">{errors.identifier.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold tracking-widest text-fulla-muted uppercase">
            Contraseña
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            className="w-full bg-[#1A1228] border border-fulla-border rounded-lg px-4 py-3 text-sm text-[#EDE9F8] placeholder:text-fulla-muted/50 focus:outline-none focus:border-fulla-gold transition-colors"
          />
          {errors.password && (
            <p className="text-red-400 text-xs">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-fulla-gold text-fulla-dark font-black text-sm tracking-widest uppercase rounded-lg py-4 mt-2 disabled:opacity-50 active:scale-95 transition-all"
        >
          {loading ? '...' : 'Entrar'}
        </button>
      </form>

      {/* Hint de rol */}
      <p className="mt-8 text-fulla-muted/60 text-xs text-center">
        Email → acceso Host · Usuario → acceso participante
      </p>
    </div>
  )
}
