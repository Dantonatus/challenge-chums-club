import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Inbox, CalendarCheck, CalendarDays, Calendar, List, FolderKanban, Archive, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { AddTaskFAB } from '@/components/tasks/AddTaskFAB';
import { useTaskReminders } from '@/hooks/useTaskReminders';
import { TaskPreferencesDialog } from '@/components/tasks/TaskPreferencesDialog';
import { useTaskPreferences } from '@/hooks/useTaskPreferences';

/**
 * Zen Tasks Layout - Simplified Navigation
 * - 6 main views including Calendar
 * - Clean sidebar on desktop, bottom nav on mobile
 * - FAB always visible, reminders active
 */

const NAV_ITEMS = [
  { to: '/app/tasks/inbox', label: 'Inbox', icon: Inbox },
  { to: '/app/tasks/today', label: 'Heute', icon: CalendarCheck },
  { to: '/app/tasks/upcoming', label: 'Demnächst', icon: CalendarDays },
  { to: '/app/tasks/calendar', label: 'Kalender', icon: Calendar },
  { to: '/app/tasks/all', label: 'Alle', icon: List },
  { to: '/app/tasks/projects', label: 'Projekte', icon: FolderKanban },
  { to: '/app/tasks/archive', label: 'Archiv', icon: Archive },
];

export default function TasksLayoutZen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { preferences } = useTaskPreferences();
  
  // Activate reminders system
  useTaskReminders();
  
  // Redirect to default view on first load at /app/tasks
  useEffect(() => {
    if (location.pathname === '/app/tasks' || location.pathname === '/app/tasks/') {
      const viewPath = `/app/tasks/${preferences.defaultView === 'calendar' ? 'calendar' : preferences.defaultView}`;
      navigate(viewPath, { replace: true });
    }
  }, [location.pathname, preferences.defaultView, navigate]);
  
  // Get task counts for badges
  const { data: allTasks } = useTasks({ status: ['open', 'in_progress'] });
  const today = new Date().toISOString().split('T')[0];
  
  const inboxCount = allTasks?.filter(t => !t.due_date && !t.project_id).length || 0;
  const todayCount = allTasks?.filter(t => t.due_date === today).length || 0;
  const overdueCount = allTasks?.filter(t => t.due_date && t.due_date < today).length || 0;
  const allCount = allTasks?.length || 0;

  const getBadge = (path: string) => {
    if (path === '/app/tasks/inbox' && inboxCount > 0) return inboxCount;
    if (path === '/app/tasks/today' && (todayCount + overdueCount) > 0) return todayCount + overdueCount;
    if (path === '/app/tasks/all' && allCount > 0) return allCount;
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 w-52 pr-6">
        <nav className="sticky top-6 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const badge = getBadge(to);
            const isActive = location.pathname.startsWith(to);
            
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
                {badge !== null && (
                  <span className={cn(
                    'ml-auto text-sm font-semibold',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}
          
          {/* Settings button */}
          <div className="pt-4 border-t border-border/50 mt-4">
            <TaskPreferencesDialog 
              trigger={
                <button className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-medium transition-all w-full text-muted-foreground hover:text-foreground hover:bg-secondary">
                  <Settings className="h-5 w-5" />
                  <span>Einstellungen</span>
                </button>
              }
            />
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-md">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          {/* Show first 5 nav items on mobile */}
          {NAV_ITEMS.slice(0, 5).map(({ to, label, icon: Icon }) => {
            const badge = getBadge(to);
            const isActive = location.pathname.startsWith(to);
            
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors min-w-[48px]',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge !== null && (
                    <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-0.5">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            );
          })}
          
          {/* Settings button on mobile */}
          <TaskPreferencesDialog
            trigger={
              <button className="flex flex-col items-center gap-0.5 py-2 rounded-xl transition-colors min-w-[48px] text-muted-foreground">
                <Settings className="h-5 w-5" />
                <span className="text-[10px] font-medium">Mehr</span>
              </button>
            }
          />
        </div>
      </nav>

      {/* Floating Action Button */}
      <AddTaskFAB />
    </div>
  );
}
