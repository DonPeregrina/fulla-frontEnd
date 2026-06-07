/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, Users, HelpCircle, ChevronRight } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function GroupsTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['host-groups', user?.id],
    queryFn: () => mockApi.getGroups(user?.id || ''),
  });

  const createMutation = useMutation({
    mutationFn: mockApi.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-groups'] });
      setIsCreateOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      toast.success('Grupo creado con éxito');
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    createMutation.mutate({
      name: newGroupName,
      description: newGroupDesc,
      hostId: user?.id
    });
  };

  return (
    <div className="space-y-6 px-4 pb-12 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2D2440]">GRUPOS</h1>
          <p className="text-[10px] uppercase tracking-[.1em] text-[#5A4A7A]">Gestión de Equipos</p>
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
                <DialogTitle className="text-sm font-bold uppercase tracking-widest text-[#2D2440]">Nuevo Clan</DialogTitle>
                <DialogDescription className="text-[10px] uppercase tracking-wide text-[#5A4A7A]">
                  Define el nombre del colectivo ritual.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-[#8878AA]">Identificador</Label>
                  <Input 
                    id="name" 
                    placeholder="Ej. Alfa-7" 
                    className="border-2 border-[#DDD5EE] bg-white focus:border-[#F0C030] rounded-xl text-[12px] font-bold"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
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

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-[#DDD5EE]/30" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <LayoutGrid className="mb-4 h-12 w-12 text-[#DDD5EE]" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D2440]">Vació Absoluto</h3>
          <p className="mb-6 text-[10px] uppercase tracking-widest text-[#B0A8CC]">Inicia el ritual creando un grupo.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map(group => (
            <Card 
              key={group.id} 
              className="group cursor-pointer border-2 border-[#DDD5EE] bg-white transition-all hover:border-[#F0C030] hover:shadow-[4px_4px_0px_#EDE9F8]"
              onClick={() => navigate(`/host/groups/${group.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9F8] text-[#5A4A7A]">
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#C4BAD8] transition-transform group-hover:translate-x-1 group-hover:text-[#F0C030]" />
                </div>
                <CardTitle className="mt-4 text-[12px] font-bold uppercase tracking-wider text-[#2D2440]">{group.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-[10px] font-bold uppercase tracking-widest text-[#B0A8CC]">{group.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 pt-2 border-t border-[#DDD5EE]">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#8878AA]">
                    <Users className="h-3 w-3" />
                    <span>{group.userIds.length} NODOS</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#8878AA]">
                    <HelpCircle className="h-3 w-3" />
                    <span>{group.questionIds.length} RITUALES</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
