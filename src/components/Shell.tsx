interface ShellProps {
  children: React.ReactNode
}

export default function Shell({ children }: ShellProps) {
  return (
    <>
      {/* Desktop: phone frame centrado en fondo gris */}
      <div className="hidden sm:flex min-h-screen items-center justify-center bg-zinc-200 p-4">
        <div className="relative flex h-[680px] w-[340px] flex-col overflow-hidden rounded-[46px] border-[8px] border-[#C8BEE0] bg-mn-bg shadow-2xl">
          {/* Blob decorativos */}
          <svg viewBox="0 0 200 200" className="absolute -right-20 -top-20 h-80 w-80 fill-[#DDD5EE] opacity-50 blur-3xl pointer-events-none">
            <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.3,88.5,-0.9C87,14.5,81.4,28.9,73.1,41.4C64.8,53.8,53.8,64.2,40.9,71.5C28.1,78.8,14,83,0,83.1C-14.1,83.1,-28.1,79,-40.8,71.6C-53.5,64.2,-64.8,53.5,-73.2,40.9C-81.6,28.4,-87,14.2,-87.3,-0.1C-87.5,-14.5,-82.7,-28.9,-74.2,-41.4C-65.7,-53.8,-53.4,-64.2,-39.8,-71.7C-26.2,-79.1,-13.1,-83.6,1.4,-86C15.8,-88.4,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
          <div className="relative z-10 flex h-full flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile: pantalla completa sin frame */}
      <div className="sm:hidden flex flex-col min-h-dvh bg-mn-bg">
        {children}
      </div>
    </>
  )
}
