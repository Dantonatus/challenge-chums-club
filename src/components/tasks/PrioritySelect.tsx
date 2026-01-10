import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/lib/tasks/types';

interface PrioritySelectProps {
  value: TaskPriority;
  onChange: (value: TaskPriority) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'p1', label: 'P1', color: 'text-red-500 border-red-500 bg-red-500/10' },
  { value: 'p2', label: 'P2', color: 'text-orange-500 border-orange-500 bg-orange-500/10' },
  { value: 'p3', label: 'P3', color: 'text-yellow-500 border-yellow-500 bg-yellow-500/10' },
  { value: 'p4', label: 'P4', color: 'text-green-500 border-green-500 bg-green-500/10' },
];

/**
 * Priority selector with pill buttons
 */
export function PrioritySelect({ value, onChange, disabled = false, size = 'default' }: PrioritySelectProps) {
  return (
    <div className="flex gap-2">
      {PRIORITIES.map((priority) => {
        const isSelected = value === priority.value;
        
        return (
          <button
            key={priority.value}
            type="button"
            onClick={() => onChange(priority.value)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 rounded-full border-2 font-medium transition-all',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm',
              isSelected
                ? priority.color
                : 'border-border text-muted-foreground hover:border-muted-foreground/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Flag className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
            {priority.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Small priority badge for display only
 */
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config = PRIORITIES.find(p => p.value === priority);
  if (!config || priority === 'p4') return null; // Don't show P4 (low priority)
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
      config.color
    )}>
      <Flag className="h-3 w-3" />
      {config.label}
    </span>
  );
}
