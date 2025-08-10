import { PropsWithChildren, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = '/auth';
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = '/auth';
      } else {
        setChecking(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
