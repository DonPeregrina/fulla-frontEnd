/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { mockApi } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';
import MnesticsLogo from '@/components/MnesticsLogo';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Identificador muy corto'),
  password: z.string().min(4, 'Contraseña muy corta'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function SignIn() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const { user, role } = await mockApi.login(data.identifier, data.password);
      login(user, role);
      toast.success(`Bienvenido, ${user.name}`);
    } catch (error) {
      toast.error('Credenciales inválidas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col px-4 py-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        <div className="mb-8 text-center pt-4">
          {/* Animated custom Mu symbol / dynamic pixel reveal logo */}
          <MnesticsLogo size="xl" variant="reveal" className="mx-auto mb-4 drop-shadow-[0_4px_10px_rgba(26,21,53,0.15)]" />
          
          {/* Logo wordmark word with Space Mono-inspired styled labels */}
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1535] lowercase">
            mnestics<span className="text-[#5588AA]">.io</span>
          </h1>
          <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-[#5588AA] mt-1.5 leading-relaxed">
            Stable memory core <span className="text-[#F0C030]">•</span> dynamic reveal
          </p>
        </div>

        <Card className="border-[#DDD5EE] bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pb-4 bg-[#1A1535]/5 border-b border-[#DDD5EE]/50">
            <CardTitle className="text-xs font-bold tracking-[0.15em] text-[#1A1535] uppercase flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#F0C030]" /> Access Core Memory
            </CardTitle>
            <CardDescription className="text-[9px] text-[#5588AA]">
              Provide credentials to process frequency.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-1">
                <Label htmlFor="identifier" className="text-[9px] uppercase tracking-widest text-[#5588AA] ml-1">Core Identifier</Label>
                <Input
                  id="identifier"
                  placeholder="identifier or email"
                  {...register('identifier')}
                  className={`bg-[#EDE9F8]/30 border-[#DDD5EE] placeholder:text-[#B0A8CC] text-xs h-10 ${errors.identifier ? 'ring-1 ring-red-500' : ''}`}
                />
                {errors.identifier && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.identifier.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-[9px] uppercase tracking-widest text-[#5588AA] ml-1">Access Key</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`bg-[#EDE9F8]/30 border-[#DDD5EE] placeholder:text-[#B0A8CC] text-xs h-10 ${errors.password ? 'ring-1 ring-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wide">{errors.password.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" className="w-full bg-[#1A1535] text-white hover:bg-[#2D2440] font-bold h-11 tracking-wider border-none transition-all rounded-2xl flex items-center justify-center gap-2" disabled={isLoading}>
                {isLoading ? 'SYNCING...' : 'INITIATE CORE'}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <div className="mt-8 rounded-2xl bg-[#1A1535] p-4 text-[9px] text-[#AADDFF] border border-[#5588AA]/20 relative overflow-hidden">
          {/* Subtle logo vector trace in background of info box */}
          <div className="absolute right-2 bottom-2 text-[#5588AA]/10 select-none pointer-events-none text-4xl font-bold font-sans">
            μ
          </div>
          <p className="mb-2 font-bold text-[#F0C030] tracking-widest uppercase">System Core Demos:</p>
          <p className="text-[#8878AA]">Host / Curator: <span className="font-bold text-white">host@habitos.com</span> / pass</p>
          <p className="text-[#8878AA] mt-1">Normal Core (Juan): <span className="font-bold text-white">juanito</span> / pass</p>
          <Button 
            variant="ghost" 
            className="mt-3 h-auto p-0 text-[8px] uppercase tracking-[0.2em] text-[#E8503A] hover:text-red-300 w-full text-center block transition-all"
            onClick={() => { localStorage.clear(); window.location.reload(); }}
          >
            Reset Memory Core (localStorage)
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
