import React, { useEffect, useRef } from 'react'
import type { Pregunta, Respuesta } from '@/types'

export interface HiloCanvas {
  id: string
  name: string
  color: string
}

interface BraidCanvasProps {
  hilos: HiloCanvas[]
  preguntas: Pregunta[]
  respuestas: Respuesta[]
  hiloActivoId: string | null
  onHiloClick: (hiloId: string) => void
  momentState?: 'calm' | 'query' | 'reveal' | 'insight'
}

function hiloCode(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return `UN-${(Math.abs(hash) % 9000) + 1000}`
}

export const BraidCanvas: React.FC<BraidCanvasProps> = ({
  hilos,
  preguntas,
  respuestas,
  hiloActivoId,
  onHiloClick,
  momentState = 'calm',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let at = 0

    interface Pixel { x: number; y: number; s: number; op: number; targetOp: number; phase: number; speed: number; color: string }
    let pixels: Pixel[] = []

    const initPixels = () => {
      pixels = []
      const colors = hilos.map(h => h.color).concat(['#F0C030', '#AADDFF', '#5588AA'])
      for (let i = 0; i < 30; i++) {
        pixels.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          s: 1.5 + Math.random() * 2,
          op: 0,
          targetOp: 0.1 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.8,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
      }
    }

    const drawMu = (cx: number, cy: number, alpha: number) => {
      const scale = 0.95
      const st = 4.5 * scale
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(scale, scale)
      ctx.globalAlpha = alpha
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = st

      if (momentState === 'calm') {
        ctx.strokeStyle = '#2D2440'
        ctx.globalAlpha = alpha * 0.65
      } else if (momentState === 'query') {
        ctx.strokeStyle = '#F0C030'
        ctx.globalAlpha = (0.5 + Math.sin(at * 2.5) * 0.25) * alpha
      } else {
        ctx.strokeStyle = '#F0C030'
        ctx.globalAlpha = alpha
      }

      const o = -14
      ctx.beginPath()
      ctx.moveTo(o - 8, 14); ctx.lineTo(o - 8, -14)
      ctx.moveTo(o - 8, 4)
      ctx.quadraticCurveTo(o - 8, 16, o, 16)
      ctx.quadraticCurveTo(o + 8, 16, o + 8, 4)
      ctx.lineTo(o + 8, -14)
      ctx.moveTo(o + 8, -14); ctx.lineTo(o + 8, 16)
      ctx.moveTo(o + 8, -14); ctx.lineTo(o + 20, -14)
      ctx.moveTo(o + 20, -14); ctx.lineTo(o + 20, 10)
      ctx.stroke()

      if (momentState !== 'calm') {
        ctx.globalAlpha = (momentState === 'insight' ? 1.0 : 0.6) * alpha
        ctx.fillStyle = '#F0C030'
        ctx.beginPath()
        ctx.arc(o + 6, 21, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const render = () => {
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const muY = H / 2 - 5

      // Background
      ctx.fillStyle = '#FAF9FD'
      ctx.fillRect(0, 0, W, H)

      // Subtle grid
      ctx.strokeStyle = 'rgba(136,120,170,0.08)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let x = 0; x < W; x += 10) { ctx.moveTo(x, 0); ctx.lineTo(x, H) }
      for (let y = 0; y < H; y += 10) { ctx.moveTo(0, y); ctx.lineTo(W, y) }
      ctx.stroke()

      // Dashed center axis
      ctx.beginPath()
      ctx.moveTo(cx, 10); ctx.lineTo(cx, H - 10)
      ctx.strokeStyle = '#DDD5EE'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 6])
      ctx.stroke()
      ctx.setLineDash([])

      // Floating pixels
      pixels.forEach(px => {
        px.op += (px.targetOp - px.op) * 0.05
        const flicker = Math.sin(at * px.speed + px.phase) * 0.4 + 0.6
        ctx.fillStyle = px.color
        ctx.globalAlpha = px.op * flicker
        ctx.fillRect(px.x, px.y, px.s, px.s)
      })
      ctx.globalAlpha = 1

      // Rings for reveal/insight state
      if (momentState === 'insight' || momentState === 'reveal') {
        const pulse = 1 + Math.sin(at * 2) * 0.05;
        [28, 18, 12].forEach((r, ri) => {
          ctx.beginPath()
          ctx.arc(cx, muY, r * pulse, 0, Math.PI * 2)
          ctx.strokeStyle = '#F0C030'
          ctx.lineWidth = 0.5
          ctx.globalAlpha = (0.05 + ri * 0.04) * (0.6 + Math.sin(at * 1.5) * 0.4)
          ctx.stroke()
          ctx.globalAlpha = 1
        })
      }

      // Bezier lines from hilo positions to Mu center
      hilos.forEach((hilo, i) => {
        const hiloPregs = preguntas.filter(q => q.groupId === hilo.id)
        const hiloAns = respuestas.filter(a => hiloPregs.some(q => q.id === a.questionId)).length
        const done = hiloAns >= hiloPregs.length && hiloPregs.length > 0
        const active = hiloAns > 0

        const iL = i % 2 === 0
        let topOffset = 42
        if (hilos.length === 1) topOffset = 90
        else if (hilos.length === 2) topOffset = i === 0 ? 64 : 144
        else topOffset = 42 + i * 56

        const px = iL ? 68 : W - 68
        const py = topOffset + 18

        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.bezierCurveTo(
          iL ? px + 30 : px - 30, py,
          cx + (iL ? -20 : 20), muY,
          cx, muY
        )
        ctx.strokeStyle = hilo.color
        ctx.lineWidth = done ? 2 : active ? 1.5 : 0.5
        ctx.globalAlpha = done ? 0.9 : active ? 0.5 : 0.15
        ctx.setLineDash(done ? [] : [4, 4])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      })

      // Central Mu symbol
      drawMu(cx, muY, 1.0)

      at += 0.016
      animId = requestAnimationFrame(render)
    }

    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth
        canvas.height = 240
        initPixels()
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    render()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', handleResize) }
  }, [hilos, preguntas, respuestas, momentState])

  const CARD_W = 108

  return (
    <div ref={containerRef} className="relative h-[240px] w-full select-none overflow-hidden rounded-[24px] border-2 border-[#DDD5EE] bg-[#FAF9FD]">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* Hilo file cards */}
      <div className="absolute inset-0 pointer-events-none">
        {hilos.map((hilo, i) => {
          const hiloPregs = preguntas.filter(q => q.groupId === hilo.id)
          const hiloAns = respuestas.filter(a => hiloPregs.some(q => q.id === a.questionId)).length
          const done = hiloAns >= hiloPregs.length && hiloPregs.length > 0
          const active = hiloAns > 0
          const isActive = hiloActivoId === hilo.id
          const iL = i % 2 === 0

          let topOffset = 42
          if (hilos.length === 1) topOffset = 90
          else if (hilos.length === 2) topOffset = i === 0 ? 64 : 144
          else topOffset = 42 + i * 56

          const left = iL ? '4px' : `calc(100% - ${CARD_W}px - 4px)`
          const code = hiloCode(hilo.id)

          return (
            <button
              key={hilo.id}
              onClick={() => onHiloClick(hilo.id)}
              className={`absolute pointer-events-auto flex items-center gap-1.5 p-1.5 transition-all outline-none rounded-xl border text-left cursor-pointer active:scale-95 ${done ? 'opacity-40' : 'opacity-100'} ${isActive ? 'bg-[#1A1535] border-[#F0C030] shadow-md' : 'bg-white border-[#DDD5EE] hover:bg-[#EDE9F8]/30'}`}
              style={{ top: `${topOffset}px`, left, width: `${CARD_W}px` }}
            >
              {/* Color accent bar */}
              <div
                className="w-[2.5px] rounded-sm shrink-0 self-stretch"
                style={{ backgroundColor: hilo.color, boxShadow: active ? `0 0 6px ${hilo.color}` : 'none', opacity: active ? 1 : 0.4 }}
              />
              <div className="overflow-hidden">
                <div className="font-mono text-[7px] font-bold leading-none uppercase" style={{ color: isActive ? '#AADDFF' : (active ? hilo.color : '#5588AA') }}>
                  {code}
                </div>
                <div className={`font-mono text-[8.5px] font-bold truncate tracking-tight mt-0.5 leading-none uppercase ${isActive ? 'text-white' : 'text-[#1A1535]'}`}>
                  {hilo.name}
                </div>
                {/* Micro-dots: one per question */}
                <div className="flex gap-0.5 mt-1 flex-wrap">
                  {hiloPregs.map((q) => {
                    const ans = respuestas.find(a => a.questionId === q.id)
                    return (
                      <div
                        key={q.id}
                        className="h-1.5 w-1.5 rounded-[1px]"
                        style={{ backgroundColor: ans ? hilo.color : (isActive ? '#2D2440' : '#EDE9F8') }}
                      />
                    )
                  })}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
