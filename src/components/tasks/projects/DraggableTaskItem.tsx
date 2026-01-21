import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/tasks/types';

interface DraggableTaskItemProps {
  task: Task;
  children: React.ReactNode;
}

export function DraggableTaskItem({ task, children }: DraggableTaskItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50 z-50'
      )}
    >
      {children}
    </div>
  );
}

// Overlay shown during drag
export function TaskDragOverlay({ task }: { task: Task }) {
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 w-64">
      <div className="flex items-center gap-2">
        <div 
          className="h-2 w-2 rounded-full"
          style={{ 
            backgroundColor: task.priority === 'p1' ? 'hsl(0, 84%, 60%)' :
                           task.priority === 'p2' ? 'hsl(25, 95%, 53%)' :
                           task.priority === 'p3' ? 'hsl(47, 96%, 53%)' :
                           'hsl(142, 71%, 45%)'
          }}
        />
        <span className="font-medium truncate">{task.title}</span>
      </div>
      {task.project && (
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
          <div 
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: task.project.color }}
          />
          <span>{task.project.name}</span>
        </div>
      )}
    </div>
  );
}
