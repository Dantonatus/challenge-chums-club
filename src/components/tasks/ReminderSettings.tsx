import { Bell, BellOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { REMINDER_OFFSETS } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

interface ReminderSettingsProps {
  enabled: boolean;
  offsetMinutes: number | null;
  onEnabledChange: (enabled: boolean) => void;
  onOffsetChange: (offset: number | null) => void;
  disabled?: boolean;
  hasDueDate?: boolean;
}

/**
 * Reminder settings component for TaskDetailSheet
 * - Toggle to enable/disable reminders
 * - Dropdown to select reminder offset (at due time, 15min before, etc.)
 */
export function ReminderSettings({
  enabled,
  offsetMinutes,
  onEnabledChange,
  onOffsetChange,
  disabled = false,
  hasDueDate = true,
}: ReminderSettingsProps) {
  if (!hasDueDate) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 text-muted-foreground">
        <BellOff className="h-5 w-5" />
        <span className="text-sm">Setze ein Fälligkeitsdatum für Erinnerungen</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className={cn(
            'h-5 w-5',
            enabled ? 'text-primary' : 'text-muted-foreground'
          )} />
          <Label htmlFor="reminder-toggle" className="font-medium">
            Erinnerung
          </Label>
        </div>
        <Switch
          id="reminder-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
        />
      </div>

      {enabled && (
        <Select
          value={offsetMinutes?.toString() || 'null'}
          onValueChange={(v) => onOffsetChange(v === 'null' ? null : parseInt(v))}
          disabled={disabled}
        >
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Wann erinnern?" />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_OFFSETS.map((option) => (
              <SelectItem 
                key={option.value?.toString() || 'null'} 
                value={option.value?.toString() || 'null'}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}