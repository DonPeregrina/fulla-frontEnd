/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Circle, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import MnesticsLogo from '@/components/MnesticsLogo';

// Sub-pages
import TodayTab from './tabs/TodayTab';
import HistoryTab from './tabs/HistoryTab';
import UserProfileTab from './tabs/UserProfileTab';

export default function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const tabs = [
    { id: 'nodo', label: 'Nodo', icon: Circle, path: '/user' },
    { id: 'diario', label: 'Diario', icon: BookOpen, path: '/user/history' },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Routes>
              <Route index element={<TodayTab />} />
              <Route path="history" element={<HistoryTab />} />
              <Route path="profile" element={<UserProfileTab />} />
              <Route path="hilos" element={<div className="flex h-full items-center justify-center p-8 text-center text-[10px] uppercase font-bold text-[#B0A8CC] tracking-widest leading-loose">Módulo de Hilos<br/>Sincronizando con Servidor...</div>} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav - Contained within shell */}
      <nav className="flex w-full items-center justify-around border-t border-[#2D2440] bg-[#1A1535] pb-6 pt-2.5 shadow-[0_-4px_12px_rgba(26,21,53,0.3)]">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 relative ${
                isActive
                  ? 'text-[#F0C030] scale-105'
                  : 'text-[#5588AA] hover:text-[#AADDFF]'
              }`}
            >
              {tab.id === 'nodo' ? (
                <div className="relative flex h-7 w-7 items-center justify-center">
                  <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-90'}`}>
                    <MnesticsLogo size="xs" variant={isActive ? 'reveal' : 'minimal'} />
                  </div>
                  {/* Rotating orbital dotted gold ring for active node */}
                  {isActive && (
                    <div className="absolute h-9 w-9 rounded-full border-1.5 border-dashed border-[#F0C030]/40 animate-[spin_12s_linear_infinite]" />
                  )}
                </div>
              ) : (
                <div className="relative flex h-7 w-7 items-center justify-center">
                  <tab.icon className={`h-[18px] w-[18px] transition-all ${isActive ? 'stroke-[#F0C030] stroke-[2.5px]' : 'stroke-[#5588AA]'}`} />
                  {isActive && (
                    <motion.span 
                      layoutId="activeTabDot" 
                      className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#F0C030]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </div>
              )}
              <span className={`text-[8px] font-bold uppercase tracking-wider mt-1 transition-colors ${isActive ? 'text-[#F0C030]' : 'text-[#5588AA]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
