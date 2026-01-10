import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TaskItemZen } from './TaskItemZen';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

interface TaskListZenProps {
  tasks: Task[];
  doneTasks?: Task[];
  onEdit?: (task: Task) => void;
  showRestoreAction?: boolean;
  emptyMessage?: string;
  showDoneToggle?: boolean;
}

/**
 * Zen TaskList with optional "Show completed" toggle
 * - Clean list with minimal visual noise
 * - Toggle to show/hide completed tasks
 * - Animated transitions
 */
export function TaskListZen({ 
  tasks, 
  doneTasks = [],
  onEdit, 
  showRestoreAction = false,
  emptyMessage = 'Keine Aufgaben',
  showDoneToggle = false
}: TaskListZenProps) {
  const [showDone, setShowDone] = useState(false);

  const hasOpenTasks = tasks.length > 0;
  const hasDoneTasks = doneTasks.length > 0;
  const showToggle = showDoneToggle && hasDoneTasks;

  if (!hasOpenTasks && !showDone) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-muted-foreground text-lg">{emptyMessage}</p>
        </div>
        
        {/* Show toggle even when no open tasks */}
        {showToggle && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDone(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Eye className="mr-2 h-4 w-4" />
              {doneTasks.length} erledigte anzeigen
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Open tasks */}
      {hasOpenTasks && (
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
      )}

      {/* Toggle for completed tasks */}
      {showToggle && (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDone(!showDone)}
            className={cn(
              "w-full justify-start text-muted-foreground hover:text-foreground",
              showDone && "text-foreground"
            )}
          >
            {showDone ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                Erledigte ausblenden
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                {doneTasks.length} erledigte anzeigen
              </>
            )}
          </Button>
        </div>
      )}

      {/* Completed tasks (when visible) */}
      {showDone && hasDoneTasks && (
        <div className="space-y-1 animate-fade-in">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 pt-2">
            Erledigt
          </p>
          {doneTasks.map((task) => (
            <TaskItemZen
              key={task.id}
              task={task}
              onEdit={onEdit}
              showRestoreAction={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}