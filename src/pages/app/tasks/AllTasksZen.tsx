import { useState, useMemo } from 'react';
import { format, parseISO, isToday, isTomorrow, isThisWeek, isPast, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskListZen } from '@/components/tasks/TaskListZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@/lib/tasks/types';
import { cn } from '@/lib/utils';

/**
 * Zen All Tasks View - Smart sections
 * - Überfällig (Overdue) - only if exists
 * - Heute (Today)
 * - Diese Woche (This Week)
 * - Später (Later)
 * - Irgendwann (Someday - no date)
 */

interface TaskSection {
  id: string;
  title: string;
  tasks: Task[];
  isOverdue?: boolean;
}

export default function AllTasksZen() {
  const { data: tasks, isLoading } = useTasks({ status: ['open', 'in_progress'] });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sections = useMemo<TaskSection[]>(() => {
    if (!tasks) return [];

    const overdue: Task[] = [];
    const today: Task[] = [];
    const thisWeek: Task[] = [];
    const later: Task[] = [];
    const someday: Task[] = [];

    const now = new Date();
    const weekEnd = addDays(now, 7);

    tasks.forEach((task) => {
      if (!task.due_date) {
        someday.push(task);
        return;
      }

      const dueDate = parseISO(task.due_date);

      if (isPast(dueDate) && !isToday(dueDate)) {
        overdue.push(task);
      } else if (isToday(dueDate)) {
        today.push(task);
      } else if (isTomorrow(dueDate) || (isThisWeek(dueDate) && dueDate <= weekEnd)) {
        thisWeek.push(task);
      } else {
        later.push(task);
      }
    });

    // Sort each section by priority then date
    const sortByPriorityAndDate = (a: Task, b: Task) => {
      const priorityOrder = { p1: 0, p2: 1, p3: 2, p4: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return 0;
    };

    const result: TaskSection[] = [];

    if (overdue.length > 0) {
      result.push({
        id: 'overdue',
        title: 'Überfällig',
        tasks: overdue.sort(sortByPriorityAndDate),
        isOverdue: true,
      });
    }

    if (today.length > 0) {
      result.push({
        id: 'today',
        title: 'Heute',
        tasks: today.sort(sortByPriorityAndDate),
      });
    }

    if (thisWeek.length > 0) {
      result.push({
        id: 'this-week',
        title: 'Diese Woche',
        tasks: thisWeek.sort(sortByPriorityAndDate),
      });
    }

    if (later.length > 0) {
      result.push({
        id: 'later',
        title: 'Später',
        tasks: later.sort(sortByPriorityAndDate),
      });
    }

    if (someday.length > 0) {
      result.push({
        id: 'someday',
        title: 'Irgendwann',
        tasks: someday.sort(sortByPriorityAndDate),
      });
    }

    return result;
  }, [tasks]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalTasks = tasks?.length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Alle Aufgaben</h1>
        {totalTasks > 0 && (
          <p className="text-lg text-muted-foreground mt-1">
            {totalTasks} {totalTasks === 1 ? 'Aufgabe' : 'Aufgaben'} offen
          </p>
        )}
      </header>

      {/* Sections */}
      {sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-2xl">🎉</span>
          </div>
          <p className="text-lg text-muted-foreground">Alles erledigt!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tippe auf + um eine neue Aufgabe hinzuzufügen
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.id}>
              <div className="flex items-center gap-2 mb-3">
                {section.isOverdue && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                <h2
                  className={cn(
                    'text-lg font-semibold',
                    section.isOverdue && 'text-destructive'
                  )}
                >
                  {section.title}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({section.tasks.length})
                </span>
              </div>
              <TaskListZen tasks={section.tasks} onEdit={setEditingTask} />
            </section>
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      <TaskDetailSheet
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />
    </div>
  );
}
