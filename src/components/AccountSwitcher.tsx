import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Role } from '@/types'

const MODE_NAME: Record<Role, string> = { HOST: 'modo host', USER: 'modo participante' }

/**
 * Cambio de cuenta sin volver a escribir credenciales (se guarda el token de cada cuenta, no la contraseña).
 * - Si la otra cuenta ya está guardada en este dispositivo: "Cambiar a …".
 * - Si no: "Agregar otra cuenta" lleva al inicio de sesión sin cerrar la actual.
 */
export default function AccountSwitcher({ className = '' }: { className?: string }) {
  const { session, accounts, switchRole } = useAuth()
  const navigate = useNavigate()
  if (!session) return null

  const other: Role = session.role === 'HOST' ? 'USER' : 'HOST'
  const saved = accounts[other]

  return saved ? (
    <button
      onClick={() => switchRole(other)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-[9px] font-bold uppercase tracking-widest text-mn-plum ${className}`}
    >
      <ArrowRightLeft size={16} className="text-mn-sky" />
      <span className="flex-1">
        Cambiar a {MODE_NAME[other]}
        {saved.label && <span className="ml-2 normal-case tracking-normal text-[#B0A8CC]">{saved.label}</span>}
      </span>
    </button>
  ) : (
    <button
      onClick={() => navigate('/signin?agregar=1')}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-[9px] font-bold uppercase tracking-widest text-mn-plum ${className}`}
    >
      <UserPlus size={16} className="text-mn-sky" />
      Agregar otra cuenta
    </button>
  )
}
