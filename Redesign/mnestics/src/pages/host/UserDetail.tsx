/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, LayoutGrid, Calendar, Trash2, UserPlus } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const users = await mockApi.getUsersByHost(''); // In real app, filter by host
      return users.find(u => u.id === id);
    },
    enabled: !!id,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['host-groups'],
    queryFn: () => mockApi.getGroups(''),
  });

  if (isLoading) return <div className="p-8 text-center">Cargando usuario...</div>;
  if (!user) return <div className="p-8 text-center">Usuario no encontrado</div>;

  const userGroups = groups.filter(g => user.groupIds.includes(g.id));

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/host/users')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Perfil de Usuario</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center pt-6 text-center">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg dark:border-zinc-800">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold">{user.name}</h2>
            <p className="text-zinc-500">@{user.username}</p>
            
            <div className="mt-6 flex w-full flex-col gap-2">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="mr-2 h-4 w-4" /> Agregar a Grupo
              </Button>
              <Button variant="outline" className="w-full text-red-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Usuario
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Groups & Activity */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <LayoutGrid className="h-5 w-5 text-emerald-500" />
                Grupos Pertenecientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userGroups.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500 italic">Este usuario no pertenece a ningún grupo.</p>
                ) : (
                  userGroups.map(g => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
                          <LayoutGrid className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{g.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500">Remover</Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-zinc-500">No hay actividad registrada recientemente.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
