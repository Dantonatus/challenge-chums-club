import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Inbox, CalendarCheck, CalendarDays, FolderKanban, Archive, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';

const NAV_ITEMS = [
  { to: '/app/tasks/inbox', label: 'Inbox', icon: Inbox },
  { to: '/app/tasks/today', label: 'Heute', icon: CalendarCheck },
  { to: '/app/tasks/upcoming', label: 'Geplant', icon: CalendarDays },
  { to: '/app/tasks/projects', label: 'Projekte', icon: FolderKanban },
  { to: '/app/tasks/someday', label: 'Irgendwann', icon: Lightbulb },
  { to: '/app/tasks/archive', label: 'Archiv', icon: Archive },
];

export default function TasksLayout() {
  const location = useLocation();
  
  // Get task counts for badges
  const { data: allTasks } = useTasks({ status: ['open', 'in_progress'] });
  const today = new Date().toISOString().split('T')[0];
  
  // Inbox: P1-P3 without date (not P4)
  const inboxCount = allTasks?.filter(t => !t.due_date && t.priority !== 'p4').length || 0;
  const todayCount = allTasks?.filter(t => t.due_date === today).length || 0;
  // Someday: P4 without date
  const somedayCount = allTasks?.filter(t => !t.due_date && t.priority === 'p4').length || 0;

  const getBadge = (path: string) => {
    if (path === '/app/tasks/inbox' && inboxCount > 0) return inboxCount;
    if (path === '/app/tasks/today' && todayCount > 0) return todayCount;
    if (path === '/app/tasks/someday' && somedayCount > 0) return somedayCount;
    return null;
  };

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="shrink-0 lg:w-56">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const badge = getBadge(to);
            const isActive = location.pathname.startsWith(to);
            
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  'hover:bg-muted',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )} />
                <span className="whitespace-nowrap">{label}</span>
                {badge !== null && (
                  <span className={cn(
                    'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted-foreground/20 text-muted-foreground'
                  )}>
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
