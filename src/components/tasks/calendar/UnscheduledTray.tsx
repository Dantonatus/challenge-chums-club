import { useDroppable } from '@dnd-kit/core';
import { CalendarTaskCard } from './CalendarTaskCard';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/tasks/types';

interface UnscheduledTrayProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function UnscheduledTray({ tasks, onTaskClick }: UnscheduledTrayProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unscheduled',
    data: { date: null },
  });

  if (tasks.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Ungeplant ({tasks.length})
      </h3>
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-wrap gap-2 p-2 rounded-lg min-h-[60px]',
          'bg-muted/30 border border-dashed',
          isOver && 'bg-primary/10 border-primary',
        )}
      >
        {tasks.map((task) => (
          <div key={task.id} className="w-[180px]">
            <CalendarTaskCard
              task={task}
              onClick={() => onTaskClick(task)}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Aufgaben auf einen Tag ziehen zum Einplanen
      </p>
    </div>
  );
}