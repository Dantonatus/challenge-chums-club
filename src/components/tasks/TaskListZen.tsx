import { TaskItemZen } from './TaskItemZen';
import type { Task } from '@/lib/tasks/types';

interface TaskListZenProps {
  tasks: Task[];
  onEdit?: (task: Task) => void;
  showRestoreAction?: boolean;
  emptyMessage?: string;
}

/**
 * Zen TaskList - Simple, clean list with minimal visual noise
 */
export function TaskListZen({ 
  tasks, 
  onEdit, 
  showRestoreAction = false,
  emptyMessage = 'Keine Aufgaben'
}: TaskListZenProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <span className="text-2xl">✓</span>
        </div>
        <p className="text-muted-foreground text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => (
        <TaskItemZen
          key={task.id}
          task={task}
          onEdit={onEdit}
          showRestoreAction={showRestoreAction}
        />
      ))}
    </div>
  );
}
