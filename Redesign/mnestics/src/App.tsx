/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

// Pages
import SignIn from '@/pages/SignIn';
import HostDashboard from '@/pages/host/HostDashboard';
import UserDashboard from '@/pages/user/UserDashboard';

import Shell from '@/components/Shell';

const queryClient = new QueryClient();

function ProtectedRoute({ children, role }: { children: React.ReactNode, role?: 'HOST' | 'USER' }) {
  const { isAuthenticated, role: userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (role && userRole !== role) {
    return <Navigate to={userRole === 'HOST' ? '/host' : '/user'} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, role } = useAuth();

  return (
    <Routes>
      <Route path="/signin" element={
        isAuthenticated ? <Navigate to={role === 'HOST' ? '/host' : '/user'} replace /> : <SignIn />
      } />
      
      <Route path="/host/*" element={
        <ProtectedRoute role="HOST">
          <HostDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/user/*" element={
        <ProtectedRoute role="USER">
          <UserDashboard />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/signin" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Shell>
            <AppRoutes />
            <Toaster position="top-center" />
          </Shell>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
