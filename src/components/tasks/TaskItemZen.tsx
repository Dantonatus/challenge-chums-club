import { useState } from 'react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, MoreHorizontal, Trash2, RotateCcw, Folder, Repeat, Clock, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PriorityBadge } from './PrioritySelect';
import type { Task } from '@/lib/tasks/types';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks/useTasks';

interface TaskItemZenProps {
  task: Task;
  onEdit?: (task: Task) => void;
  showRestoreAction?: boolean;
  className?: string;
}

/**
 * Enhanced TaskItem with rich indicators
 * - Priority badge (P1-P3)
 * - Recurring indicator 🔄
 * - Subtask progress [2/5]
 * - Due time display
 * - Tag color dots
 * - Completion animation
 */
export function TaskItemZen({ 
  task, 
  onEdit, 
  showRestoreAction = false,
  className 
}: TaskItemZenProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();

  const isDone = task.status === 'done';
  const isArchived = task.status === 'archived';
  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;
  const isRecurring = task.recurring_frequency && task.recurring_frequency !== 'none';
  
  // Subtask progress
  const subtasks = task.subtasks || [];
  const subtasksDone = subtasks.filter(s => s.done).length;
  const hasSubtasks = subtasks.length > 0;
  
  // Tags (show first 3)
  const tags = task.tags || [];
  const visibleTags = tags.slice(0, 3);

  const handleComplete = () => {
    if (!isDone && !isArchived) {
      setIsCompleting(true);
      // Delay actual completion for animation
      setTimeout(() => {
        completeTask.mutate(task.id);
      }, 300);
    }
  };

  const handleClick = () => {
    if (onEdit && !isDone && !isArchived && !isCompleting) {
      onEdit(task);
    }
  };

  // Format date in a human-friendly way
  const formatDueDate = () => {
    if (!dueDate) return null;
    if (isToday(dueDate)) return 'Heute';
    if (isTomorrow(dueDate)) return 'Morgen';
    return format(dueDate, 'd. MMM', { locale: de });
  };

  const dueDateText = formatDueDate();
  const projectName = task.project?.name;
  const projectColor = task.project?.color;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-2xl px-4 transition-all duration-300',
        'min-h-[56px] cursor-pointer',
        'hover:bg-secondary/50',
        isDone && 'opacity-50',
        isOverdue && 'bg-destructive/5',
        // Completion animation
        isCompleting && 'animate-fade-out opacity-0 scale-95',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Checkbox - 44px tap zone */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleComplete();
        }}
        disabled={completeTask.isPending || isCompleting}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center -ml-2',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full',
          'transition-transform duration-200',
          isCompleting && 'scale-110'
        )}
        aria-label={isDone ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
      >
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200',
            isDone || isCompleting
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 hover:border-primary/50'
          )}
        >
          {(isDone || isCompleting) && <Check className="h-4 w-4" strokeWidth={3} />}
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 py-2">
        <div className="flex items-center gap-2">
          {/* Priority badge (only P1-P3) */}
          <PriorityBadge priority={task.priority} />
          
          {/* Recurring indicator */}
          {isRecurring && (
            <span className="shrink-0 text-primary" title="Wiederkehrend">
              <Repeat className="h-3.5 w-3.5" />
            </span>
          )}
          
          <p
            className={cn(
              'text-base font-medium leading-snug truncate transition-all duration-200',
              (isDone || isCompleting) && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </p>
        </div>
        
        {/* Meta info row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Due date with color coding */}
          {dueDateText && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md',
                isOverdue 
                  ? 'bg-destructive/10 text-destructive font-medium' 
                  : isToday(dueDate!) 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                    : 'text-muted-foreground'
              )}
            >
              {dueDateText}
            </span>
          )}
          
          {/* Due time */}
          {task.due_time && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.due_time.slice(0, 5)}
            </span>
          )}
          
          {/* Subtask progress */}
          {hasSubtasks && (
            <span 
              className={cn(
                'inline-flex items-center gap-0.5 text-xs',
                subtasksDone === subtasks.length 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              )}
              title={`${subtasksDone} von ${subtasks.length} Unteraufgaben erledigt`}
            >
              <ListChecks className="h-3 w-3" />
              {subtasksDone}/{subtasks.length}
            </span>
          )}
          
          {/* Project */}
          {projectName && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[120px]">
              <div 
                className="h-2 w-2 rounded-full shrink-0" 
                style={{ backgroundColor: projectColor || 'hsl(var(--muted-foreground))' }}
              />
              {projectName}
            </span>
          )}
          
          {/* Created at date */}
          <span className="text-[11px] text-muted-foreground/60">
            ({format(parseISO(task.created_at), 'd.M.yy', { locale: de })})
          </span>
          
          {/* Tag dots */}
          {visibleTags.length > 0 && (
            <span className="inline-flex items-center gap-0.5">
              {visibleTags.map((tag) => (
                <div
                  key={tag.id}
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color || 'hsl(var(--primary))' }}
                  title={tag.name}
                />
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-muted-foreground ml-0.5">+{tags.length - 3}</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Menu - appears on hover */}
      <div
        className={cn(
          'shrink-0 transition-opacity duration-150',
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none',
          // Always show on touch devices via group-focus-within
          'group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {showRestoreAction && (isDone || isArchived) && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    restoreTask.mutate(task.id);
                  }}
                  className="text-primary focus:text-primary"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Wiederherstellen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                deleteTask.mutate(task.id);
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}