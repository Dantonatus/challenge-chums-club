import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Sparkles, Heart, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/app/recipes/library', label: 'Library', icon: BookOpen },
  { to: '/app/recipes/create', label: 'Create', icon: Sparkles },
  { to: '/app/recipes/favorites', label: 'Favorites', icon: Heart },
  { to: '/app/recipes/shopping', label: 'Shopping List', icon: ShoppingCart },
];

export default function RecipesLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="shrink-0 lg:w-56">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(to) || 
              (to === '/app/recipes/library' && location.pathname === '/app/recipes');

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
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                <span className="whitespace-nowrap">{label}</span>
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
