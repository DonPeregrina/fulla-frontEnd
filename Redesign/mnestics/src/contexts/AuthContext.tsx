/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, Host, User, Role } from '@/types';

interface AuthContextType extends AuthState {
  login: (user: Host | User, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const saved = localStorage.getItem('auth');
    return saved ? JSON.parse(saved) : { user: null, role: null, isAuthenticated: false };
  });

  const login = (user: Host | User, role: Role) => {
    const newState = { user, role, isAuthenticated: true };
    setState(newState);
    localStorage.setItem('auth', JSON.stringify(newState));
  };

  const logout = () => {
    const newState = { user: null, role: null, isAuthenticated: false };
    setState(newState);
    localStorage.removeItem('auth');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
