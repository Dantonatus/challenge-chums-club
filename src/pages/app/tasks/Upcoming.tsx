import { useState, useMemo } from 'react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskListZen } from '@/components/tasks/TaskListZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { useUpcomingTasks } from '@/hooks/useTasks';
import type { Task } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

interface DayGroup {
  date: Date;
  label: string;
  sublabel?: string;
  tasks: Task[];
  isOverdue?: boolean;
  isToday?: boolean;
}

export default function TasksUpcoming() {
  const { data, isLoading } = useUpcomingTasks();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const groups = useMemo<DayGroup[]>(() => {
    if (!data) return [];
    const result: DayGroup[] = [];
    const today = new Date();

    if (data.overdue.length > 0) {
      result.push({
        date: today,
        label: 'Überfällig',
        tasks: data.overdue,
        isOverdue: true,
      });
    }

    const byDate = new Map<string, Task[]>();
    for (const task of data.upcoming) {
      if (!task.due_date) continue;
      if (!byDate.has(task.due_date)) byDate.set(task.due_date, []);
      byDate.get(task.due_date)!.push(task);
    }

    Array.from(byDate.keys()).sort().forEach(dateStr => {
      const date = parseISO(dateStr);
      const tasks = byDate.get(dateStr)!;
      let label = format(date, 'EEEE', { locale: de });
      let sublabel = format(date, 'd. MMMM', { locale: de });
      let isTodayGroup = false;

      if (isToday(date)) { label = 'Heute'; isTodayGroup = true; }
      else if (isTomorrow(date)) { label = 'Morgen'; }

      result.push({ date, label, sublabel, tasks, isToday: isTodayGroup });
    });

    return result;
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Demnächst</h1>
        <p className="text-lg text-muted-foreground mt-1">Geplante Aufgaben</p>
      </header>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-2xl mb-4">📅</span>
          <p className="text-muted-foreground">Keine geplanten Aufgaben</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group, idx) => (
            <section key={idx}>
              <div className="flex items-center gap-2 mb-3">
                {group.isOverdue && <AlertCircle className="h-5 w-5 text-destructive" />}
                <h2 className={cn('text-lg font-semibold', group.isOverdue && 'text-destructive')}>
                  {group.label}
                </h2>
                {group.sublabel && <span className="text-sm text-muted-foreground">• {group.sublabel}</span>}
              </div>
              <TaskListZen tasks={group.tasks} onEdit={setEditingTask} />
            </section>
          ))}
        </div>
      )}

      <TaskDetailSheet task={editingTask} open={!!editingTask} onOpenChange={(o) => !o && setEditingTask(null)} />
    </div>
  );
}
