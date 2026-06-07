/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import MnesticsLogo from '@/components/MnesticsLogo';

interface ShellProps {
  children: React.ReactNode;
}

export const StatusBar = () => {
  return (
    <div className="flex h-[36px] items-end justify-between px-[22px] pb-[4px] pt-[13px] bg-[#1A1535] border-b border-[#2D2440]/40">
      <span className="font-mono text-[10px] font-bold text-[#5588AA]">9:41 AM <span className="text-[#F0C030]">●</span></span>
      <div className="flex items-center gap-1.5 text-[#5588AA]">
        <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
          <rect x="0" y="7" width="2" height="3" rx="0.5" />
          <rect x="3" y="5" width="2" height="5" rx="0.5" />
          <rect x="6" y="3" width="2" height="7" rx="0.5" />
          <rect x="9" y="0" width="2" height="10" rx="0.5" />
        </svg>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 4C4 1 10 1 13 4M3 6.5C5.5 4.5 8.5 4.5 11 6.5M5.5 8.5C6.5 7.5 7.5 7.5 8.5 8.5" strokeLinecap="round" />
        </svg>
        <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="0.75" y="0.75" width="10.5" height="6.5" rx="1" />
          <path d="M12.5 2.5V5.5" strokeWidth="2" strokeLinecap="round" />
          <rect x="2.5" y="2.5" width="5" height="3" fill="currentColor" stroke="none" />
        </svg>
      </div>
    </div>
  );
};

export const TopNavBar = ({ title, avatarUrl }: { title: string; avatarUrl?: string }) => {
  return (
    <div className="flex items-center justify-between bg-[#1A1535] px-4 py-2.5 border-b border-[#2D2440] shadow-sm select-none">
      <div className="flex items-center gap-2">
        <MnesticsLogo size="sm" variant="reveal" />
        <span className="font-mono text-xs font-bold tracking-tight text-white lowercase">
          mnestics<span className="text-[#AADDFF]">.io</span>
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <span className="text-[7.5px] font-bold text-[#5588AA] tracking-widest uppercase bg-[#2D2440]/60 px-2 py-0.5 rounded-full border border-[#5588AA]/10">
          CORE V1.2
        </span>
        <div className="h-7 w-7 rounded-lg border border-[#5588AA]/30 bg-[#2D2440] flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AADDFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export const StreakRow = ({ count = 5 }) => {
  const totalDots = 7;
  const threadColors = ['#F0C030', '#AADDFF', '#5588AA', '#E8503A', '#F0C030', '#AADDFF', '#E8503A'];
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1535] shrink-0 border-b border-[#2D2440]/30 shadow-inner">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <div className="h-2 w-2 rounded-full bg-[#E8503A] animate-ping" />
        <span className="font-mono text-[8px] font-bold tracking-[0.16em] text-[#AADDFF] uppercase">
          STABLE MEMORY: <span className="text-[#E8503A]">{count}D STREAK</span>
        </span>
      </div>
      <div className="flex flex-1 gap-1 justify-end overflow-hidden">
        {Array.from({ length: totalDots }).map((_, i) => (
          <div 
            key={i}
            className="h-1.5 w-1.5 shrink-0 rounded-[1px] transition-all duration-300"
            style={{
              backgroundColor: i < count ? threadColors[i % threadColors.length] : 'transparent',
              border: i < count ? 'none' : '1px solid #2D2440'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const SessionLabel = ({ label }: { label: string }) => {
  return (
    <div className="mb-4 text-center">
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.25em] text-[#5588AA]">
        {label}
      </span>
    </div>
  );
};


const Blob = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 200 200" 
    xmlns="http://www.w3.org/2000/svg" 
    className={`absolute fill-[#DDD5EE] opacity-50 blur-xl ${className}`}
    style={{ filter: 'blur(30px)' }} // Soften even more
  >
    <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.3,88.5,-0.9C87,14.5,81.4,28.9,73.1,41.4C64.8,53.8,53.8,64.2,40.9,71.5C28.1,78.8,14,83,0,83.1C-14.1,83.1,-28.1,79,-40.8,71.6C-53.5,64.2,-64.8,53.5,-73.2,40.9C-81.6,28.4,-87,14.2,-87.3,-0.1C-87.5,-14.5,-82.7,-28.9,-74.2,-41.4C-65.7,-53.8,-53.4,-64.2,-39.8,-71.7C-26.2,-79.1,-13.1,-83.6,1.4,-86C15.8,-88.4,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
  </svg>
);

export default function Shell({ children }: ShellProps) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/signin';

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-200 p-4 font-mono antialiased">
      {/* Phone Shell */}
      <div 
        className="relative flex h-[640px] w-[320px] flex-col overflow-hidden rounded-[46px] border-[8px] border-[#C8BEE0] bg-[#EDE9F8] shadow-2xl"
      >
        {/* Background Blobs */}
        <svg viewBox="0 0 200 200" className="absolute -right-20 -top-20 h-80 w-80 fill-[#DDD5EE] opacity-50 blur-3xl">
          <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.5,90,-16.3,88.5,-0.9C87,14.5,81.4,28.9,73.1,41.4C64.8,53.8,53.8,64.2,40.9,71.5C28.1,78.8,14,83,0,83.1C-14.1,83.1,-28.1,79,-40.8,71.6C-53.5,64.2,-64.8,53.5,-73.2,40.9C-81.6,28.4,-87,14.2,-87.3,-0.1C-87.5,-14.5,-82.7,-28.9,-74.2,-41.4C-65.7,-53.8,-53.4,-64.2,-39.8,-71.7C-26.2,-79.1,-13.1,-83.6,1.4,-86C15.8,-88.4,30.6,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
        </svg>
        <svg viewBox="0 0 200 200" className="absolute -bottom-20 -left-20 h-80 w-80 fill-[#DDD5EE] opacity-40 blur-3xl">
          <path d="M38.1,-65.4C49.1,-58.5,57.5,-47.5,64.1,-35.6C70.7,-23.7,75.4,-11.8,76.5,0.6C77.6,13.1,75,26.1,68.4,37.6C61.8,49.1,51.2,59,38.8,66.6C26.4,74.2,12.2,79.5,-1.1,81.4C-14.4,83.3,-28.8,81.8,-41.8,75.1C-54.8,68.4,-66.4,56.5,-73,42.5C-79.6,28.6,-81.3,12.6,-79.7,-2.9C-78.1,-18.3,-73.2,-33.1,-64.1,-45.5C-55,-57.8,-41.6,-67.7,-28.4,-73.2C-15.1,-78.7,-2,-79.9,11.2,-76C24.4,-72.1,38.1,-65.4,38.1,-65.4Z" transform="translate(100 100)" />
        </svg>
        <svg viewBox="0 0 200 200" className="absolute -left-24 top-1/2 h-64 w-64 fill-[#DDD5EE] opacity-30 blur-2xl">
          <path d="M47.5,-63.1C60.1,-54.3,67.8,-38.7,71.5,-22.7C75.2,-6.7,74.7,9.7,68.5,23.5C62.3,37.3,50.3,48.5,36.7,56.1C23.1,63.7,7.8,67.6,-8.1,66.1C-24.1,64.6,-40.7,57.7,-53.4,46C-66.2,34.3,-75.1,17.7,-76,0.5C-76.9,-16.7,-69.6,-34.5,-57,-44.3C-44.4,-54.2,-26.4,-56,-9.3,-54.8C7.8,-53.6,23.5,-49.4,47.5,-63.1Z" transform="translate(100 100)" />
        </svg>

        <div className="relative z-10 flex h-full flex-col">
          <StatusBar />
          
          {!isAuthPage && (
            <>
              <TopNavBar title="HABITOS" />
              <StreakRow count={5} />
            </>
          )}

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
