/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Users, HelpCircle, Plus, Trash2, Tag } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  
  const [newQText, setNewQText] = useState('');
  const [newQCat, setNewQCat] = useState('');
  const [newQType, setNewQType] = useState<'TEXT' | 'BOOLEAN' | 'NUMBER'>('BOOLEAN');

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ['group', id],
    queryFn: () => mockApi.getGroup(id!),
    enabled: !!id,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['group-questions', id],
    queryFn: () => mockApi.getQuestionsByGroup(id!),
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: mockApi.getCategories,
  });

  const addQuestionMutation = useMutation({
    mutationFn: mockApi.createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-questions', id] });
      setIsAddQuestionOpen(false);
      setNewQText('');
      toast.success('Pregunta añadida');
    }
  });

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText || !newQCat) return;
    addQuestionMutation.mutate({
      text: newQText,
      categoryId: newQCat,
      groupId: id!,
      type: newQType
    });
  };

  if (groupLoading) return <div className="p-8 text-center">Cargando grupo...</div>;
  if (!group) return <div className="p-8 text-center">Grupo no encontrado</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/host/groups')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-zinc-500">{group.description}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Questions Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <HelpCircle className="h-5 w-5 text-emerald-500" />
              Preguntas ({questions.length})
            </h2>
            
            <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                  <Plus className="mr-1 h-4 w-4" /> Añadir
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddQuestion}>
                  <DialogHeader>
                    <DialogTitle>Añadir Pregunta</DialogTitle>
                    <DialogDescription>
                      Define una nueva pregunta de hábito para este grupo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="text">Texto de la Pregunta</Label>
                      <Input 
                        id="text" 
                        placeholder="Ej. ¿Hiciste ejercicio hoy?" 
                        value={newQText}
                        onChange={(e) => setNewQText(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={newQCat} onValueChange={setNewQCat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Respuesta</Label>
                      <Select value={newQType} onValueChange={(v: any) => setNewQType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BOOLEAN">Sí / No</SelectItem>
                          <SelectItem value="NUMBER">Numérico</SelectItem>
                          <SelectItem value="TEXT">Texto Libre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddQuestionOpen(false)}>Cancelar</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={addQuestionMutation.isPending}>
                      Guardar Pregunta
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {questions.map(q => {
              const cat = categories.find(c => c.id === q.categoryId);
              return (
                <Card key={q.id} className="border-zinc-100 dark:border-zinc-800">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{q.text}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {q.type}
                        </Badge>
                        {cat && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Tag className="h-3 w-3" style={{ color: cat.color }} />
                            {cat.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-zinc-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Users Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-blue-500" />
              Miembros ({group.userIds.length})
            </h2>
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" /> Invitar
            </Button>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
             <p className="p-4 text-center text-sm text-zinc-500 italic">
               Lista de usuarios del grupo se gestiona desde la pestaña Usuarios.
             </p>
          </div>
        </section>
      </div>
    </div>
  );
}
