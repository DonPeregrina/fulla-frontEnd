/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, ChevronLeft, ChevronRight, History, X } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { BraidCanvas } from '@/components/BraidCanvas';
import { Moment, Category, Question, Answer } from '@/types';

const MOMENTS: Moment[] = ['DESPERTANDO', 'MAÑANA', 'TARDE', 'NOCHE'];

const STATE_MAPPINGS = {
  DESPERTANDO: { label: 'CALM', code: 'UN-2604-M1' },
  MAÑANA: { label: 'QUERY', code: 'UN-2604-M2' },
  TARDE: { label: 'REVEAL', code: 'UN-2604-M3' },
  NOCHE: { label: 'INSIGHT', code: 'UN-2604-M4' },
};

export default function TodayTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const [activeMomentIndex, setActiveMomentIndex] = useState<number>(0);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load questions
  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ['user-questions', user?.id],
    queryFn: () => mockApi.getUserQuestions(user?.id || ''),
  });

  // Load answers
  const { data: answers = [], isLoading: aLoading } = useQuery({
    queryKey: ['user-answers', user?.id, today],
    queryFn: () => mockApi.getAnswers(user?.id || '', today),
  });

  // Load categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: mockApi.getCategories,
  });

  // Save Answers Mutation
  const saveMutation = useMutation({
    mutationFn: mockApi.saveAnswer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-answers', user?.id, today] });
    }
  });

  if (qLoading || aLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-[10px] font-bold tracking-[0.2em] bg-[#EDE9F8] text-[#1A1535] uppercase font-mono">
        <div className="space-y-3">
          <div className="h-6 w-6 rounded-full border-2 border-dashed border-[#F0C030] animate-[spin_4s_linear_infinite] mx-auto" />
          <p className="animate-pulse">SYNCHRONIZING SYSTEM CORES...</p>
        </div>
      </div>
    );
  }

  const activeMoment = MOMENTS[activeMomentIndex];
  const momentCategories = categories.filter(c => c.moment === activeMoment);
  const momentQuestions = questions.filter(q => q.moment === activeMoment);

  // Core state calculation for active node/moment
  const momentAnswers = answers.filter(a => momentQuestions.some(q => q.id === a.questionId));
  const isMomentComplete = momentQuestions.length > 0 && momentAnswers.length === momentQuestions.length;

  const answeredCount = momentAnswers.length;
  const totalCount = momentQuestions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Calculate moment progress category state ('calm' | 'query' | 'reveal' | 'insight')
  const getMomentState = (moment: Moment): 'calm' | 'query' | 'reveal' | 'insight' => {
    const mq = questions.filter(q => q.moment === moment);
    const ma = answers.filter(a => mq.some(q => q.id === a.questionId));
    const p = mq.length > 0 ? ma.length / mq.length : 0;
    
    if (p === 0) return 'calm';
    if (p < 0.5) return 'query';
    if (p < 1.0) return 'reveal';
    return 'insight';
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setIsModalOpen(true);
  };

  const handleAnswer = (questionId: string, value: any) => {
    saveMutation.mutate({
      userId: user?.id,
      questionId,
      value,
      date: today
    });
  };

  // Helper to get deterministic UN-XXXX tag
  const getCategoryCode = (catId: string) => {
    let hash = 0;
    for (let i = 0; i < catId.length; i++) {
      hash = catId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const codeNum = Math.abs(hash % 9000) + 1000;
    return `UN-${codeNum}`;
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const activeQuestionsOfSelectedCategory = selectedCategory 
    ? questions.filter(q => q.categoryId === selectedCategory.id)
    : [];
  
  const unansweredOfSelectedCategory = activeQuestionsOfSelectedCategory.find(
    q => !answers.some(a => a.questionId === q.id)
  );

  const handlePrevMoment = () => {
    setActiveMomentIndex((prev) => (prev > 0 ? prev - 1 : MOMENTS.length - 1));
    setSelectedCategoryId(null);
  };

  const handleNextMoment = () => {
    setActiveMomentIndex((prev) => (prev < MOMENTS.length - 1 ? prev + 1 : 0));
    setSelectedCategoryId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#EDE9F8] overflow-y-auto select-none pb-[40px]">
      
      {/* 1) File details label bar */}
      <div className="flex items-center gap-2 px-4 py-3 shrink-0">
        <button 
          onClick={handlePrevMoment}
          className="p-1 text-[#1A1535] hover:text-[#5588AA] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div className="h-[1px] flex-1 bg-[#DDD5EE]" />
        
        <span className="font-mono text-[8px] font-bold text-[#1A1535] tracking-[0.16em] uppercase whitespace-nowrap">
          // ARCHIVO {STATE_MAPPINGS[activeMoment].code} · {activeMoment}
        </span>
        
        <div className="h-[1px] flex-1 bg-[#DDD5EE]" />
        
        <button 
          onClick={handleNextMoment}
          className="p-1 text-[#1A1535] hover:text-[#5588AA] transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 2) Upper state matrix bar */}
      <div className="grid grid-cols-7 items-center px-4 mb-2 shrink-0">
        {MOMENTS.map((moment, i) => {
          const currentStageState = getMomentState(moment);
          const isActive = i === activeMomentIndex;
          
          let stateColor = 'text-[#5588AA]';
          let dotColor = 'bg-[#C4BAD8]';
          
          if (isActive) {
            stateColor = 'text-[#1A1535] font-bold';
            dotColor = 'bg-[#1A1535]';
          } else if (currentStageState === 'insight') {
            stateColor = 'text-[#5588AA]/70';
            dotColor = 'bg-[#5588AA]';
          }

          return (
            <React.Fragment key={moment}>
              <button 
                onClick={() => {
                  setActiveMomentIndex(i);
                  setSelectedCategoryId(null);
                }}
                className="flex flex-col items-center gap-1 focus:outline-none transition-all hover:scale-105"
              >
                <div className={`h-1.5 w-1.5 rounded-full transition-colors ${dotColor}`} />
                <span className={`font-mono text-[7px] tracking-[0.08em] uppercase ${stateColor}`}>
                  {STATE_MAPPINGS[moment].label}
                </span>
              </button>
              {i < MOMENTS.length - 1 && (
                <div className="h-[1px] bg-[#DDD5EE] self-center col-span-1" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 3) Main Canvas visualization area */}
      <div className="px-4 pb-2">
        <BraidCanvas
          categories={momentCategories}
          questions={momentQuestions}
          answers={answers}
          activeCategoryId={selectedCategoryId}
          onSelectCategory={handleSelectCategory}
          momentState={getMomentState(activeMoment)}
        />
      </div>

      {/* 4) Bottom registration and HUD monitoring pane */}
      <div className="mx-4 mt-1 bg-white border-2 border-[#DDD5EE] rounded-[24px] overflow-hidden shadow-sm flex-1 flex flex-col justify-between p-4 space-y-4">
        <div>
          {selectedCategory ? (
            <div>
              <div className="flex items-center justify-between">
                <span 
                  className="font-mono text-[8px] font-bold tracking-[0.1em] uppercase"
                  style={{ color: selectedCategory.color }}
                >
                  // {getCategoryCode(selectedCategory.id)} · {selectedCategory.name}
                </span>
                <span className="font-mono text-[7px] text-[#5588AA] uppercase font-bold tracking-widest animate-pulse">
                  Conexión Activa
                </span>
              </div>
              
              <div className="font-mono text-[10px] text-[#1A1535] mt-2 leading-relaxed h-10 overflow-hidden line-clamp-2">
                {unansweredOfSelectedCategory ? (
                  <span>&gt; {unansweredOfSelectedCategory.text}</span>
                ) : (
                  <span className="text-[#5588AA] italic font-bold">core synched — node sequence active.</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-mono text-[8.5px] font-bold text-[#5588AA] tracking-[0.1em] uppercase">
                // ACTIVE MATRIX STATUS
              </div>
              <div className="font-mono text-[9.5px] text-[#1A1535] mt-2 font-bold italic">
                _ select any node above on the channel lines to integrate state...
              </div>
            </div>
          )}
        </div>

        {/* Cohesive HUD Progress Monitoring Area */}
        <div className="border-t border-[#EDE9F8] pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[8px] font-bold text-[#5588AA] tracking-[0.1em] uppercase">
              // SYNC METRIC: {activeMoment}
            </span>
            <span className="font-mono text-[9px] font-bold text-[#1A1535] tracking-widest">
              {answeredCount}/{totalCount} SECURED
            </span>
          </div>

          {/* Smooth visual bar */}
          <div className="relative h-6 bg-[#FAF9FD] border border-[#DDD5EE] rounded-xl flex overflow-hidden lg:h-7 items-center p-0.5">
            {/* The fill bar */}
            <div 
              className="h-full bg-[#1A1535] rounded-lg transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
            
            {/* Floating percentage label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className={`font-mono text-[8.5px] font-bold tracking-[0.1em] ${
                progressPercent > 55 ? 'text-white' : 'text-[#1A1535]'
              }`}>
                {progressPercent}% COMPLETE
              </span>
            </div>
          </div>

          {/* Individual question tick metrics */}
          <div className="flex gap-1.5 mt-2 justify-center">
            {momentQuestions.map((q, idx) => {
              const qAns = answers.find(a => a.questionId === q.id);
              const qCat = categories.find(c => c.id === q.categoryId);
              return (
                <div 
                  key={q.id}
                  className="flex-1 h-1 rounded-sm transition-all duration-300"
                  style={{
                    backgroundColor: qAns ? (qCat?.color || '#F0C030') : '#EDE9F8',
                    opacity: qAns ? 1 : 0.4
                  }}
                  title={q.text}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 5) Responsive Question Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[300px] w-[90%] rounded-[32px] border-2 border-[#1A1535] bg-[#EDE9F8] p-5 focus:outline-none">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="h-2.5 w-2.5 rounded-full animate-pulse" 
                  style={{ backgroundColor: selectedCategory?.color || '#F0C030' }} 
                />
                <DialogTitle className="text-[10px] font-bold uppercase tracking-[.2em] text-[#1A1535] font-mono">
                  MEM REVEAL: {selectedCategory?.name}
                </DialogTitle>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/50 text-[#5588AA] hover:text-[#1A1535] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>

          <div className="mt-4 space-y-4 max-h-[320px] overflow-y-auto pr-1">
            {activeQuestionsOfSelectedCategory.map(q => {
              const answer = answers.find(a => a.questionId === q.id);
              const isAnswered = !!answer;

              return (
                <Card key={q.id} className={`border-2 transition-all p-3 shadow-none rounded-xl ${isAnswered ? 'border-[#C4BAD8] bg-white/50' : 'border-[#DDD5EE] bg-white'}`}>
                  <div className="space-y-3 font-mono">
                    <p className="text-[9px] font-bold leading-relaxed text-[#1A1535] uppercase tracking-wide">
                      {q.text}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {q.type === 'BOOLEAN' && (
                        <div className="flex gap-2 w-full">
                          <Button 
                            size="sm" 
                            variant={answer?.value === true ? 'default' : 'outline'}
                            className={`flex-1 h-8 text-[9px] font-bold uppercase tracking-widest rounded-lg ${answer?.value === true ? 'bg-[#1A1535] text-white border-none' : 'border-[#DDD5EE] text-[#5588AA]'}`}
                            onClick={() => handleAnswer(q.id, true)}
                          >
                            Sí
                          </Button>
                          <Button 
                            size="sm" 
                            variant={answer?.value === false ? 'default' : 'outline'}
                            className={`flex-1 h-8 text-[9px] font-bold uppercase tracking-widest rounded-lg ${answer?.value === false ? 'bg-[#1A1535] text-white border-none' : 'border-[#DDD5EE] text-[#5588AA]'}`}
                            onClick={() => handleAnswer(q.id, false)}
                          >
                            No
                          </Button>
                        </div>
                      )}

                      {q.type === 'NUMBER' && (
                        <div className="flex items-center gap-2 w-full">
                          <Input 
                            type="number" 
                            className="h-8 flex-1 bg-white border-[#DDD5EE] text-[10px] font-bold focus:border-[#F0C030] focus-visible:ring-0 rounded-lg text-[#1A1535]" 
                            placeholder="0"
                            defaultValue={answer?.value as string}
                            onBlur={(e) => handleAnswer(q.id, Number(e.target.value))}
                          />
                          <span className="text-[8px] font-bold uppercase text-[#5588AA]">UNS</span>
                        </div>
                      )}

                      {q.type === 'TEXT' && (
                        <Input 
                          className="h-8 w-full bg-white border-[#DDD5EE] text-[10px] font-bold focus:border-[#F0C030] focus-visible:ring-0 rounded-lg text-[#1A1535]" 
                          placeholder="Reveal data..."
                          defaultValue={answer?.value as string}
                          onBlur={(e) => handleAnswer(q.id, e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Button 
            className="mt-6 w-full bg-[#1A1535] hover:bg-[#2D2440] text-white font-bold uppercase text-[9px] tracking-widest py-5 rounded-xl transition-all active:scale-95 border-none font-mono"
            onClick={() => setIsModalOpen(false)}
          >
            INTEGRATE REVEAL
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
