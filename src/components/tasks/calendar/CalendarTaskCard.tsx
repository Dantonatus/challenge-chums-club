import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { PRIORITY_COLORS } from '@/lib/tasks/types';
import type { Task } from '@/lib/tasks/types';

interface CalendarTaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

export function CalendarTaskCard({ task, onClick, isDragging }: CalendarTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: PRIORITY_COLORS[task.priority],
      }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg border-l-4 bg-card cursor-grab active:cursor-grabbing',
        'hover:shadow-md transition-shadow text-left w-full',
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <p className="text-sm font-medium line-clamp-2">{task.title}</p>
      
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
        {task.due_time && (
          <span>🕐 {task.due_time}</span>
        )}
        {task.project && (
          <span className="flex items-center gap-1">
            <span 
              className="h-2 w-2 rounded-full" 
              style={{ backgroundColor: task.project.color || 'hsl(var(--muted))' }}
            />
            {task.project.name}
          </span>
        )}
      </div>
    </div>
  );
}