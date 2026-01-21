import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Folder, Trash2, Check, X, Clock } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PrioritySelect } from './PrioritySelect';
import { RecurrenceSelect } from './RecurrenceSelect';
import { EffortSelect } from './EffortSelect';
import { TagSelect } from './TagSelect';
import { SubtaskList } from './SubtaskList';
import type { Task, TaskPriority, RecurringFrequency, TaskEffort } from '@/lib/tasks/types';
import { useUpdateTask, useDeleteTask, useCompleteTask } from '@/hooks/useTasks';
import { useCreateSubtask, useUpdateSubtask, useDeleteSubtask } from '@/hooks/useSubtasks';
import { useProjectsFlat } from '@/hooks/useProjectTree';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIME_OPTIONS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00',
];

/**
 * Task Detail Sheet - Full featured editor
 * - Title, Notes, Priority, Due Date & Time
 * - Recurrence, Effort, Tags, Subtasks
 * - Project selection
 */
export function TaskDetailSheet({ task, open, onOpenChange }: TaskDetailSheetProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [dueTime, setDueTime] = useState<string>('none');
  const [projectId, setProjectId] = useState<string>('none');
  const [priority, setPriority] = useState<TaskPriority>('p3');
  const [recurrence, setRecurrence] = useState<RecurringFrequency>('none');
  const [effort, setEffort] = useState<TaskEffort | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const { data: projects } = useProjectsFlat();

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || '');
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      setDueTime(task.due_time || 'none');
      setProjectId(task.project_id || 'none');
      setPriority(task.priority);
      setRecurrence(task.recurring_frequency);
      setEffort(task.effort);
      setSelectedTagIds(task.tags?.map(t => t.id) || []);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task || !title.trim()) return;

    // Update task basic fields
    await updateTask.mutateAsync({
      id: task.id,
      title: title.trim(),
      notes: notes.trim() || null,
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      due_time: dueTime === 'none' ? null : dueTime,
      project_id: projectId === 'none' ? null : projectId,
      priority,
      recurring_frequency: recurrence,
      effort,
    });

    // Update tags - remove old, add new
    const currentTagIds = task.tags?.map(t => t.id) || [];
    const toRemove = currentTagIds.filter(id => !selectedTagIds.includes(id));
    const toAdd = selectedTagIds.filter(id => !currentTagIds.includes(id));

    if (toRemove.length > 0) {
      await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', task.id)
        .in('tag_id', toRemove);
    }

    if (toAdd.length > 0) {
      await supabase
        .from('task_tags')
        .insert(toAdd.map(tag_id => ({ task_id: task.id, tag_id })));
    }

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

  const handleAddSubtask = async (title: string) => {
    if (!task) return;
    await createSubtask.mutateAsync({ taskId: task.id, title });
  };

  const handleToggleSubtask = async (id: string, done: boolean) => {
    await updateSubtask.mutateAsync({ id, done });
  };

  const handleDeleteSubtask = async (id: string) => {
    await deleteSubtask.mutateAsync(id);
  };

  if (!task) return null;

  const isDone = task.status === 'done';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
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

        <ScrollArea className="h-[calc(90vh-180px)] px-6">
          <div className="space-y-6 py-6">
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

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-4">
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
                      <Calendar className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'dd.MM.yy', { locale: de }) : 'Datum'}
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

              {/* Time */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Uhrzeit
                </label>
                <Select value={dueTime} onValueChange={setDueTime} disabled={isDone || !dueDate}>
                  <SelectTrigger className="h-12">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Zeit" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Keine Zeit</SelectItem>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time} Uhr
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Wiederholung
              </label>
              <RecurrenceSelect
                value={recurrence}
                onChange={setRecurrence}
                disabled={isDone}
              />
            </div>

            {/* Effort */}
            <EffortSelect
              value={effort}
              onChange={setEffort}
              disabled={isDone}
            />

            <Separator />

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
                        {project.parent_id && <span className="text-muted-foreground ml-2">↳</span>}
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

            {/* Tags */}
            <TagSelect
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              disabled={isDone}
            />

            <Separator />

            {/* Subtasks */}
            <SubtaskList
              subtasks={task.subtasks || []}
              onAdd={handleAddSubtask}
              onToggle={handleToggleSubtask}
              onDelete={handleDeleteSubtask}
              disabled={isDone}
            />

            <Separator />

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
          </div>
        </ScrollArea>

        {/* Fixed Actions Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t space-y-3">
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
      </SheetContent>
    </Sheet>
  );
}
