import { Repeat } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecurringFrequency } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

interface RecurrenceSelectProps {
  value: RecurringFrequency;
  onChange: (value: RecurringFrequency) => void;
  disabled?: boolean;
}

const RECURRENCE_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'none', label: 'Nicht wiederholen' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
];

/**
 * Recurrence Select Component
 * Allows setting task repetition frequency
 */
export function RecurrenceSelect({
  value,
  onChange,
  disabled = false,
}: RecurrenceSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-12">
        <div className="flex items-center gap-3">
          <Repeat
            className={cn(
              'h-5 w-5',
              value !== 'none' ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <SelectValue placeholder="Wiederholung" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {RECURRENCE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
