import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskListZen } from '@/components/tasks/TaskListZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { useTodayTasks } from '@/hooks/useTasks';
import type { Task } from '@/lib/tasks/types';

/**
 * Zen Today View - Focus on what matters today
 * - Clean header with date
 * - Simple task list
 * - Detail sheet for editing
 */
export default function TodayZen() {
  const { data: tasks, isLoading } = useTodayTasks();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const today = new Date();
  const dayName = format(today, 'EEEE', { locale: de });
  const dateString = format(today, 'd. MMMM', { locale: de });

  // Sort: P1/P2 first (important), then by creation
  const sortedTasks = tasks?.sort((a, b) => {
    const priorityOrder = { p1: 0, p2: 1, p3: 2, p4: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }) || [];

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

      {/* Task count */}
      {sortedTasks.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {sortedTasks.length} {sortedTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} für heute
        </p>
      )}

      {/* Task list */}
      <TaskListZen
        tasks={sortedTasks}
        onEdit={setEditingTask}
        emptyMessage="Keine Aufgaben für heute"
      />

      {/* Detail Sheet */}
      <TaskDetailSheet
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />
    </div>
  );
}
