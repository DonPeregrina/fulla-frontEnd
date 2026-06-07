/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { mockApi } from '@/lib/mockApi';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CollectionsTab() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const { data: users = [] } = useQuery({
    queryKey: ['host-users', user?.id],
    queryFn: () => mockApi.getUsersByHost(user?.id || ''),
  });

  // In a real app, we'd fetch stats for the month
  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  return (
    <div className="space-y-6 px-4 pb-12 pt-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#2D2440]">COLECCIONES</h1>
          <p className="text-[10px] uppercase tracking-[.1em] text-[#5A4A7A]">Sincronía de Grupos</p>
        </div>
      </header>

      <div className="space-y-6">
        {/* Calendar Card */}
        <Card className="border-2 border-[#DDD5EE] bg-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-[.15em] text-[#2D2440]">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7 border-[#DDD5EE]" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7 border-[#DDD5EE]" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#B0A8CC]">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <div key={d} className="py-2">{d}</div>)}
              {days.map((day, i) => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                
                // Mock completion stats
                const completionRate = Math.random(); 
                const colorClass = completionRate > 0.8 ? 'bg-[#F0C030]' : completionRate > 0.4 ? 'bg-[#DDD5EE]' : 'bg-[#EDE9F8]/30';

                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`relative flex aspect-square items-center justify-center rounded-lg text-[11px] font-bold transition-all ${
                      isSelected ? 'ring-2 ring-[#2D2440] shadow-[2px_2px_0px_#C8BEE0]' : ''
                    } ${isToday ? 'text-[#E8503A]' : 'text-[#2D2440]'}`}
                    style={{ gridColumnStart: i === 0 ? day.getDay() + 1 : undefined }}
                  >
                    <div className={`absolute inset-1 rounded-md ${colorClass}`} />
                    <span className="relative z-10">{format(day, 'd')}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detail List */}
        <Card className="border-2 border-[#DDD5EE] bg-white/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#8878AA]">
              <CalendarIcon className="h-4 w-4 text-[#F0C030]" />
              {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Users className="mb-2 h-10 w-10 text-[#DDD5EE]" />
                    <p className="text-[10px] uppercase tracking-widest text-[#B0A8CC]">Sin presencia detectada.</p>
                  </div>
                ) : (
                  users.map(u => (
                    <div key={u.id} className="flex items-center justify-between rounded-xl border-2 border-[#DDD5EE] bg-white p-3">
                      <div className="flex items-center gap-3">
                        <img src={u.avatarUrl} alt={u.name} className="h-10 w-10 rounded-full border-2 border-[#C4BAD8] bg-[#EDE9F8]" />
                        <div>
                          <p className="text-[10px] font-bold text-[#2D2440] uppercase tracking-wide">{u.name}</p>
                          <p className="text-[9px] font-bold text-[#B0A8CC]">@{u.username}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className="bg-[#EDE9F8] text-[#5A4A7A] border-none text-[8px] font-bold tracking-widest px-2 py-0.5">
                          {Math.random() > 0.3 ? 'VIGENTE' : 'PENDIENTE'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
