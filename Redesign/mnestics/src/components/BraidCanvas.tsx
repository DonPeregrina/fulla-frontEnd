/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Category, Question, Answer } from '@/types';

interface BraidCanvasProps {
  categories: Category[];
  questions: Question[];
  answers: Answer[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string) => void;
  momentState: 'calm' | 'query' | 'reveal' | 'insight';
}

export const BraidCanvas: React.FC<BraidCanvasProps> = ({
  categories,
  questions,
  answers,
  activeCategoryId,
  onSelectCategory,
  momentState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to generate a deterministic UN-XXXX code for each category
  const getCategoryCode = (catId: string) => {
    let hash = 0;
    for (let i = 0; i < catId.length; i++) {
      hash = catId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const codeNum = Math.abs(hash % 9000) + 1000;
    return `UN-${codeNum}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let at = 0;

    // Colors
    const BG_COLOR = '#FAF9FD';
    const GRID_COLOR = 'rgba(136, 120, 170, 0.08)';
    const CENTER_LINE_COLOR = '#DDD5EE';

    // Particle pixel representation
    interface Pixel {
      x: number;
      y: number;
      s: number;
      op: number;
      targetOp: number;
      phase: number;
      speed: number;
      color: string;
    }

    let pixels: Pixel[] = [];

    const initPixels = () => {
      pixels = [];
      const numPixels = 35;
      const colors = categories.map(c => c.color).concat(['#F0C030', '#AADDFF', '#5588AA']);
      if (colors.length === 0) return;
      
      for (let i = 0; i < numPixels; i++) {
        pixels.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          s: 1.5 + Math.random() * 2.5,
          op: 0,
          targetOp: 0.15 + Math.random() * 0.45,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.8,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    };

    const drawMu = (cx: number, cy: number, scale: number, alpha: number, state: string) => {
      const s = scale;
      const st = 4.5 * s;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (state === 'calm') {
        ctx.strokeStyle = '#2D2440';
        ctx.globalAlpha = alpha * 0.65;
      } else if (state === 'query') {
        ctx.strokeStyle = '#F0C030';
        ctx.globalAlpha = (0.5 + Math.sin(at * 2.5) * 0.25) * alpha;
      } else {
        ctx.strokeStyle = '#F0C030';
      }

      ctx.lineWidth = st;

      const o = -14;
      ctx.beginPath();
      // Left vertical stem and middle curve
      ctx.moveTo(o - 8, 14);
      ctx.lineTo(o - 8, -14);
      ctx.moveTo(o - 8, 4);
      ctx.quadraticCurveTo(o - 8, 16, o, 16);
      ctx.quadraticCurveTo(o + 8, 16, o + 8, 4);
      ctx.lineTo(o + 8, -14);
      
      // Connectors and right stems
      ctx.moveTo(o + 8, -14);
      ctx.lineTo(o + 8, 16);
      ctx.moveTo(o + 8, -14);
      ctx.lineTo(o + 20, -14);
      ctx.moveTo(o + 20, -14);
      ctx.lineTo(o + 20, 10);
      ctx.stroke();

      if (state !== 'calm') {
        ctx.globalAlpha = (state === 'insight' ? 1.0 : 0.6) * alpha;
        ctx.fillStyle = '#F0C030';
        ctx.beginPath();
        ctx.arc(o + 6, 21, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const render = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;

      // Draw background
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, W, H);

      // Draw subtle tech grids
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;
      const gridSize = 10;
      ctx.beginPath();
      for (let x = 0; x < W; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();

      // Central vertical dashed timeline axis
      ctx.beginPath();
      ctx.moveTo(cx, 10);
      ctx.lineTo(cx, H - 10);
      ctx.strokeStyle = CENTER_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update and draw floating system pixel coordinates
      pixels.forEach(px => {
        px.op += (px.targetOp - px.op) * 0.05;
        const flicker = Math.sin(at * px.speed + px.phase) * 0.4 + 0.6;
        ctx.fillStyle = px.color;
        ctx.globalAlpha = px.op * flicker;
        ctx.fillRect(px.x, px.y, px.s, px.s);
      });
      ctx.globalAlpha = 1.0;

      // Draw active thread connector lines
      categories.forEach((th, i) => {
        const catQuestions = questions.filter(q => q.categoryId === th.id);
        const catAnswers = answers.filter(a => catQuestions.find(q => q.id === a.questionId)).length;
        const dn = catAnswers >= catQuestions.length && catQuestions.length > 0;
        const ac = catAnswers > 0;

        // Position on left or right margin
        const iL = i % 2 === 0;
        
        // Match button tops: 44, 104, 164, 224, etc.
        let topOffset = 42;
        if (categories.length === 1) {
          topOffset = 90;
        } else if (categories.length === 2) {
          topOffset = i === 0 ? 64 : 144;
        } else {
          topOffset = 42 + i * 56;
        }

        const px = iL ? 68 : W - 68;
        const py = topOffset + 18;
        const muY = H / 2 - 5;

        // Connect from entry point on margin to central Mu symbol
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.bezierCurveTo(
          iL ? px + 30 : px - 30, py,
          cx + (iL ? -20 : 20), muY,
          cx, muY
        );

        ctx.strokeStyle = th.color;
        ctx.lineWidth = dn ? 2 : ac ? 1.5 : 0.5;
        ctx.globalAlpha = dn ? 0.9 : ac ? 0.5 : 0.15;
        ctx.setLineDash(dn ? [] : [4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1.0;
      });

      // Target central Mu position
      const muY = H / 2 - 5;

      // Draw aesthetic rings or scanlines surrounding a coherent, insighted Mu
      if (momentState === 'insight' || momentState === 'reveal') {
        const pulse = 1.0 + Math.sin(at * 2.0) * 0.05;
        [28, 18, 12].forEach((r, ri) => {
          ctx.beginPath();
          ctx.arc(cx, muY, r * pulse, 0, Math.PI * 2);
          ctx.strokeStyle = '#F0C030';
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = (0.05 + ri * 0.04) * (0.6 + Math.sin(at * 1.5) * 0.4);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        });
      }

      // Draw Mu vector icon
      drawMu(cx, muY, 0.95, 1.0, momentState);

      at += 0.016;
      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = 240; // Hardcoded container fit
        initPixels();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [categories, questions, answers, momentState]);

  return (
    <div ref={containerRef} className="relative h-[240px] w-full select-none overflow-hidden rounded-[24px] border-2 border-[#DDD5EE] bg-[#FAF9FD]">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HTML buttons hovering on top of Left/Right margin exact channels */}
      <div className="absolute inset-0 pointer-events-none">
        {categories.map((th, i) => {
          const catQuestions = questions.filter(q => q.categoryId === th.id);
          const catAnswers = answers.filter(a => catQuestions.find(q => q.id === a.questionId)).length;
          const dn = catAnswers >= catQuestions.length && catQuestions.length > 0;
          const ac = catAnswers > 0;
          
          const iL = i % 2 === 0;
          
          let topOffset = 42;
          if (categories.length === 1) {
            topOffset = 90;
          } else if (categories.length === 2) {
            topOffset = i === 0 ? 64 : 144;
          } else {
            topOffset = 42 + i * 56;
          }

          const entryW = 106;
          const left = iL ? '4px' : `calc(100% - ${entryW}px - 4px)`;
          const isActive = activeCategoryId === th.id;
          const systemCode = getCategoryCode(th.id);

          return (
            <button
              key={th.id}
              onClick={() => onSelectCategory(th.id)}
              className={`absolute pointer-events-auto flex items-center gap-1.5 p-1.5 transition-all outline-none rounded-xl border text-left cursor-pointer hover:scale-103 active:scale-97 ${
                dn ? 'opacity-40' : 'opacity-100'
              } ${isActive ? 'bg-[#1A1535] border-[#F0C030] shadow-md' : 'bg-white border-[#DDD5EE] hover:bg-[#EDE9F8]/20'}`}
              style={{
                top: `${topOffset}px`,
                left: left,
                width: `${entryW}px`,
              }}
            >
              {/* Dynamic status line accent in category's glow color */}
              <div 
                className="w-[2.5px] rounded-sm shrink-0 self-stretch transition-opacity" 
                style={{ 
                  backgroundColor: th.color, 
                  boxShadow: ac ? `0 0 6px ${th.color}` : 'none',
                  opacity: ac ? 1 : 0.4
                }} 
              />
              <div className="overflow-hidden">
                <div 
                  className="font-mono text-[7px] font-bold leading-none uppercase"
                  style={{ color: isActive ? '#AADDFF' : (ac ? th.color : '#5588AA') }}
                >
                  {systemCode}
                </div>
                <div 
                  className={`font-mono text-[8.5px] font-bold truncate tracking-tight mt-1 leading-none uppercase ${
                    isActive ? 'text-white' : 'text-[#1A1535]'
                  }`}
                >
                  {th.name}
                </div>
                {/* Micro Dots indicator representing question completion */}
                <div className="flex gap-1 mt-1">
                  {catQuestions.map((q, idx) => {
                    const ans = answers.find(a => a.questionId === q.id);
                    return (
                      <div 
                        key={idx} 
                        className="h-1.5 w-1.5 rounded-[1px]" 
                        style={{ backgroundColor: ans ? th.color : (isActive ? '#2D2440' : '#EDE9F8') }}
                      />
                    );
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
