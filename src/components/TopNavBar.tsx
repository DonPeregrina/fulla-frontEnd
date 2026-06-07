import MnesticsLogo from '@/components/MnesticsLogo'

interface TopNavBarProps {
  avatarInitial?: string
}

export default function TopNavBar({ avatarInitial }: TopNavBarProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between bg-[#1A1535] px-4 py-2.5 border-b border-[#2D2440] shadow-sm select-none"
      style={{ paddingTop: `calc(0.625rem + env(safe-area-inset-top))` }}
    >
      <div className="flex items-center gap-2">
        <MnesticsLogo size="sm" variant="reveal" />
        <span className="font-mono text-xs font-bold tracking-tight text-white lowercase">
          mnestics<span className="text-[#AADDFF]">.app</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[7.5px] font-bold text-[#5588AA] tracking-widest uppercase bg-[#2D2440]/60 px-2 py-0.5 rounded-full border border-[#5588AA]/20">
          BUILD 0607-C
        </span>
        <div className="h-7 w-7 rounded-lg border border-[#5588AA]/30 bg-[#2D2440] flex items-center justify-center overflow-hidden">
          {avatarInitial ? (
            <span className="text-[10px] font-bold text-[#AADDFF] uppercase">{avatarInitial}</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AADDFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>
      </div>
    </header>
  )
}
