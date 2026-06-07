/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export default function HistoryTab() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const { data: allAnswers = [] } = useQuery({
    queryKey: ['user-all-answers', user?.id],
    queryFn: () => mockApi.getAnswers(user?.id || ''),
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['user-questions', user?.id],
    queryFn: () => mockApi.getUserQuestions(user?.id || ''),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: mockApi.getCategories,
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const dayAnswers = allAnswers.filter(a => a.date === selectedDateStr);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  return (
    <div className="space-y-6 px-4 pb-12 pt-4">
      <header className="border-b border-[#DDD5EE]/50 pb-4">
        <h1 className="text-sm font-bold tracking-[0.2em] text-[#1A1535]">ARCHIVE RECORD</h1>
        <p className="text-[8px] uppercase tracking-[0.25em] text-[#5588AA] mt-1">Past log matrix</p>
      </header>

      <Card className="border-2 border-[#1A1535] bg-white rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-4 bg-[#1A1535]/5 border-b border-[#DDD5EE]/50">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1A1535]">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7 border-[#DDD5EE] bg-white text-[#1A1535] hover:bg-[#EDE9F8] rounded-lg" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7 border-[#DDD5EE] bg-white text-[#1A1535] hover:bg-[#EDE9F8] rounded-lg" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-[#5588AA]">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <div key={d} className="py-1 tracking-widest">{d}</div>)}
            {days.map((day, i) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const dateStr = format(day, 'yyyy-MM-dd');
              const hasAnswers = allAnswers.some(a => a.date === dateStr);
              
              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-[10px] font-bold transition-all ${
                    isSelected ? 'bg-[#1A1535] text-white shadow-[2px_2px_0px_#F0C030]' : 'hover:bg-[#EDE9F8] text-[#5588AA]'
                  }`}
                  style={{ gridColumnStart: i === 0 ? day.getDay() + 1 : undefined }}
                >
                  <span className="relative z-10">{format(day, 'd')}</span>
                  {hasAnswers && !isSelected && (
                    <div className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-[#F0C030]" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-[8px] uppercase tracking-[0.2em] font-bold text-[#5588AA]">
          <History className="h-3.5 w-3.5 text-[#F0C030]" />
          {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'SELECT DATE LOG'}
        </h2>

        <div className="space-y-3">
          {dayAnswers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-[#DDD5EE] rounded-2xl bg-white/30 backdrop-blur-xs">
              <p className="text-[8px] text-[#5588AA] uppercase tracking-widest italic font-bold">No records saved on this date</p>
            </div>
          ) : (
            dayAnswers.map(ans => {
              const q = questions.find(q => q.id === ans.questionId);
              const cat = categories.find(c => c.id === q?.categoryId);
              if (!q) return null;

              return (
                <Card key={ans.id} className="border border-[#DDD5EE] bg-white/80 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <p className="text-[10px] font-bold text-[#1A1535] uppercase tracking-wide leading-relaxed">{q.text}</p>
                      {cat && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-[7px] font-bold text-[#5588AA] tracking-widest">{cat.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-3 py-1 bg-[#1A1535] text-white rounded-lg text-[9px] font-bold tracking-widest">
                        {typeof ans.value === 'boolean' ? (ans.value ? 'SÍ' : 'NO') : ans.value}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

