import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // If already logged in, go to app
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.href = '/app';
      }
    });
  }, []);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      cleanupAuthState();
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = '/app';
    } catch (err: any) {
      toast({ title: 'Sign in failed', description: err.message, variant: 'destructive' as any });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const redirectUrl = `${window.location.origin}/app`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      toast({ title: 'Check your email', description: 'Confirm your email to finish signup.' });
    } catch (err: any) {
      toast({ title: 'Sign up failed', description: err.message, variant: 'destructive' as any });
    }
  };

  return (
    <main className="container py-10">
      <Helmet>
        <title>Sign in or Create Account | Character Challenge</title>
        <meta name="description" content="Sign in or create an account to join groups and track challenges." />
        <link rel="canonical" href="/auth" />
      </Helmet>
      <section className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</CardTitle>
            <CardDescription>Use email and password to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === 'signin' ? handleSignin : handleSignup} className="space-y-3">
              <div>
                <label className="sr-only" htmlFor="email">Email</label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="sr-only" htmlFor="password">Password</label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full">{mode === 'signin' ? 'Sign in' : 'Sign up'}</Button>
            </form>
            <div className="mt-4 text-sm text-muted-foreground">
              {mode === 'signin' ? (
                <button className="underline" onClick={() => setMode('signup')}>New here? Create an account</button>
              ) : (
                <button className="underline" onClick={() => setMode('signin')}>Have an account? Sign in</button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
