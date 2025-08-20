import { useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/auth";
import { ArrowLeft, Home } from "lucide-react";

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
  const startBtnRef = useRef<HTMLButtonElement>(null);
  const [startMoving, setStartMoving] = useState(false);
  const handleStartClick = () => {
    if (startMoving) return;
    const btn = startBtnRef.current;
    if (!btn) { navigate('/'); return; }
    const padding = 16; const circle = 32; const right = 16;
    const slide = Math.max(0, btn.clientWidth - padding - right - circle);
    btn.style.setProperty('--slide-x', `${slide}px`);
    setStartMoving(true);
    setTimeout(() => navigate('/'), 380);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Zurück">
              <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
            </Button>

            <Button
              ref={startBtnRef}
              variant="cta"
              size="lg"
              className="relative overflow-hidden hover-scale animate-enter"
              onClick={handleStartClick}
              aria-label="Startseite"
            >
              <span className={"absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-primary/30 bg-background/70 backdrop-blur-sm " + (startMoving ? "circle-moving" : "") }>
                <Home className="h-4 w-4 text-[hsl(var(--cta-foreground))]" aria-hidden="true" />
              </span>
              <span className="pl-12 font-semibold">Start</span>
            </Button>

            <nav className="flex items-center gap-1">
              <NavLink to="/app/overview" className={linkClass}>
                {navigator.language.startsWith('de') ? 'Challenges' : 'Challenges'}
              </NavLink>
              <NavLink to="/app/groups" className={linkClass}>Groups</NavLink>
              <NavLink to="/app/ideas" className={linkClass}>Ideas</NavLink>
              <NavLink to="/app/ledger" className={linkClass}>Ledger</NavLink>
              <NavLink to="/app/journal" className={linkClass}>Journal</NavLink>
              <NavLink to="/app/profile" className={linkClass}>Profile</NavLink>
              <NavLink to="/app/summary" className={linkClass}>
                {navigator.language.startsWith('de') ? 'Übersicht' : 'Summary'}
              </NavLink>
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
