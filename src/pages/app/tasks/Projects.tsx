import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { ProjectCard, NewProjectCard } from '@/components/tasks/ProjectCard';
import { CreateProjectDialog } from '@/components/tasks/CreateProjectDialog';
import { useProjects } from '@/hooks/useProjects';
import { Skeleton } from '@/components/ui/skeleton';

export default function TasksProjects() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects('active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Organize related tasks together
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FolderKanban className="h-4 w-4" />
          <span className="text-sm">{projects?.length || 0} projects</span>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => navigate(`/app/tasks/projects/${project.id}`)}
            />
          ))}
          <NewProjectCard onClick={() => setShowCreateDialog(true)} />
        </div>
      )}

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
