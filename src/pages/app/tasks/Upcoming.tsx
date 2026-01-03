import { format, parseISO, isToday, isTomorrow, isThisWeek, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertTriangle, Calendar } from 'lucide-react';
import { TaskList } from '@/components/tasks/TaskList';
import { TaskEmptyState } from '@/components/tasks/TaskEmptyState';
import { useUpcomingTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/tasks/types';

// Group tasks by date section
function groupByDate(tasks: Task[]) {
  const groups: { label: string; date: string; tasks: Task[] }[] = [];
  const today = new Date();

  const grouped = tasks.reduce((acc, task) => {
    if (!task.due_date) return acc;
    
    const date = parseISO(task.due_date);
    let label: string;

    if (isToday(date)) {
      label = 'Today';
    } else if (isTomorrow(date)) {
      label = 'Tomorrow';
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      label = format(date, 'EEEE', { locale: de });
    } else {
      label = format(date, 'EEEE, d MMMM', { locale: de });
    }

    const existing = acc.find(g => g.label === label);
    if (existing) {
      existing.tasks.push(task);
    } else {
      acc.push({ label, date: task.due_date, tasks: [task] });
    }

    return acc;
  }, [] as { label: string; date: string; tasks: Task[] }[]);

  return grouped;
}

export default function TasksUpcoming() {
  const { data, isLoading } = useUpcomingTasks();
  
  const overdueCount = data?.overdue?.length || 0;
  const upcomingGroups = data?.upcoming ? groupByDate(data.upcoming) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upcoming</h1>
          <p className="text-muted-foreground">
            Tasks scheduled for the future
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {(data?.overdue?.length || 0) + (data?.upcoming?.length || 0)} tasks
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : (!data?.overdue?.length && !data?.upcoming?.length) ? (
        <TaskEmptyState type="upcoming" />
      ) : (
        <div className="space-y-8">
          {/* Overdue Section */}
          {overdueCount > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-4 w-4" />
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  Overdue ({overdueCount})
                </h2>
              </div>
              <div className="rounded-2xl border-2 border-red-500/20 bg-red-500/5 p-2">
                <TaskList 
                  tasks={data?.overdue || []}
                  showDueDate={true}
                />
              </div>
            </section>
          )}

          {/* Upcoming by Date */}
          {upcomingGroups.map((group) => (
            <section key={group.date}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <TaskList 
                tasks={group.tasks}
                showDueDate={false}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
