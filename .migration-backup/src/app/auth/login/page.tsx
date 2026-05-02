'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!email || !password) {
        toast.error('Please enter email and password');
        return;
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const text = await response.text();
      let payload: any;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error('Login API returned HTML. Check src/app/api/auth/login/route.ts');
      }

      if (!response.ok) {
        throw new Error(payload.message || 'Login failed');
      }

      toast.success('Logged in successfully');
      const redirectTo =
        payload.redirectTo ||
        payload.user?.redirectTo ||
        (payload.user?.role === 'ADMIN' ? '/admin' : '/faculty');
      router.replace(redirectTo);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.2),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.18),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] p-4 md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.48),rgba(255,255,255,0.86))]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div className="hidden rounded-[2.25rem] border border-white/70 bg-slate-950/95 p-8 text-white shadow-2xl shadow-slate-950/20 md:block">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 shadow-lg shadow-sky-500/30">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-200/80">Academia</p>
              <h1 className="text-2xl font-semibold tracking-tight">School academic management</h1>
            </div>
          </div>

          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300">
            A focused workspace for administrators and faculty, with authenticated APIs, live dashboards, and structured workflows.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sky-200">
                <ShieldCheck className="h-4 w-4" />
                Secure session
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">Access protected routes with cookie-backed authentication and role-aware navigation.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sky-200">
                <Users className="h-4 w-4" />
                Faculty + admin
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">Separate shells and workflows keep the operational UI clear and intentional.</p>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
              <Sparkles className="h-3.5 w-3.5" />
              Real-time dashboards
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200">
              <ArrowRight className="h-3.5 w-3.5" />
              API-backed views
            </span>
          </div>
        </div>

        <Card className="relative w-full overflow-hidden border-white/70 bg-white/90 shadow-2xl shadow-slate-200/70 backdrop-blur-xl md:min-h-[640px]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
          <CardHeader className="space-y-2 pb-6 text-center">
            <CardTitle className="text-2xl tracking-tight sm:text-3xl">Welcome back</CardTitle>
            <CardDescription className="text-slate-500">
              Sign in with your assigned school account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-slate-700" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  placeholder="name@school.edu"
                  type="email"
                  required
                  className="h-11 border-slate-200 bg-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-slate-700" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  required
                  className="h-11 border-slate-200 bg-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="h-11 w-full text-base shadow-sm" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-1 border-t bg-slate-50/70 p-6 pt-4 text-center text-sm text-slate-500">
            <p>Workspace access is determined by your server-side account role.</p>
            <p>Need help signing in? Contact IT support.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
