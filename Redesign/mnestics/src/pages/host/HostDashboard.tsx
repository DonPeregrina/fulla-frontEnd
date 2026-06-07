/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, LayoutGrid, UserCircle, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

// Sub-pages
import CollectionsTab from './tabs/CollectionsTab';
import GroupsTab from './tabs/GroupsTab';
import UsersTab from './tabs/UsersTab';
import ProfileTab from './tabs/ProfileTab';
import GroupDetail from './GroupDetail';
import UserDetail from './UserDetail';

export default function HostDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const tabs = [
    { id: 'collections', label: 'Colecciones', icon: Calendar, path: '/host' },
    { id: 'groups', label: 'Grupos', icon: LayoutGrid, path: '/host/groups' },
    { id: 'users', label: 'Usuarios', icon: Users, path: '/host/users' },
    { id: 'profile', label: 'Perfil', icon: UserCircle, path: '/host/profile' },
  ];

  const currentTab = tabs.find(t => t.path === location.pathname) || tabs[0];

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
              <Route index element={<CollectionsTab />} />
              <Route path="groups" element={<GroupsTab />} />
              <Route path="groups/:id" element={<GroupDetail />} />
              <Route path="users" element={<UsersTab />} />
              <Route path="users/:id" element={<UserDetail />} />
              <Route path="profile" element={<ProfileTab />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav - now contained in shell */}
      <nav className="flex w-full items-center justify-around border-t border-[#DDD5EE] bg-white p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${
              location.pathname === tab.path || (tab.id === 'groups' && location.pathname.includes('/groups/')) || (tab.id === 'users' && location.pathname.includes('/users/'))
                ? 'text-[#F0C030]'
                : 'text-[#B0A8CC]'
            }`}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
