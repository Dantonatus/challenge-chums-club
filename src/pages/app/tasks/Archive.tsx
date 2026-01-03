import { useTasks } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { Skeleton } from '@/components/ui/skeleton';
import { Archive } from 'lucide-react';

export default function TasksArchive() {
  const { data: tasks, isLoading } = useTasks({ status: 'done' });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const completedTasks = tasks || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Archiv</h1>
        <p className="text-muted-foreground">
          {completedTasks.length} erledigte {completedTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}
        </p>
      </div>

      {completedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <Archive className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-foreground">Keine erledigten Aufgaben</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Erledigte Aufgaben werden hier archiviert.
          </p>
        </div>
      ) : (
        <TaskList
          tasks={completedTasks}
          emptyType="inbox"
          showProject
          showDueDate
        />
      )}
    </div>
  );
}
