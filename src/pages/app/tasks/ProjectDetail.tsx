import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuickAdd } from '@/components/tasks/QuickAdd';
import { TaskList } from '@/components/tasks/TaskList';
import { useProject, useDeleteProject } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks, isLoading: tasksLoading } = useTasks({ 
    project_id: projectId,
    status: ['open', 'in_progress']
  });
  const deleteProject = useDeleteProject();

  const handleDelete = async () => {
    if (!projectId) return;
    await deleteProject.mutateAsync(projectId);
    navigate('/app/tasks/projects');
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
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={() => navigate('/app/tasks/projects')}>
          Back to projects
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
          aria-label="Back to projects"
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
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Add */}
      <QuickAdd 
        defaultProjectId={projectId} 
        placeholder={`Add task to ${project.name}...`}
      />

      {/* Task List */}
      {tasksLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <TaskList
          tasks={tasks || []}
          emptyType="project"
          showProject={false}
        />
      )}
    </div>
  );
}
