import { useState } from 'react';
import { useTasks, useRestoreTask, useArchiveTask } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { Skeleton } from '@/components/ui/skeleton';
import { Archive, CheckCircle2, FolderArchive, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TasksArchive() {
  const [activeTab, setActiveTab] = useState<'done' | 'archived'>('done');
  
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Archiv</h1>
        <p className="text-muted-foreground">
          Erledigte und archivierte Aufgaben
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'done' | 'archived')}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="done" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Erledigt
              {completedTasks.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {completedTasks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <FolderArchive className="h-4 w-4" />
              Archiviert
              {permanentlyArchived.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
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
            >
              <FolderArchive className="mr-2 h-4 w-4" />
              Alte archivieren ({oldTasksCount})
            </Button>
          )}
        </div>

        <TabsContent value="done" className="mt-4">
          {completedTasks.length === 0 ? (
            <EmptyState 
              icon={CheckCircle2}
              title="Keine erledigten Aufgaben"
              description="Erledigte Aufgaben erscheinen hier. Du kannst sie wiederherstellen oder dauerhaft archivieren."
            />
          ) : (
            <TaskList
              tasks={completedTasks}
              emptyType="inbox"
              showProject
              showDueDate
              showRestoreAction
            />
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          {permanentlyArchived.length === 0 ? (
            <EmptyState 
              icon={FolderArchive}
              title="Keine archivierten Aufgaben"
              description="Dauerhaft archivierte Aufgaben werden hier aufbewahrt."
            />
          ) : (
            <TaskList
              tasks={permanentlyArchived}
              emptyType="inbox"
              showProject
              showDueDate
              showRestoreAction
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}