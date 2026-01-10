import { useState, useRef, useEffect } from 'react';
import { format, addDays, nextMonday } from 'date-fns';
import { Calendar, Sun, Sparkles, CalendarDays } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateTask } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

type DateOption = 'today' | 'tomorrow' | 'next_week' | 'someday';

const DATE_OPTIONS: { value: DateOption; label: string; icon: React.ReactNode }[] = [
  { value: 'today', label: 'Heute', icon: <Sun className="h-4 w-4" /> },
  { value: 'tomorrow', label: 'Morgen', icon: <Calendar className="h-4 w-4" /> },
  { value: 'next_week', label: 'Nächste Woche', icon: <CalendarDays className="h-4 w-4" /> },
  { value: 'someday', label: 'Irgendwann', icon: <Sparkles className="h-4 w-4" /> },
];

/**
 * Simple Add Task Modal
 * - Only 2 required fields: What + When
 * - Large touch targets
 * - Quick date selection
 */
export function AddTaskModal({ open, onOpenChange, defaultProjectId }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<DateOption>('today');
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let due_date: string | undefined;
    let priority: 'p1' | 'p2' | 'p3' | 'p4' = 'p3';

    const today = new Date();
    
    switch (selectedDate) {
      case 'today':
        due_date = format(today, 'yyyy-MM-dd');
        priority = 'p2';
        break;
      case 'tomorrow':
        due_date = format(addDays(today, 1), 'yyyy-MM-dd');
        priority = 'p3';
        break;
      case 'next_week':
        due_date = format(nextMonday(today), 'yyyy-MM-dd');
        priority = 'p3';
        break;
      case 'someday':
        due_date = undefined;
        priority = 'p4';
        break;
    }

    await createTask.mutateAsync({
      title: title.trim(),
      priority,
      due_date,
      project_id: defaultProjectId,
    });

    setTitle('');
    setSelectedDate('today');
    onOpenChange(false);
  };

  const handleClose = () => {
    setTitle('');
    setSelectedDate('today');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Neue Aufgabe</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Task title - large input */}
          <div>
            <label htmlFor="task-title" className="sr-only">
              Was möchtest du tun?
            </label>
            <Input
              ref={inputRef}
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Was möchtest du tun?"
              className="text-lg h-14 px-4 border-2 focus-visible:ring-primary"
              autoComplete="off"
            />
          </div>

          {/* Date selection - pill buttons */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Wann?</p>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedDate(option.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all',
                    'border-2',
                    selectedDate === option.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-secondary/50 text-foreground hover:border-primary/50'
                  )}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={!title.trim() || createTask.isPending}
            className="w-full h-12 text-base font-medium rounded-xl"
          >
            {createTask.isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              'Hinzufügen'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
