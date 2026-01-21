import { useState } from 'react';
import { MoreHorizontal, Plus, Trash2, ChevronRight, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskItemZen } from '@/components/tasks/TaskItemZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { QuickAdd } from '@/components/tasks/QuickAdd';
import { DraggableTaskItem } from './DraggableTaskItem';
import { useDeleteProject } from '@/hooks/useProjects';
import { getProjectPath } from '@/hooks/useProjectTree';
import type { Task, Project } from '@/lib/tasks/types';

interface ProjectDetailPanelProps {
  project: Project | null;
  projects: Project[];
  tasks: Task[];
  doneTasks: Task[];
  isLoading: boolean;
  onCreateSubproject: (parentId: string) => void;
}

export function ProjectDetailPanel({
  project,
  projects,
  tasks,
  doneTasks,
  isLoading,
  onCreateSubproject,
}: ProjectDetailPanelProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const deleteProject = useDeleteProject();

  const breadcrumbs = project ? getProjectPath(projects, project.id) : [];

  const handleDeleteProject = async () => {
    if (!project) return;
    if (confirm(`Projekt "${project.name}" wirklich löschen?`)) {
      await deleteProject.mutateAsync(project.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  // No project selected = unassigned tasks
  if (!project) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold">Ohne Projekt</h2>
        </div>

        <div className="p-4">
          <QuickAdd defaultProjectId={undefined} />
        </div>

        <ScrollArea className="flex-1 px-4">
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Keine unzugeordneten Tasks
            </p>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <DraggableTaskItem key={task.id} task={task}>
                  <TaskItemZen
                    task={task}
                    onEdit={setEditingTask}
                  />
                </DraggableTaskItem>
              ))}
            </div>
          )}
        </ScrollArea>

        <TaskDetailSheet
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header with breadcrumbs */}
      <div className="flex items-center justify-between px-4 py-3 border-b min-w-0">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {breadcrumbs.map((p, i) => (
            <div key={p.id} className="flex items-center min-w-0">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mx-1" />}
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className={`truncate ${i === breadcrumbs.length - 1 ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {p.name}
                </span>
              </div>
            </div>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreateSubproject(project.id)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Unterprojekt erstellen
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={handleDeleteProject}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Projekt löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {project.description && (
        <p className="px-4 py-2 text-sm text-muted-foreground border-b">
          {project.description}
        </p>
      )}

      {/* Quick add */}
      <div className="p-4 border-b">
        <QuickAdd defaultProjectId={project.id} />
      </div>

      {/* Tasks */}
      <ScrollArea className="flex-1 px-4 py-2">
        {tasks.length === 0 && doneTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Noch keine Tasks in diesem Projekt
          </p>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => (
              <DraggableTaskItem key={task.id} task={task}>
                <TaskItemZen
                  task={task}
                  onEdit={setEditingTask}
                />
              </DraggableTaskItem>
            ))}

            {/* Done tasks toggle */}
            {doneTasks.length > 0 && (
              <button
                onClick={() => setShowDone(!showDone)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 mt-2"
              >
                <ChevronRight className={`h-4 w-4 transition-transform ${showDone ? 'rotate-90' : ''}`} />
                {doneTasks.length} erledigt
              </button>
            )}

            {showDone && doneTasks.map((task) => (
              <DraggableTaskItem key={task.id} task={task}>
                <TaskItemZen
                  task={task}
                  onEdit={setEditingTask}
                />
              </DraggableTaskItem>
            ))}
          </div>
        )}
      </ScrollArea>

      <TaskDetailSheet
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />
    </div>
  );
}
