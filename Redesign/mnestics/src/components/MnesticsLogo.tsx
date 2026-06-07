/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface MnesticsLogoProps {
  variant?: 'calm' | 'reveal' | 'minimal';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function MnesticsLogo({ variant = 'reveal', size = 'md', className = '' }: MnesticsLogoProps) {
  const sizeMap = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  const isMinimal = variant === 'minimal';

  // Base squircle background: #1A1535 (Deep Plum), Mu Gold: #F0C030
  // Sky particles: #AADDFF, Metadata Blue particles: #5588AA
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeMap[size]} ${className}`}>
      {/* Squircle Outer Wrapper */}
      {!isMinimal && (
        <div className="absolute inset-0 rounded-[28%] bg-[#1A1535] overflow-hidden shadow-md flex items-center justify-center">
          {/* Subtle grid pattern inside */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(240,192,48,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(240,192,48,0.15)_1px,transparent_1px)] bg-[size:8px_8px]" />
          
          {/* Digital reveal particle system inside the squircle on the right */}
          {variant === 'reveal' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Floating square particles fading on the right */}
              <motion.div 
                className="absolute right-0 top-0 h-full w-[45%] flex flex-wrap content-start p-1 gap-1 overflow-hidden opacity-80"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: [0.6, 0.9, 0.6] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                {Array.from({ length: 16 }).map((_, i) => {
                  const size = Math.random() > 0.5 ? 4 : 2;
                  const right = Math.random() * 85; 
                  const top = Math.random() * 85;
                  const colors = ['#AADDFF', '#5588AA', '#F0C030'];
                  const randColor = colors[Math.floor(Math.random() * colors.length)];
                  const delay = Math.random() * 2;
                  
                  return (
                    <motion.div
                      key={i}
                      className="absolute rounded-[1px]"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: randColor,
                        right: `${right}%`,
                        top: `${top}%`,
                      }}
                      animate={{
                        opacity: [0.1, 0.9, 0.1],
                        scale: [1, 1.3, 1],
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        delay: delay,
                        ease: 'easeInOut'
                      }}
                    />
                  );
                })}
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Mu SVG Core Symbol */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative z-10 ${isMinimal ? 'h-full w-full' : 'h-[64%] w-[64%]'}`}
      >
        {/* Geometric Stylized Mu path */}
        {/* Left vertical stem, middle curve/arch down to baseline */}
        <path
          d="M 36,28 L 36,60 C 36,64 38,66 42,66 C 46,66 48,64 48,60 L 48,46 C 48,36 54,30 62,30 C 70,30 74,36 74,45 L 74,66"
          stroke="#F0C030"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Under-leg dot represent core memory seed */}
        <circle
          cx="36"
          cy="78"
          r="6.5"
          fill="#F0C030"
        />

        {/* Minimal dot connector indicator when in reveal mode */}
        {variant === 'reveal' && (
          <circle
            cx="74"
            cy="78"
            r="4"
            fill="#AADDFF"
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
