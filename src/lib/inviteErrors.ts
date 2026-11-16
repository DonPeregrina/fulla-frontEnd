// Mensajes del backend de invitaciones y cuentas que ya vienen en español y se pueden mostrar tal cual.
// Cualquier otro error (texto de Prisma, red, etc.) se sustituye por un mensaje genérico.
const KNOWN = [
  'Ya existe una cuenta con ese correo',
  'Ya hay una invitación pendiente para ese correo',
  'Correo no válido',
  'Ya existe una cuenta con el correo de esta invitación',
  'Ese usuario ya existe',
  'Usuario no válido',
  'La contraseña debe tener',
]

/** El mensaje del backend si es uno de los conocidos; si no, null */
export function backendMessage(err: unknown): string | null {
  const msg = err instanceof Error ? err.message.trim() : ''
  return KNOWN.some(k => msg.startsWith(k)) ? msg : null
}

export const inviteSendError = (err: unknown) => backendMessage(err) ?? 'No se pudo enviar la invitación'
