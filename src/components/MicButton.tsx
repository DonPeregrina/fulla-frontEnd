/** Botón de micrófono del prototipo: círculo dorado con el micrófono oscuro; rojo con anillo mientras se graba. */
function MicIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="8" y="2" width="6" height="11" rx="3" fill={color} />
      <path d="M4 10c0 4 3 7 7 7s7-3 7-7M11 17v3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function MicButton({ recording, disabled, onPress, onRelease }: {
  recording: boolean
  disabled?: boolean
  onPress: () => void
  onRelease: () => void
}) {
  return (
    <button
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onPress() }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onContextMenu={e => e.preventDefault()}
      disabled={disabled}
      aria-label="Mantén para hablar"
      style={{ touchAction: 'none', boxShadow: recording ? '0 4px 14px #E8503A55' : '0 4px 14px #F0C03066' }}
      className={`pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
        recording ? 'mn-mic-rec bg-[#E8503A]' : 'bg-[#F0C030]'
      }`}
    >
      <MicIcon color={recording ? '#FFFFFF' : '#2D2440'} />
    </button>
  )
}
