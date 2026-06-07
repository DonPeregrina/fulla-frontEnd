/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, Mail, ChevronRight } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function UsersTab() {
  const { user: host } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['host-users', host?.id],
    queryFn: () => mockApi.getUsersByHost(host?.id || ''),
  });

  const createMutation = useMutation({
    mutationFn: mockApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-users'] });
      setIsCreateOpen(false);
      setNewUserName('');
      setNewUserUsername('');
      toast.success('Usuario creado con éxito');
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserUsername) return;
    createMutation.mutate({
      name: newUserName,
      username: newUserUsername,
      hostId: host?.id
    });
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 px-4 pb-12 pt-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2D2440]">USUARIOS</h1>
          <p className="text-[10px] uppercase tracking-[.1em] text-[#5A4A7A]">Censo de Participantes</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2D2440] hover:bg-[#5A4A7A] text-white border-none h-9 w-9 p-0 rounded-full shadow-lg">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[300px] rounded-[32px] border-2 border-[#C8BEE0] bg-[#EDE9F8] p-6">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-sm font-bold uppercase tracking-widest text-[#2D2440]">Nuevo Ritualista</DialogTitle>
                <DialogDescription className="text-[10px] uppercase tracking-wide text-[#5A4A7A]">
                  Inicia la ficha de un nuevo integrante.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-[#8878AA]">Nombre Literal</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej. Juan Pérez" 
                    className="border-2 border-[#DDD5EE] bg-white focus:border-[#F0C030] rounded-xl text-[12px] font-bold"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-[10px] uppercase tracking-widest text-[#8878AA]">User Tag</Label>
                  <Input 
                    id="username" 
                    placeholder="Ej. juanito123" 
                    className="border-2 border-[#DDD5EE] bg-white focus:border-[#F0C030] rounded-xl text-[12px] font-bold"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter className="flex-row gap-2">
                <Button type="button" variant="ghost" className="flex-1 text-[10px] font-bold uppercase tracking-wider" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-[#F0C030] hover:bg-[#FFDD55] text-[#2D2440] font-black uppercase text-[10px] tracking-wider rounded-xl py-5" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'PROC...' : 'CREAR'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B0A8CC]" />
        <Input 
          placeholder="Rastrear por nombre o tag..." 
          className="border-2 border-[#DDD5EE] bg-white pl-10 focus:border-[#F0C030] rounded-xl text-[12px] h-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-[#DDD5EE]/30" />)}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="mb-4 h-12 w-12 text-[#DDD5EE]" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D2440]">Sujeto No Encontrado</h3>
          <p className="text-[10px] uppercase tracking-widest text-[#B0A8CC]">Intenta con otro término.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredUsers.map(u => (
            <Card 
              key={u.id} 
              className="group cursor-pointer border-2 border-[#DDD5EE] bg-white transition-all hover:border-[#F0C030] hover:shadow-[4px_4px_0px_#EDE9F8]"
              onClick={() => navigate(`/host/users/${u.id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border-2 border-[#C4BAD8]">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback className="bg-[#EDE9F8] text-[#5A4A7A] font-bold text-[10px]">{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[11px] font-bold text-[#2D2440] uppercase tracking-wide">{u.name}</p>
                    <p className="text-[9px] font-bold text-[#B0A8CC]">@{u.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right sm:block">
                    <p className="text-[8px] font-bold text-[#B0A8CC] uppercase tracking-[.15em] mb-0.5">AFILIACIONES</p>
                    <p className="text-[10px] font-black text-[#2D2440]">{u.groupIds.length}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#C4BAD8] transition-transform group-hover:translate-x-1 group-hover:text-[#F0C030]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
