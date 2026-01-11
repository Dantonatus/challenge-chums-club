import { Settings, Sun, Moon, Monitor, Inbox, CalendarCheck, CalendarDays, Calendar, Bell, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTaskPreferences, type DefaultView, type ThemePreference } from '@/hooks/useTaskPreferences';
import { PRIORITY_COLORS, REMINDER_OFFSETS, type TaskPriority } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

const VIEW_OPTIONS: { value: DefaultView; label: string; icon: React.ElementType }[] = [
  { value: 'inbox', label: 'Inbox', icon: Inbox },
  { value: 'today', label: 'Heute', icon: CalendarCheck },
  { value: 'upcoming', label: 'Demnächst', icon: CalendarDays },
  { value: 'calendar', label: 'Kalender', icon: Calendar },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Hell', icon: Sun },
  { value: 'dark', label: 'Dunkel', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

interface TaskPreferencesDialogProps {
  trigger?: React.ReactNode;
}

/**
 * Task Preferences Dialog
 * - Default view selection
 * - Default priority for new tasks
 * - Reminder defaults
 * - Theme toggle (light/dark/system)
 */
export function TaskPreferencesDialog({ trigger }: TaskPreferencesDialogProps) {
  const { preferences, setPreferences, resetPreferences } = useTaskPreferences();

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
            <span className="sr-only">Einstellungen</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Task-Einstellungen
          </DialogTitle>
          <DialogDescription>
            Personalisiere deine Task-Ansicht und Standardwerte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Default View */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Startansicht</Label>
            <div className="grid grid-cols-2 gap-2">
              {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPreferences({ defaultView: value })}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all',
                    preferences.defaultView === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Icon className={cn(
                    'h-4 w-4',
                    preferences.defaultView === value ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Default Priority */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Standard-Priorität</Label>
            <div className="flex items-center gap-2">
              {(['p1', 'p2', 'p3', 'p4'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreferences({ defaultPriority: p })}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-all',
                    preferences.defaultPriority === p
                      ? 'ring-2 ring-primary ring-offset-2 scale-110'
                      : 'opacity-60 hover:opacity-100'
                  )}
                  style={{ backgroundColor: PRIORITY_COLORS[p] }}
                  title={`Priorität ${p.toUpperCase()}`}
                >
                  <span className="text-sm font-bold text-white">{p.toUpperCase()}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Wird bei neuen Aufgaben automatisch gesetzt.
            </p>
          </div>

          <Separator />

          {/* Reminder Defaults */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className={cn(
                  'h-4 w-4',
                  preferences.reminderEnabled ? 'text-primary' : 'text-muted-foreground'
                )} />
                <Label htmlFor="reminder-default" className="text-sm font-medium">
                  Erinnerungen standardmäßig aktiv
                </Label>
              </div>
              <Switch
                id="reminder-default"
                checked={preferences.reminderEnabled}
                onCheckedChange={(checked) => setPreferences({ reminderEnabled: checked })}
              />
            </div>

            {preferences.reminderEnabled && (
              <Select
                value={preferences.reminderOffsetMinutes?.toString() || 'null'}
                onValueChange={(v) => setPreferences({ 
                  reminderOffsetMinutes: v === 'null' ? null : parseInt(v) 
                })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Standard-Vorlaufzeit" />
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

          <Separator />

          {/* Theme Toggle */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Erscheinungsbild</Label>
            <div className="flex items-center gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPreferences({ theme: value })}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-2.5 transition-all',
                    preferences.theme === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Icon className={cn(
                    'h-4 w-4',
                    preferences.theme === value ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={resetPreferences}
            className="w-full gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Auf Standardwerte zurücksetzen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
