import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Dumbbell, ScanLine, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { to: '/app/training/overview', label: 'Übersicht', icon: LayoutGrid },
  { to: '/app/training', label: 'Training', icon: Dumbbell, exact: true },
  { to: '/app/training/bodyscan', label: 'Körper', icon: ScanLine },
  { to: '/app/training/weight', label: 'Gewicht', icon: Scale },
] as const;

export function ReportingSubnav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto rounded-full border border-health-hairline bg-health-surface/80 p-1 backdrop-blur"
      aria-label="Reporting-Bereiche"
    >
      {ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
              'min-h-[36px]',
              isActive
                ? 'bg-health-ink text-health-surface shadow-sm'
                : 'text-health-ink-muted hover:text-health-ink hover:bg-health-hairline/40',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
