import { motion } from 'motion/react'

interface MnesticsLogoProps {
  variant?: 'calm' | 'reveal' | 'minimal'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_MAP = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
}

export default function MnesticsLogo({ variant = 'reveal', size = 'md', className = '' }: MnesticsLogoProps) {
  const isMinimal = variant === 'minimal'

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${SIZE_MAP[size]} ${className}`}>
      {!isMinimal && (
        <div className="absolute inset-0 rounded-[28%] bg-[#1A1535] overflow-hidden shadow-md flex items-center justify-center">
          {/* Grid sutil interior */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(240,192,48,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(240,192,48,0.15)_1px,transparent_1px)] bg-[size:8px_8px]" />

          {/* Partículas flotantes (solo en reveal) */}
          {variant === 'reveal' && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0.6 }}
              animate={{ opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {[...Array(16)].map((_, i) => {
                const sz = i % 2 === 0 ? 4 : 2
                const right = (i * 7) % 85
                const top = (i * 11) % 85
                const colors = ['#AADDFF', '#5588AA', '#F0C030']
                const color = colors[i % colors.length]
                return (
                  <motion.div
                    key={i}
                    className="absolute rounded-[1px]"
                    style={{ width: sz, height: sz, backgroundColor: color, right: `${right}%`, top: `${top}%` }}
                    animate={{ opacity: [0.1, 0.9, 0.1], scale: [1, 1.3, 1] }}
                    transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  />
                )
              })}
            </motion.div>
          )}
        </div>
      )}

      {/* Símbolo Mu estilizado — proporciones tipográficas griegas */}
      <svg
        viewBox="0 0 100 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative z-10 ${isMinimal ? 'h-full w-full' : 'h-[68%] w-[68%]'}`}
      >
        {/* Pata izquierda — vertical con serifas */}
        <line x1="26" y1="22" x2="26" y2="72" stroke="#F0C030" strokeWidth="9" strokeLinecap="round" />

        {/* Arco central — curva elegante que sube al centro y baja */}
        <path
          d="M 26,72 C 26,84 34,90 43,88 C 52,86 55,78 55,68 L 55,52"
          stroke="#F0C030"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Pata derecha — vertical limpia */}
        <line x1="55" y1="22" x2="55" y2="52" stroke="#F0C030" strokeWidth="9" strokeLinecap="round" />

        {/* Extensión derecha ascendente (cola del mu) */}
        <path
          d="M 55,52 C 55,36 62,24 74,24 C 80,24 84,28 84,34 L 84,72"
          stroke="#F0C030"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Serif / punto base izquierdo — signo de memoria */}
        <circle cx="26" cy="88" r="5.5" fill="#F0C030" />

        {/* Punto derecho — conector de datos (solo en reveal) */}
        {variant === 'reveal' && (
          <circle cx="84" cy="88" r="3.5" fill="#AADDFF" className="animate-pulse" />
        )}
      </svg>
    </div>
  )
}
