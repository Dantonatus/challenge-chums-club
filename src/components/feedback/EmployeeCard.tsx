import { FeedbackEmployee } from '@/lib/feedback/types';
import { cn } from '@/lib/utils';

interface Props {
  employee: FeedbackEmployee;
  isSelected: boolean;
  unsharedCount?: number;
  onClick: () => void;
}

export function EmployeeCard({ employee, isSelected, unsharedCount = 0, onClick }: Props) {
  const initials = employee.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
        isSelected
          ? 'bg-accent text-accent-foreground shadow-sm'
          : 'hover:bg-muted/60',
      )}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: employee.color }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{employee.name}</div>
        {employee.role && (
          <div className="truncate text-xs text-muted-foreground">{employee.role}</div>
        )}
      </div>
      {unsharedCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {unsharedCount}
        </span>
      )}
    </button>
  );
}
