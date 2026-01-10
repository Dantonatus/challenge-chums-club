import { TaskItem } from './TaskItem';
import { TaskEmptyState } from './TaskEmptyState';
import type { Task } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

interface TaskListProps {
  tasks: Task[];
  emptyType?: 'inbox' | 'today' | 'upcoming' | 'project';
  showProject?: boolean;
  showDueDate?: boolean;
  showRestoreAction?: boolean;
  onEditTask?: (task: Task) => void;
  className?: string;
}

export function TaskList({
  tasks,
  emptyType = 'inbox',
  showProject = true,
  showDueDate = true,
  showRestoreAction = false,
  onEditTask,
  className,
}: TaskListProps) {
  if (tasks.length === 0) {
    return <TaskEmptyState type={emptyType} />;
  }

  return (
    <div className={cn('space-y-1', className)}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onEdit={onEditTask}
          showProject={showProject}
          showDueDate={showDueDate}
          showRestoreAction={showRestoreAction}
        />
      ))}
    </div>
  );
}
