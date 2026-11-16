import { useId, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { invitacionesApi } from '@/services/api'
import MnesticsLogo from '@/components/MnesticsLogo'

// Pantalla a la que llega quien recibe una invitación por correo (/invites/accept?id=…): elige su usuario y su
// contraseña, se crea la cuenta (con el correo y el host de la invitación) y entra directo.

const schema = z
  .object({
    // Sin "@": el inicio de sesión trata como correo de host todo lo que lleve arroba
    username: z
      .string()
      .trim()
      .min(3, 'Mínimo 3 caracteres')
      .max(30, 'Máximo 30 caracteres')
      .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo'),
    name: z.string().trim().max(60, 'Máximo 60 caracteres').optional(),
    // bcrypt ignora lo que pase de 72 bytes
    password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
    confirm: z.string(),
  })
  .refine(d => d.password === d.confirm, { message: 'Las contraseñas no coinciden', path: ['confirm'] })

type FormData = z.infer<typeof schema>

/** Traduce los errores del backend (a veces llegan como texto de Prisma) a algo que una persona entienda */
function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : ''
  const low = msg.toLowerCase()
  if (low.includes('already used')) return 'Esta invitación ya se usó. Si ya creaste tu cuenta, inicia sesión.'
  if (low.includes('unique constraint')) {
    if (low.includes('username')) return 'Ese usuario ya existe, elige otro.'
    if (low.includes('email')) return 'Ya existe una cuenta con el correo de esta invitación. Inicia sesión.'
    return 'Ya existe una cuenta con esos datos.'
  }
  if (low.includes('connection pool') || low.includes('timed out') || (err as { isAxiosError?: boolean })?.isAxiosError) {
    return 'El sistema está despertando. Espera un minuto e inténtalo de nuevo.'
  }
  return 'No se pudo crear la cuenta. Inténtalo de nuevo.'
}

const INPUT =
  'w-full bg-mn-bg/30 border border-[#DDD5EE] rounded-2xl px-4 py-3 text-sm text-mn-plum placeholder:text-[#B0A8CC] focus:outline-none focus:border-mn-gold transition-colors disabled:opacity-50 font-mono'
const LABEL = 'text-[8px] font-bold tracking-[0.2em] text-mn-sky uppercase ml-1'
const ERROR = 'text-[#E8503A] text-[9px] font-bold uppercase tracking-wide'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-mn-bg flex flex-col items-center justify-center px-6 py-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#DDD5EE] opacity-40 translate-x-1/3 -translate-y-1/3 pointer-events-none blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#DDD5EE] opacity-30 -translate-x-1/3 translate-y-1/3 pointer-events-none blur-2xl" />
      <div className="w-full max-w-sm relative z-10">
        <div className="mb-8 text-center">
          <MnesticsLogo size="xl" variant="reveal" className="mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-2xl font-bold tracking-tight text-mn-plum lowercase">
            mnestics<span className="text-mn-sky">.app</span>
          </h1>
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-mn-sky mt-1.5">
            Invitación <span className="text-mn-gold">•</span> crea tu cuenta
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const inviteId = params.get('id')?.trim() ?? ''
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // El Shell de la app monta el contenido dos veces (marco de escritorio y vista de celular): los ids deben ser únicos por copia
  const uid = useId()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setFormError(null)
    setLoading(true)
    try {
      try {
        const res = await invitacionesApi.accept(inviteId, {
          username: data.username,
          password: data.password,
          ...(data.name ? { name: data.name } : {}),
        })
        // El backend responde user: null cuando el id no corresponde a ninguna invitación
        if (!res.acceptInvite.user) {
          setFormError('Esta invitación no es válida. Pídele a quien te invitó que te mande otra.')
          return
        }
      } catch (err) {
        setFormError(describeError(err))
        return
      }

      // Cuenta creada: se entra directo; si eso falla, la cuenta ya existe y basta con iniciar sesión
      try {
        await login(data.username, data.password)
        toast.success('Cuenta creada. ¡Bienvenido!')
        navigate('/user', { replace: true })
      } catch {
        toast.success('Cuenta creada. Inicia sesión con tu usuario.')
        navigate('/signin', { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }

  if (!inviteId) {
    return (
      <Frame>
        <div className="rounded-3xl border border-[#DDD5EE] bg-white shadow-sm p-5 text-center space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-mn-plum">Enlace incompleto</p>
          <p className="text-[11px] leading-relaxed text-[#5A4A7A]">
            Este enlace no trae el código de la invitación. Abre el enlace completo del correo o pídele a quien te invitó que te
            mande otro.
          </p>
          <Link to="/signin" className="inline-block text-[9px] font-bold uppercase tracking-widest text-mn-sky underline underline-offset-2">
            Ir a iniciar sesión
          </Link>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <div className="rounded-3xl border border-[#DDD5EE] bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-[#1A1535]/5 border-b border-[#DDD5EE]/50 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-mn-gold" />
          <span className="text-[9px] font-bold tracking-[0.15em] text-mn-plum uppercase">Crear tu cuenta</span>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-username`} className={LABEL}>Usuario</label>
            <input
              id={`${uid}-username`}
              {...register('username')}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="con este entrarás"
              disabled={loading}
              className={INPUT}
            />
            {errors.username && <p className={ERROR}>{errors.username.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-name`} className={LABEL}>Nombre (opcional)</label>
            <input
              id={`${uid}-name`}
              {...register('name')}
              autoComplete="name"
              placeholder="cómo te llamamos"
              disabled={loading}
              className={INPUT}
            />
            {errors.name && <p className={ERROR}>{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-password`} className={LABEL}>Contraseña</label>
            <input
              id={`${uid}-password`}
              {...register('password')}
              type="password"
              autoComplete="new-password"
              placeholder="mínimo 8 caracteres"
              disabled={loading}
              className={INPUT}
            />
            {errors.password && <p className={ERROR}>{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${uid}-confirm`} className={LABEL}>Repite la contraseña</label>
            <input
              id={`${uid}-confirm`}
              {...register('confirm')}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={loading}
              className={INPUT}
            />
            {errors.confirm && <p className={ERROR}>{errors.confirm.message}</p>}
          </div>

          {formError && (
            <div role="alert" className="rounded-2xl border border-[#E8503A]/40 bg-[#E8503A]/10 px-4 py-3 text-[10px] leading-snug font-bold text-[#C23A26]">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-[10px] tracking-[0.2em] uppercase transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#1A1535', color: '#F0C030' }}
          >
            {loading ? 'CREANDO…' : 'CREAR MI CUENTA'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-[8px] text-mn-sky text-center tracking-wider uppercase">
        ¿Ya tienes cuenta?{' '}
        <Link to="/signin" className="underline underline-offset-2">Inicia sesión</Link>
      </p>
    </Frame>
  )
}
