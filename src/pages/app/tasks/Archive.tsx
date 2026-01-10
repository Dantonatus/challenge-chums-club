import { useState } from 'react';
import { useTasks, useArchiveTask } from '@/hooks/useTasks';
import { TaskListZen } from '@/components/tasks/TaskListZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, FolderArchive } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/tasks/types';

export default function TasksArchive() {
  const [activeTab, setActiveTab] = useState<'done' | 'archived'>('done');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const { data: doneTasks, isLoading: loadingDone } = useTasks({ status: 'done' });
  const { data: archivedTasks, isLoading: loadingArchived } = useTasks({ status: 'archived' });
  const archiveTask = useArchiveTask();

  const isLoading = loadingDone || loadingArchived;
  const completedTasks = doneTasks || [];
  const permanentlyArchived = archivedTasks || [];

  // Archive all old completed tasks (older than 7 days)
  const handleArchiveOld = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const oldTasks = completedTasks.filter(t => 
      t.completed_at && new Date(t.completed_at) < sevenDaysAgo
    );
    
    for (const task of oldTasks) {
      await archiveTask.mutateAsync(task.id);
    }
  };

  const oldTasksCount = completedTasks.filter(t => {
    if (!t.completed_at) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(t.completed_at) < sevenDaysAgo;
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Archiv</h1>
        <p className="text-lg text-muted-foreground mt-1">
          Erledigte und archivierte Aufgaben
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'done' | 'archived')}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="h-11">
            <TabsTrigger value="done" className="gap-2 px-4">
              <CheckCircle2 className="h-4 w-4" />
              Erledigt
              {completedTasks.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {completedTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2 px-4">
              <FolderArchive className="h-4 w-4" />
              Archiviert
              {permanentlyArchived.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {permanentlyArchived.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {activeTab === 'done' && oldTasksCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleArchiveOld}
              disabled={archiveTask.isPending}
              className="rounded-xl"
            >
              <FolderArchive className="mr-2 h-4 w-4" />
              Alte archivieren ({oldTasksCount})
            </Button>
          )}
        </div>

        <TabsContent value="done" className="mt-6">
          <TaskListZen
            tasks={completedTasks}
            onEdit={setEditingTask}
            showRestoreAction
            emptyMessage="Keine erledigten Aufgaben"
          />
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          <TaskListZen
            tasks={permanentlyArchived}
            onEdit={setEditingTask}
            showRestoreAction
            emptyMessage="Keine archivierten Aufgaben"
          />
        </TabsContent>
      </Tabs>

      {/* Detail Sheet for viewing archived tasks */}
      <TaskDetailSheet
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />
    </div>
  );
}
