import { useState, useMemo } from 'react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskListZen } from '@/components/tasks/TaskListZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

/**
 * Zen Today View - Focus on what matters today
 * - Shows overdue tasks prominently
 * - Shows today's tasks
 * - Toggle to show completed today tasks
 * - Completion counter
 */
export default function TodayZen() {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Fetch open + done tasks for today
  const { data: openTasks, isLoading: loadingOpen } = useTasks({ 
    status: ['open', 'in_progress'] 
  });
  const { data: doneTasks, isLoading: loadingDone } = useTasks({ 
    status: 'done',
    due_date: todayStr
  });
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const dayName = format(today, 'EEEE', { locale: de });
  const dateString = format(today, 'd. MMMM', { locale: de });

  // Separate overdue and today tasks
  const { overdueTasks, todayTasks } = useMemo(() => {
    if (!openTasks) return { overdueTasks: [], todayTasks: [] };
    
    const overdue: Task[] = [];
    const todayList: Task[] = [];
    
    openTasks.forEach(task => {
      if (!task.due_date) return;
      const dueDate = parseISO(task.due_date);
      
      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task);
      } else if (isToday(dueDate)) {
        todayList.push(task);
      }
    });
    
    // Sort by priority
    const sortByPriority = (a: Task, b: Task) => {
      const order = { p1: 0, p2: 1, p3: 2, p4: 3 };
      return order[a.priority] - order[b.priority];
    };
    
    return {
      overdueTasks: overdue.sort(sortByPriority),
      todayTasks: todayList.sort(sortByPriority)
    };
  }, [openTasks]);

  // Today's done tasks
  const todayDoneTasks = useMemo(() => {
    return (doneTasks || []).sort((a, b) => {
      // Sort by completed_at descending
      const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
      const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [doneTasks]);

  const isLoading = loadingOpen || loadingDone;
  const totalOpen = overdueTasks.length + todayTasks.length;
  const totalDone = todayDoneTasks.length;
  const totalToday = totalOpen + totalDone;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{dayName}</h1>
        <p className="text-lg text-muted-foreground">{dateString}</p>
      </header>

      {/* Progress summary */}
      {totalToday > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${totalToday > 0 ? (totalDone / totalToday) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            {totalDone} von {totalToday}
          </span>
        </div>
      )}

      {/* Overdue section */}
      {overdueTasks.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">
              Überfällig
            </h2>
            <span className="text-sm text-destructive/70">
              ({overdueTasks.length})
            </span>
          </div>
          <TaskListZen tasks={overdueTasks} onEdit={setEditingTask} />
        </section>
      )}

      {/* Today section */}
      <section>
        {overdueTasks.length > 0 && todayTasks.length > 0 && (
          <h2 className="text-lg font-semibold mb-3">Heute</h2>
        )}
        <TaskListZen 
          tasks={todayTasks} 
          doneTasks={todayDoneTasks}
          onEdit={setEditingTask}
          emptyMessage="Keine Aufgaben für heute"
          showDoneToggle={true}
        />
      </section>

      {/* Detail Sheet */}
      <TaskDetailSheet
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />
    </div>
  );
}