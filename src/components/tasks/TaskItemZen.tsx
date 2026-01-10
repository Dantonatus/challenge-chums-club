import { useState } from 'react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Check, MoreHorizontal, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Task } from '@/lib/tasks/types';
import { useCompleteTask, useDeleteTask, useRestoreTask } from '@/hooks/useTasks';

interface TaskItemZenProps {
  task: Task;
  onEdit?: (task: Task) => void;
  showRestoreAction?: boolean;
  className?: string;
}

/**
 * Zen TaskItem - Radically simplified for clarity
 * - Only shows ONE meta info (date OR project, never both)
 * - No priority chips (priority = position in list)
 * - Larger touch targets (56px row, 44px tap zones)
 * - Menu only on hover/tap
 */
export function TaskItemZen({ 
  task, 
  onEdit, 
  showRestoreAction = false,
  className 
}: TaskItemZenProps) {
  const [isHovered, setIsHovered] = useState(false);
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const restoreTask = useRestoreTask();

  const isDone = task.status === 'done';
  const isArchived = task.status === 'archived';
  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isDone;

  const handleComplete = () => {
    if (!isDone && !isArchived) {
      completeTask.mutate(task.id);
    }
  };

  const handleClick = () => {
    if (onEdit && !isDone && !isArchived) {
      onEdit(task);
    }
  };

  // Format date in a human-friendly way
  const formatDueDate = () => {
    if (!dueDate) return null;
    if (isToday(dueDate)) {
      if (task.due_time) return task.due_time.slice(0, 5);
      return 'Heute';
    }
    if (isTomorrow(dueDate)) return 'Morgen';
    return format(dueDate, 'd. MMM', { locale: de });
  };

  // Show only ONE meta info: prioritize date over project
  const metaInfo = formatDueDate() || (task.project?.name ?? null);

  return (
    <div
      className={cn(
        'group flex items-center gap-4 rounded-2xl px-4 transition-all duration-200',
        'min-h-[56px] cursor-pointer',
        'hover:bg-secondary/50',
        isDone && 'opacity-50',
        isOverdue && 'bg-destructive/5',
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
        disabled={completeTask.isPending}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center -ml-2',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full'
        )}
        aria-label={isDone ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
      >
        <div
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200',
            isDone
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/30 hover:border-primary/50'
          )}
        >
          {isDone && <Check className="h-4 w-4" strokeWidth={3} />}
        </div>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 py-3">
        <p
          className={cn(
            'text-base font-medium leading-snug truncate',
            isDone && 'line-through text-muted-foreground'
          )}
        >
          {task.title}
        </p>
        
        {/* Single meta info - date or project */}
        {metaInfo && (
          <p
            className={cn(
              'text-sm mt-0.5 truncate',
              isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
            )}
          >
            {metaInfo}
          </p>
        )}
      </div>

      {/* Menu - appears on hover */}
      <div
        className={cn(
          'shrink-0 transition-opacity duration-150',
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
