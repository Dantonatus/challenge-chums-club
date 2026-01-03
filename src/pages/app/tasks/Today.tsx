import { format } from 'date-fns';
import { Star } from 'lucide-react';
import { QuickAdd } from '@/components/tasks/QuickAdd';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEmptyState } from '@/components/tasks/TaskEmptyState';
import { useTodayTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function TasksToday() {
  const { data: tasks, isLoading } = useTodayTasks();
  
  // Split into focus (P1-P2, max 3) and rest
  const focusTasks = tasks?.filter(t => 
    t.priority === 'p1' || t.priority === 'p2'
  ).slice(0, 3) || [];
  
  const restTasks = tasks?.filter(t => 
    !focusTasks.find(f => f.id === t.id)
  ) || [];

  const today = new Date();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <p className="text-muted-foreground">
            {format(today, 'EEEE, MMMM d')}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <span className="text-lg font-bold text-primary">
            {tasks?.length || 0}
          </span>
        </div>
      </div>

      {/* Quick Add */}
      <QuickAdd placeholder="Add a task for today..." />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : tasks?.length === 0 ? (
        <TaskEmptyState type="today" />
      ) : (
        <>
          {/* Top Focus Section */}
          {focusTasks.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Top Focus
                </h2>
              </div>
              <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-2">
                <TaskList 
                  tasks={focusTasks}
                  showDueDate={false}
                />
              </div>
            </section>
          )}

          {/* Rest of today */}
          {restTasks.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Also Today
              </h2>
              <TaskList 
                tasks={restTasks}
                showDueDate={false}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
