import { cn } from '@/lib/utils';
import { PRIORITY_LABELS, type TaskPriority } from '@/lib/tasks/types';

interface PriorityChipProps {
  priority: TaskPriority;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  p1: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  p2: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  p3: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  p4: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30',
};

export function PriorityChip({ priority, size = 'sm', onClick, className }: PriorityChipProps) {
  const Component = onClick ? 'button' : 'span';
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border font-medium uppercase tracking-wider transition-colors',
        PRIORITY_STYLES[priority],
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      aria-label={`Priority: ${PRIORITY_LABELS[priority]}`}
    >
      {priority}
    </Component>
  );
}
