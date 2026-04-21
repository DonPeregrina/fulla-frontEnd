import React, { useEffect, useRef } from 'react'
import type { Pregunta, Respuesta } from '@/types'

// Un HiloCanvas es un Hilo con color asignado localmente
export interface HiloCanvas {
  id: string
  name: string
  color: string
}

interface BraidCanvasProps {
  hilos: HiloCanvas[]
  preguntas: Pregunta[]        // preguntas de este nudo (todas, de todos los hilos)
  respuestas: Respuesta[]      // respuestas de HOY para este nudo
  hiloActivoId: string | null
  onHiloClick: (hiloId: string) => void
}

export const BraidCanvas: React.FC<BraidCanvasProps> = ({
  hilos,
  preguntas,
  respuestas,
  hiloActivoId,
  onHiloClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let at = 0
    const BG_BASE = '#EDE9F8'
    const BLOB_COLOR = '#DDD5EE'

    const render = () => {
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2

      const totalQ = preguntas.length
      const totalA = respuestas.length
      const p = totalQ > 0 ? totalA / totalQ : 0
      const allDone = p >= 1

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = BG_BASE
      ctx.fillRect(0, 0, W, H)

      // Blobs decorativos
      ctx.fillStyle = BLOB_COLOR
      ctx.globalAlpha = 0.55
      ctx.beginPath()
      ctx.moveTo(W * 0.55, 0)
      ctx.bezierCurveTo(W * 1.1, -10, W * 1.15, H * 0.35, W * 0.9, H * 0.45)
      ctx.bezierCurveTo(W * 0.7, H * 0.55, W * 0.5, H * 0.38, W * 0.55, H * 0.22)
      ctx.bezierCurveTo(W * 0.58, H * 0.12, W * 0.5, -5, W * 0.55, 0)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(0, H * 0.6)
      ctx.bezierCurveTo(-20, H * 0.5, W * 0.2, H * 0.55, W * 0.18, H * 0.72)
      ctx.bezierCurveTo(W * 0.16, H * 0.88, 0, H * 0.9, 0, H)
      ctx.lineTo(0, H * 0.6)
      ctx.fill()
      ctx.globalAlpha = 1

      const bB = 32 + p * (H * 0.75 - 32)

      // Constelación: un satélite por Hilo
      const ncy = 44
      const ncR = 34
      const angles = hilos.map((_, i) => (i / hilos.length) * Math.PI * 2 - Math.PI / 2)

      // Cross-links entre satélites con respuestas
      for (let i = 0; i < hilos.length; i++) {
        for (let j = i + 1; j < hilos.length; j++) {
          const hiloAPregs = preguntas.filter(q => q.groupId === hilos[i].id)
          const hiloBPregs = preguntas.filter(q => q.groupId === hilos[j].id)
          const aA = respuestas.filter(a => hiloAPregs.find(q => q.id === a.questionId)).length
          const aB = respuestas.filter(a => hiloBPregs.find(q => q.id === a.questionId)).length
          if (aA > 0 || aB > 0) {
            const ax = cx + Math.cos(angles[i]) * ncR
            const ay = ncy + Math.sin(angles[i]) * ncR
            const bx = cx + Math.cos(angles[j]) * ncR
            const by = ncy + Math.sin(angles[j]) * ncR
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
            ctx.strokeStyle = '#C4BAD8'; ctx.lineWidth = 1
            ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1
          }
        }
      }

      // Rayos y satélites
      angles.forEach((a, i) => {
        const hilo = hilos[i]
        const hiloPregs = preguntas.filter(q => q.groupId === hilo.id)
        const hiloAnswers = respuestas.filter(ans => hiloPregs.find(q => q.id === ans.questionId))
        const hasAnswers = hiloAnswers.length > 0
        const sx = cx + Math.cos(a) * ncR
        const sy = ncy + Math.sin(a) * ncR

        // Rayo hub → satélite
        ctx.beginPath(); ctx.moveTo(cx, ncy); ctx.lineTo(sx, sy)
        ctx.strokeStyle = hilo.color; ctx.lineWidth = 1.5
        ctx.globalAlpha = hasAnswers ? 0.9 : 0.3; ctx.stroke(); ctx.globalAlpha = 1

        // Satélite
        const pulse = hasAnswers ? 1 + Math.sin(at * 1.8 + i) * 0.12 : 1
        ctx.beginPath(); ctx.arc(sx, sy, 6 * pulse, 0, Math.PI * 2)
        ctx.fillStyle = hilo.color
        ctx.globalAlpha = hasAnswers ? 1 : 0.4; ctx.fill(); ctx.globalAlpha = 1
        if (hasAnswers) {
          ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill()
        }
      })

      // Hub central
      const hubR = allDone ? 9 + Math.sin(at * 2.5) * 1.2 : 7
      ctx.beginPath(); ctx.arc(cx, ncy, hubR, 0, Math.PI * 2)
      ctx.fillStyle = allDone ? '#F0C030' : '#C4BAD8'; ctx.fill()
      ctx.beginPath(); ctx.arc(cx, ncy, hubR * 0.42, 0, Math.PI * 2)
      ctx.fillStyle = '#EDE9F8'; ctx.fill()
      if (allDone) {
        ctx.fillStyle = '#F0C030'
        ctx.font = 'bold 8px Space Mono, monospace'
        ctx.textAlign = 'center'
        ctx.globalAlpha = 0.8
        ctx.fillText('✦ nudo', cx, ncy - hubR - 10)
        ctx.globalAlpha = 1
      }

      // Conector hub → trenza
      ctx.beginPath(); ctx.moveTo(cx, ncy + hubR); ctx.lineTo(cx, bB > 32 ? bB : 80)
      ctx.strokeStyle = '#C4BAD8'; ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])

      // Beziers desde hilos hacia la trenza
      hilos.forEach((hilo, i) => {
        const hiloPregs = preguntas.filter(q => q.groupId === hilo.id)
        const hiloA = respuestas.filter(a => hiloPregs.find(q => q.id === a.questionId)).length
        const dn = hiloA >= hiloPregs.length && hiloPregs.length > 0
        const ac = hiloA > 0
        const iL = i % 2 === 0
        const topOffset = 50 + i * 60
        const px = iL ? 72 : W - 72
        const py = topOffset + 18
        ctx.beginPath(); ctx.moveTo(px, py)
        ctx.bezierCurveTo(iL ? px + 40 : px - 40, py, cx + (iL ? -14 : 14), py, cx, py)
        ctx.strokeStyle = hilo.color
        ctx.lineWidth = dn ? 3 : ac ? 2 : 1
        ctx.globalAlpha = dn ? 1 : ac ? 0.55 : 0.2; ctx.stroke(); ctx.globalAlpha = 1
      })

      // Trenza
      const braidStart = 86
      const SEG = 2.5
      const segs = Math.max(0, Math.ceil((bB - braidStart) / SEG))
      for (let s = 0; s < segs; s++) {
        const y0 = braidStart + s * SEG
        ;[...Array(hilos.length).keys()]
          .sort((a, b) => ((a + s) % hilos.length) - ((b + s) % hilos.length))
          .forEach(ti => {
            const hilo = hilos[ti]
            const hiloPregs = preguntas.filter(q => q.groupId === hilo.id)
            const hiloA = respuestas.filter(a => hiloPregs.find(q => q.id === a.questionId)).length
            const dn = hiloA >= hiloPregs.length && hiloPregs.length > 0
            const ac = hiloA > 0
            const ph = (ti / hilos.length) * Math.PI * 2
            ctx.beginPath()
            ctx.moveTo(cx + Math.sin(s * 0.38 + ph) * 11, y0)
            ctx.lineTo(cx + Math.sin((s + 1) * 0.38 + ph) * 11, y0 + SEG + 0.5)
            ctx.strokeStyle = hilo.color
            ctx.lineWidth = dn ? 4.5 : ac ? 3 : 1.5
            ctx.globalAlpha = dn ? 1 : ac ? 0.65 : 0.18; ctx.stroke(); ctx.globalAlpha = 1
          })
      }

      // Nudo (knot)
      if (p > 0) {
        const ky = Math.max(bB, 90)
        const kr = (9 + Math.sin(at * 2.8) * 1.4) * p
        ;[kr + 12, kr + 7].forEach((gr, gi) => {
          ctx.beginPath(); ctx.arc(cx, ky, gr, 0, Math.PI * 2)
          ctx.strokeStyle = '#F0C030'; ctx.lineWidth = 0.8
          ctx.globalAlpha = (0.08 + gi * 0.08) * p; ctx.stroke(); ctx.globalAlpha = 1
        })
        ctx.beginPath(); ctx.arc(cx, ky, kr, 0, Math.PI * 2)
        ctx.fillStyle = allDone ? '#F0C030' : '#DDD5EE'; ctx.fill()
        ctx.strokeStyle = '#F0C030'; ctx.lineWidth = 2
        ctx.globalAlpha = 0.5 + p * 0.5; ctx.stroke(); ctx.globalAlpha = 1
        if (allDone) {
          ctx.beginPath(); ctx.arc(cx, ky, kr * 0.38, 0, Math.PI * 2)
          ctx.fillStyle = '#EDE9F8'; ctx.fill()
        }
      }

      // Línea punteada restante
      const ls = p > 0 ? Math.max(bB, 90) + 2 : braidStart
      ctx.beginPath(); ctx.moveTo(cx, ls); ctx.lineTo(cx, H * 0.9)
      ctx.strokeStyle = '#C4BAD8'; ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([])

      at += 0.016
      animationFrameId = requestAnimationFrame(render)
    }

    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth
        canvas.height = 340
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    render()
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', handleResize) }
  }, [hilos, preguntas, respuestas])

  return (
    <div ref={containerRef} className="relative h-[340px] w-full">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute inset-0 pointer-events-none">
        {hilos.map((hilo, i) => {
          const hiloPregs = preguntas.filter(q => q.groupId === hilo.id)
          const hiloA = respuestas.filter(a => hiloPregs.find(q => q.id === a.questionId)).length
          const dn = hiloA >= hiloPregs.length && hiloPregs.length > 0
          const ac = hiloA > 0
          const rem = hiloPregs.length - hiloA
          const iL = i % 2 === 0
          const topOffset = 50 + i * 60
          const bgColor = ac ? hilo.color : '#FFFFFF'
          const textColor = ac ? '#fff' : hilo.color
          const subColor = ac ? 'rgba(255,255,255,0.8)' : hilo.color + 'BB'
          const isActive = hiloActivoId === hilo.id

          return (
            <button
              key={hilo.id}
              onClick={() => onHiloClick(hilo.id)}
              className={`absolute pointer-events-auto flex items-center gap-2 rounded-full border-[2.5px] px-3 py-2 transition-all hover:scale-105 active:scale-95 ${dn ? 'opacity-50' : ''} ${isActive ? 'ring-2 ring-offset-2 ring-[#2D2440]' : ''}`}
              style={{
                top: `${topOffset}px`,
                [iL ? 'left' : 'right']: '4px',
                borderColor: hilo.color,
                backgroundColor: bgColor,
                boxShadow: `0 3px 12px ${hilo.color}44`,
                maxWidth: '126px',
              }}
            >
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                style={{ backgroundColor: ac ? 'rgba(255,255,255,0.5)' : hilo.color, borderColor: ac ? 'rgba(255,255,255,0.7)' : hilo.color }}
              />
              <div className="text-left overflow-hidden">
                <div className="truncate text-[10px] font-bold leading-tight tracking-wider" style={{ color: textColor }}>
                  {hilo.name}{dn ? ' ✓' : ''}
                </div>
                <div className="text-[8px] leading-tight" style={{ color: subColor }}>
                  {dn ? 'listo' : `${rem} más`}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
