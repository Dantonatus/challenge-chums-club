import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Folder, Trash2, Check, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PrioritySelect } from './PrioritySelect';
import type { Task, TaskPriority } from '@/lib/tasks/types';
import { useUpdateTask, useDeleteTask, useCompleteTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Task Detail Sheet - Slides up from bottom
 * - Full edit capabilities including Priority
 * - Progressive disclosure (starts minimal)
 * - Touch-friendly controls
 */
export function TaskDetailSheet({ task, open, onOpenChange }: TaskDetailSheetProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [projectId, setProjectId] = useState<string>('none');
  const [priority, setPriority] = useState<TaskPriority>('p3');
  
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const { data: projects } = useProjects();

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || '');
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      setProjectId(task.project_id || 'none');
      setPriority(task.priority);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task || !title.trim()) return;

    await updateTask.mutateAsync({
      id: task.id,
      title: title.trim(),
      notes: notes.trim() || null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      project_id: projectId === 'none' ? null : projectId,
      priority,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    onOpenChange(false);
  };

  const handleComplete = async () => {
    if (!task) return;
    await completeTask.mutateAsync(task.id);
    onOpenChange(false);
  };

  if (!task) return null;

  const isDone = task.status === 'done';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-6 pb-8">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">Aufgabe bearbeiten</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Title */}
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Aufgabentitel"
              className="text-lg font-medium h-14 border-2"
              disabled={isDone}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Priorität
            </label>
            <PrioritySelect 
              value={priority} 
              onChange={setPriority} 
              disabled={isDone}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Notizen
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Füge Notizen hinzu..."
              className="min-h-[100px] resize-none"
              disabled={isDone}
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Fällig am
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full h-12 justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                  disabled={isDone}
                >
                  <Calendar className="mr-3 h-5 w-5" />
                  {dueDate ? format(dueDate, 'PPP', { locale: de }) : 'Kein Datum'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  locale={de}
                  initialFocus
                />
                {dueDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDueDate(undefined)}
                      className="w-full"
                    >
                      Datum entfernen
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Project */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Projekt
            </label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isDone}>
              <SelectTrigger className="h-12">
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-muted-foreground" />
                  <SelectValue placeholder="Kein Projekt" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Projekt</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: project.color || 'hsl(var(--muted))' }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-3">
            {!isDone && (
              <Button
                onClick={handleComplete}
                variant="outline"
                className="w-full h-12 text-primary border-primary hover:bg-primary/10"
                disabled={completeTask.isPending}
              >
                <Check className="mr-2 h-5 w-5" />
                Als erledigt markieren
              </Button>
            )}
            
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                variant="outline"
                className="flex-1 h-12 text-destructive border-destructive/30 hover:bg-destructive/10"
                disabled={deleteTask.isPending}
              >
                <Trash2 className="mr-2 h-5 w-5" />
                Löschen
              </Button>
              
              <Button
                onClick={handleSave}
                className="flex-1 h-12"
                disabled={!title.trim() || updateTask.isPending || isDone}
              >
                Speichern
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
