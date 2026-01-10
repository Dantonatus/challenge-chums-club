import { useState, useRef, useEffect } from 'react';
import { format, addDays, nextMonday } from 'date-fns';
import { Calendar, Sun, Sparkles, CalendarDays, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { PrioritySelect } from './PrioritySelect';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/lib/tasks/types';

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
 * Enhanced Add Task Modal
 * - Title, When, Priority, Project
 * - Large touch targets
 * - Quick date selection
 */
export function AddTaskModal({ open, onOpenChange, defaultProjectId }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<DateOption>('today');
  const [priority, setPriority] = useState<TaskPriority>('p3');
  const [projectId, setProjectId] = useState<string>(defaultProjectId || 'none');
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const { data: projects } = useProjects();

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      // Reset to defaults but keep project if provided
      setProjectId(defaultProjectId || 'none');
    }
  }, [open, defaultProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let due_date: string | undefined;
    const today = new Date();
    
    switch (selectedDate) {
      case 'today':
        due_date = format(today, 'yyyy-MM-dd');
        break;
      case 'tomorrow':
        due_date = format(addDays(today, 1), 'yyyy-MM-dd');
        break;
      case 'next_week':
        due_date = format(nextMonday(today), 'yyyy-MM-dd');
        break;
      case 'someday':
        due_date = undefined;
        break;
    }

    await createTask.mutateAsync({
      title: title.trim(),
      priority,
      due_date,
      project_id: projectId === 'none' ? undefined : projectId,
    });

    // Reset form
    setTitle('');
    setSelectedDate('today');
    setPriority('p3');
    setProjectId(defaultProjectId || 'none');
    onOpenChange(false);
  };

  const handleClose = () => {
    setTitle('');
    setSelectedDate('today');
    setPriority('p3');
    setProjectId(defaultProjectId || 'none');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Neue Aufgabe</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
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
            <p className="text-sm font-medium text-muted-foreground mb-2">Wann?</p>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedDate(option.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all',
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

          {/* Priority selection */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Priorität</p>
            <PrioritySelect value={priority} onChange={setPriority} size="sm" />
          </div>

          {/* Project selection */}
          {projects && projects.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Projekt</p>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-11">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Kein Projekt" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Projekt</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: project.color || 'hsl(var(--muted))' }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
