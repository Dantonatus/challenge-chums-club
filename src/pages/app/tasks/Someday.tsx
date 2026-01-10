import { useTasks } from '@/hooks/useTasks';
import { TaskList } from '@/components/tasks/TaskList';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Sparkles } from 'lucide-react';
import { QuickAdd } from '@/components/tasks/QuickAdd';

export default function TasksSomeday() {
  const { data: tasks, isLoading } = useTasks({ 
    status: ['open', 'in_progress'] 
  });

  // Someday = P4 tasks OR tasks without due date and P4
  const somedayTasks = tasks?.filter(t => 
    t.priority === 'p4' && !t.due_date
  ) || [];

  // Group by project for better organization
  const byProject: Record<string, typeof somedayTasks> = {};
  const noProject: typeof somedayTasks = [];

  somedayTasks.forEach(task => {
    if (task.project) {
      const projectId = task.project.id;
      if (!byProject[projectId]) {
        byProject[projectId] = [];
      }
      byProject[projectId].push(task);
    } else {
      noProject.push(task);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-amber-500" />
          Irgendwann / Vielleicht
        </h1>
        <p className="text-muted-foreground">
          Ideen und Aufgaben ohne konkreten Termin
        </p>
      </div>

      {/* Quick Add with P4 preset */}
      <QuickAdd 
        placeholder="Neue Idee hinzufügen..." 
        defaultPriority="p4"
      />

      {/* Task List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : somedayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <Sparkles className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="mb-1 text-lg font-semibold text-foreground">
            Platz für deine Ideen
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Sammle hier Aufgaben, die du irgendwann erledigen möchtest, 
            aber die nicht dringend sind.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tasks without project */}
          {noProject.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Ohne Projekt
              </h2>
              <TaskList
                tasks={noProject}
                emptyType="inbox"
                showProject={false}
                showDueDate={false}
              />
            </div>
          )}

          {/* Tasks grouped by project */}
          {Object.entries(byProject).map(([projectId, projectTasks]) => {
            const project = projectTasks[0]?.project;
            return (
              <div key={projectId}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: project?.color || '#6366f1' }}
                  />
                  {project?.name || 'Projekt'}
                  <span className="text-muted-foreground">
                    ({projectTasks.length})
                  </span>
                </h2>
                <TaskList
                  tasks={projectTasks}
                  emptyType="inbox"
                  showProject={false}
                  showDueDate={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}