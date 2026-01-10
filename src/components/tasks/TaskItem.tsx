import { useState } from 'react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Check, 
  Clock, 
  MoreHorizontal, 
  Calendar, 
  FolderKanban,
  Trash2,
  Edit2,
  Timer,
  RotateCcw,
  FolderArchive,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PriorityChip } from './PriorityChip';
import type { Task } from '@/lib/tasks/types';
import { useCompleteTask, useDeleteTask, useSnoozeTask, useRestoreTask, useArchiveTask, useMoveToSomeday } from '@/hooks/useTasks';
import { getSnoozeDate } from '@/lib/tasks/parser';

interface TaskItemProps {
  task: Task;
  onEdit?: (task: Task) => void;
  showProject?: boolean;
  showDueDate?: boolean;
  showRestoreAction?: boolean;
  className?: string;
}

export function TaskItem({ 
  task, 
  onEdit, 
  showProject = true, 
  showDueDate = true,
  showRestoreAction = false,
  className 
}: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const snoozeTask = useSnoozeTask();
  const restoreTask = useRestoreTask();
  const archiveTask = useArchiveTask();
  const moveToSomeday = useMoveToSomeday();

  const isDone = task.status === 'done';
  const isArchived = task.status === 'archived';
  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;

  const handleComplete = () => {
    if (!isDone && !isArchived) {
      completeTask.mutate(task.id);
    }
  };

  const handleSnooze = (option: 'later' | 'tomorrow' | 'next_week') => {
    const newDate = getSnoozeDate(option);
    snoozeTask.mutate({ 
      id: task.id, 
      due_date: format(newDate, 'yyyy-MM-dd') 
    });
  };

  const formatDueDate = () => {
    if (!dueDate) return null;
    if (isToday(dueDate)) return 'Today';
    if (isTomorrow(dueDate)) return 'Tomorrow';
    return format(dueDate, 'd MMM', { locale: de });
  };

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-transparent p-3 transition-all duration-200',
        'hover:border-border hover:bg-card/50',
        isDone && 'opacity-60',
        isOverdue && 'border-red-500/20 bg-red-500/5',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox */}
      <div className="pt-0.5">
        <Checkbox
          checked={isDone}
          onCheckedChange={handleComplete}
          disabled={completeTask.isPending}
          className={cn(
            'h-5 w-5 rounded-full border-2 transition-all',
            isDone ? 'border-primary bg-primary' : 'border-muted-foreground/40'
          )}
          aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              'text-sm font-medium leading-tight',
              isDone && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </h4>
          
          {/* Actions */}
          <div
            className={cn(
              'flex items-center gap-1 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Restore action for done/archived tasks */}
                {showRestoreAction && (isDone || isArchived) && (
                  <>
                    <DropdownMenuItem 
                      onClick={() => restoreTask.mutate(task.id)}
                      className="text-green-600 focus:text-green-600"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Wiederherstellen
                    </DropdownMenuItem>
                    {isDone && (
                      <DropdownMenuItem onClick={() => archiveTask.mutate(task.id)}>
                        <FolderArchive className="mr-2 h-4 w-4" />
                        Archivieren
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* Regular actions for active tasks */}
                {!isDone && !isArchived && (
                  <>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(task)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Bearbeiten
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleSnooze('later')}>
                      <Timer className="mr-2 h-4 w-4" />
                      In 2 Stunden
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSnooze('tomorrow')}>
                      <Clock className="mr-2 h-4 w-4" />
                      Morgen früh
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSnooze('next_week')}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Nächste Woche
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => moveToSomeday.mutate(task.id)}>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Irgendwann
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem 
                  onClick={() => deleteTask.mutate(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <PriorityChip priority={task.priority} />
          
          {showDueDate && dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs',
                isOverdue ? 'text-red-500' : 'text-muted-foreground'
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatDueDate()}
              {task.due_time && ` ${task.due_time.slice(0, 5)}`}
            </span>
          )}

          {showProject && task.project && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <FolderKanban className="h-3 w-3" />
              {task.project.name}
            </span>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="flex gap-1">
              {task.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ 
                    backgroundColor: `${tag.color}20`,
                    color: tag.color 
                  }}
                >
                  {tag.name}
                </span>
              ))}
              {task.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{task.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Subtasks progress */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${(task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {task.subtasks.filter(s => s.done).length}/{task.subtasks.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
