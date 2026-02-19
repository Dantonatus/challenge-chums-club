import { useRef, useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cleanupAuthState } from "@/lib/auth";
import { ArrowLeft, Home, ListTodo, UtensilsCrossed, CalendarRange, MessageSquare, Dumbbell, MoreHorizontal, ShieldCheck, Users, User, BookOpen } from "lucide-react";
import { MatrixDarkModeToggle } from "@/components/ui/MatrixDarkModeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon?: LucideIcon;
}

const PRIMARY_NAV: NavItem[] = [
  { to: "/app/challenges", label: "Challenges" },
  { to: "/app/summary", label: "Übersicht" },
  { to: "/app/entry", label: "Entry" },
  { to: "/app/tasks", label: "Tasks", icon: ListTodo },
  { to: "/app/training", label: "Training", icon: Dumbbell },
  { to: "/app/recipes", label: "Recipes", icon: UtensilsCrossed },
  { to: "/app/planning", label: "Planung", icon: CalendarRange },
  { to: "/app/feedback", label: "Feedback", icon: MessageSquare },
  { to: "/app/learning", label: "Learning", icon: BookOpen },
];

const SECONDARY_NAV_BASE: NavItem[] = [
  { to: "/app/groups", label: "Groups", icon: Users },
  { to: "/app/profile", label: "Profile", icon: User },
];

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user?.id) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", auth.user.id)
          .single();
        setUserRole(roleData?.role || null);
      }
    };
    checkRole();
  }, []);

  const secondaryNav: NavItem[] = [
    ...SECONDARY_NAV_BASE,
    ...(userRole === "admin"
      ? [{ to: "/app/approval", label: "Approval", icon: ShieldCheck }]
      : []),
  ];

  const isSecondaryActive = secondaryNav.some((item) =>
    location.pathname.startsWith(item.to)
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {}
    cleanupAuthState();
    navigate("/auth");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`;

  const startBtnRef = useRef<HTMLButtonElement>(null);
  const [startMoving, setStartMoving] = useState(false);
  const handleStartClick = () => {
    if (startMoving) return;
    const btn = startBtnRef.current;
    if (!btn) { navigate("/"); return; }
    const padding = 16; const circle = 32; const right = 16;
    const slide = Math.max(0, btn.clientWidth - padding - right - circle);
    btn.style.setProperty("--slide-x", `${slide}px`);
    setStartMoving(true);
    setTimeout(() => navigate("/"), 380);
  };

  // Desktop layout
  if (!isMobile) {
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
                <span className={"absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-primary/30 bg-background/70 backdrop-blur-sm " + (startMoving ? "circle-moving" : "")}>
                  <Home className="h-4 w-4 text-[hsl(var(--cta-foreground))]" aria-hidden="true" />
                </span>
                <span className="pl-12 font-semibold">Start</span>
              </Button>

              <nav className="flex items-center gap-1">
                {PRIMARY_NAV.map((item) => (
                  <NavLink key={item.to} to={item.to} className={linkClass}>
                    {item.icon && <item.icon className="mr-1 h-4 w-4 inline" />}
                    {item.label}
                  </NavLink>
                ))}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                        isSecondaryActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      Mehr
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover border z-50">
                    {secondaryNav.map((item) => (
                      <DropdownMenuItem key={item.to} asChild>
                        <NavLink to={item.to} className="flex items-center gap-2 w-full cursor-pointer">
                          {item.icon && <item.icon className="h-4 w-4" />}
                          {item.label}
                        </NavLink>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <MatrixDarkModeToggle />
              <Button variant="outline" onClick={handleLogout}>Log out</Button>
            </div>
          </div>
        </header>
        <main className="container py-6">
          <Outlet />
        </main>
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <header className="border-b bg-card/50">
        <div className="container flex items-center justify-between py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Zurück">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            ref={startBtnRef}
            variant="cta"
            size="sm"
            className="relative overflow-hidden"
            onClick={handleStartClick}
            aria-label="Startseite"
          >
            <Home className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <MatrixDarkModeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>Log out</Button>
          </div>
        </div>
      </header>
      <main className="container py-4">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card z-40 flex items-center justify-around py-2">
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 text-[10px] px-2 py-1 rounded-md transition-colors ${
                isActive ? "text-accent-foreground bg-accent" : "text-muted-foreground"
              }`}
            >
              {Icon ? <Icon className="h-5 w-5" /> : <span className="h-5 w-5 flex items-center justify-center text-xs font-bold">{item.label[0]}</span>}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex flex-col items-center gap-0.5 text-[10px] px-2 py-1 rounded-md transition-colors ${
                isSecondaryActive ? "text-accent-foreground bg-accent" : "text-muted-foreground"
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>Mehr</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="bg-popover border z-50">
            {secondaryNav.map((item) => (
              <DropdownMenuItem key={item.to} asChild>
                <NavLink to={item.to} className="flex items-center gap-2 w-full cursor-pointer">
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </NavLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  );
};

export default AppLayout;
