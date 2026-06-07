/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { mockApi } from '@/lib/mockApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, LayoutGrid, Settings, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function UserProfileTab() {
  const { user, logout } = useAuth();

  const { data: groups = [] } = useQuery({
    queryKey: ['host-groups'],
    queryFn: () => mockApi.getGroups(''),
  });

  if (!user) return null;

  const userGroups = groups.filter(g => (user as any).groupIds.includes(g.id));

  return (
    <div className="space-y-6 px-4 pb-12 pt-4">
      <header className="border-b border-[#DDD5EE]/50 pb-4">
        <h1 className="text-sm font-bold tracking-[0.2em] text-[#1A1535]">IDENTITY STATUS</h1>
        <p className="text-[8px] uppercase tracking-[0.25em] text-[#5588AA] mt-1">Core operator profile</p>
      </header>

      <Card className="overflow-hidden border-2 border-[#1A1535] bg-white rounded-3xl shadow-sm">
        <div className="h-20 bg-[#1A1535] relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(240,192,48,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(240,192,48,0.15)_1px,transparent_1px)] bg-[size:6px_6px]" />
          <div className="absolute right-4 top-4 text-[#F0C030]/20 select-none font-sans text-xl font-bold">
            μ
          </div>
        </div>
        <CardContent className="relative pt-0">
          <div className="flex flex-col items-center -translate-y-10">
            <Avatar className="h-20 w-20 border-4 border-white shadow-md rounded-[28%] bg-[#1A1535]">
              <AvatarImage src={(user as any).avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-[#EDE9F8] text-[#1A1535] font-bold rounded-[28%]">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 text-center">
              <h2 className="text-sm font-bold text-[#1A1535] tracking-wide">{user.name.toUpperCase()}</h2>
              <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#5588AA]">@{(user as any).username}</p>
            </div>
          </div>

          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-[0.2em] text-[#5588AA]">
                <LayoutGrid className="h-3 w-3" />
                CLUSTER INDEX
              </h3>
              <div className="flex flex-wrap gap-2">
                {userGroups.length === 0 ? (
                  <p className="text-[8px] text-[#5588AA] uppercase italic tracking-widest">No matrix clusters assigned.</p>
                ) : (
                  userGroups.map(g => (
                    <Badge key={g.id} variant="secondary" className="bg-[#EDE9F8] text-[#1A1535] border border-[#DDD5EE] text-[8px] font-bold tracking-wider px-3 py-1">
                      {g.name.toUpperCase()}
                    </Badge>
                  ))
                )}
              </div>
            </section>

            <div className="grid gap-2 border-t border-[#DDD5EE] pt-6">
              <Button variant="ghost" className="justify-start text-[8px] font-bold uppercase tracking-[0.2em] text-[#5588AA] hover:bg-[#EDE9F8] hover:text-[#1A1535]">
                <Settings className="mr-3 h-4 w-4" /> CORE PREFERENCES
              </Button>
              <Button variant="ghost" className="justify-start text-[8px] font-bold uppercase tracking-[0.2em] text-[#5588AA] hover:bg-[#EDE9F8] hover:text-[#1A1535]">
                <Bell className="mr-3 h-4 w-4" /> NOTIFICATION CHANNELS
              </Button>
              <Button variant="ghost" className="justify-start text-[8px] font-bold uppercase tracking-[0.2em] text-[#E8503A] hover:bg-red-50 hover:text-red-600" onClick={logout}>
                <LogOut className="mr-3 h-4 w-4" /> TERMINATE SESSION
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

