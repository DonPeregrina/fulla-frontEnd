/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Mail, Shield, Settings } from 'lucide-react';

export default function ProfileTab() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-zinc-500">Gestiona tu cuenta de Host</p>
      </header>

      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
        <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600" />
        <CardContent className="relative pt-0">
          <div className="flex flex-col items-center -translate-y-12 sm:flex-row sm:items-end sm:gap-6 sm:px-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg dark:border-zinc-900">
              <AvatarImage src={(user as any).avatarUrl} />
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="mt-4 text-center sm:mb-2 sm:mt-0 sm:text-left">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-zinc-500">Organizador Principal</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:px-6">
            <div className="flex items-center gap-4 rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Email</p>
                <p className="font-medium">{(user as any).email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Rol</p>
                <p className="font-medium">Host / Administrador</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:px-6">
            <Button className="flex-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              <Settings className="mr-2 h-4 w-4" /> Editar Perfil
            </Button>
            <Button variant="outline" className="flex-1 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
