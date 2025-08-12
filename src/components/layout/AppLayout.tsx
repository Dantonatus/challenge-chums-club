import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";

const AppLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch {}
    cleanupAuthState();
    navigate('/auth');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    }`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Zurück">
              <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
            </Button>
            <nav className="flex items-center gap-1">
              <NavLink to="/" className={linkClass}>Home</NavLink>
              <NavLink to="/app/groups" className={linkClass}>Groups</NavLink>
              <NavLink to="/challenges" className={linkClass}>Challenges</NavLink>
              <NavLink to="/app/ideas" className={linkClass}>Ideas</NavLink>
              <NavLink to="/app/ledger" className={linkClass}>Ledger</NavLink>
              <NavLink to="/app/journal" className={linkClass}>Journal</NavLink>
            </nav>
          </div>
          <Button variant="outline" onClick={handleLogout}>Log out</Button>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
