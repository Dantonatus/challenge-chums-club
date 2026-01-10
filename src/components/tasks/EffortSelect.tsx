import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskEffort } from '@/lib/tasks/types';
import { EFFORT_LABELS } from '@/lib/tasks/types';

interface EffortSelectProps {
  value: TaskEffort | null;
  onChange: (value: TaskEffort | null) => void;
  disabled?: boolean;
}

const EFFORT_OPTIONS: TaskEffort[] = ['xs', 's', 'm', 'l', 'xl'];

/**
 * Effort Select Component
 * Pill-button style for time estimates
 */
export function EffortSelect({
  value,
  onChange,
  disabled = false,
}: EffortSelectProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Geschätzter Aufwand
      </label>
      <div className="flex flex-wrap gap-2">
        {EFFORT_OPTIONS.map((effort) => (
          <button
            key={effort}
            type="button"
            onClick={() => onChange(value === effort ? null : effort)}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              'border-2',
              value === effort
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-secondary/50 text-foreground hover:border-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {EFFORT_LABELS[effort]}
          </button>
        ))}
      </div>
    </div>
  );
}
