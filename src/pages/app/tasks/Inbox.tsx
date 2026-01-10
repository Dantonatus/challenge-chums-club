import { useState } from 'react';
import { Inbox as InboxIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskListZen } from '@/components/tasks/TaskListZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { useTasks } from '@/hooks/useTasks';
import type { Task } from '@/lib/tasks/types';

/**
 * Inbox View - Tasks without a date or project
 * Like "Someday/Maybe" in GTD or Todoist Inbox
 */
export default function InboxZen() {
  const { data: allTasks, isLoading } = useTasks({ status: ['open', 'in_progress'] });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filter: no due_date AND no project_id
  const inboxTasks = allTasks?.filter(
    (task) => !task.due_date && !task.project_id
  ) || [];

  // Sort by priority, then by creation date (newest first)
  const sortedTasks = [...inboxTasks].sort((a, b) => {
    const priorityOrder = { p1: 0, p2: 1, p3: 2, p4: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <InboxIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
            <p className="text-muted-foreground">Ungeplante Aufgaben</p>
          </div>
        </div>
      </header>

      {/* Task count */}
      {sortedTasks.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {sortedTasks.length} {sortedTasks.length === 1 ? 'Aufgabe' : 'Aufgaben'} ohne Datum & Projekt
        </p>
      )}

      {/* Task list */}
      <TaskListZen
        tasks={sortedTasks}
        onEdit={setEditingTask}
        emptyMessage="Keine ungeplanten Aufgaben"
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
