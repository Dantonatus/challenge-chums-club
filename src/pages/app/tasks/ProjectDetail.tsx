import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Trash2, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickAdd } from '@/components/tasks/QuickAdd';
import { TaskListZen } from '@/components/tasks/TaskListZen';
import { TaskDetailSheet } from '@/components/tasks/TaskDetailSheet';
import { CreateProjectDialog } from '@/components/tasks/CreateProjectDialog';
import { useProject, useDeleteProject } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';
import type { Task } from '@/lib/tasks/types';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showCreateSubproject, setShowCreateSubproject] = useState(false);
  
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({ 
    project_id: projectId,
    status: ['open', 'in_progress']
  });
  const { data: doneTasks = [] } = useTasks({
    project_id: projectId,
    status: ['done']
  });
  const deleteProject = useDeleteProject();

  const handleDelete = async () => {
    if (!projectId) return;
    if (confirm(`Projekt "${project?.name}" wirklich löschen?`)) {
      await deleteProject.mutateAsync(projectId);
      navigate('/app/tasks/projects');
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Projekt nicht gefunden</p>
        <Button variant="link" onClick={() => navigate('/app/tasks/projects')}>
          Zurück zu Projekten
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/tasks/projects')}
          aria-label="Zurück zu Projekten"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div
          className="h-10 w-1 rounded-full"
          style={{ backgroundColor: project.color }}
        />

        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowCreateSubproject(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Unterprojekt erstellen
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Projekt löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Add */}
      <QuickAdd 
        defaultProjectId={projectId} 
        placeholder={`Aufgabe zu ${project.name} hinzufügen...`}
      />

      {/* Task List */}
      {tasksLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <TaskListZen
          tasks={tasks}
          doneTasks={doneTasks}
          onEdit={setEditingTask}
          emptyMessage="Noch keine Aufgaben in diesem Projekt"
          showDoneToggle
        />
      )}

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={editingTask}
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      />

      {/* Create Subproject Dialog */}
      <CreateProjectDialog
        open={showCreateSubproject}
        onOpenChange={setShowCreateSubproject}
        parentId={projectId}
      />
    </div>
  );
}
