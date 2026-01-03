import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/tasks/types';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
  className?: string;
}

export function ProjectCard({ project, onClick, className }: ProjectCardProps) {
  const progress = project.task_count 
    ? Math.round((project.completed_count || 0) / project.task_count * 100) 
    : 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col rounded-2xl border bg-card p-5 text-left transition-all duration-200',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
    >
      {/* Color indicator */}
      <div
        className="absolute left-0 top-6 h-8 w-1 rounded-r-full transition-all group-hover:h-12"
        style={{ backgroundColor: project.color }}
      />

      <div className="ml-2">
        <h3 className="font-semibold text-foreground">{project.name}</h3>
        {project.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {project.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="ml-2 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-foreground">
            {project.task_count || 0}
          </span>
          <span className="text-sm text-muted-foreground">
            {project.task_count === 1 ? 'task' : 'tasks'}
          </span>
        </div>
        
        {project.task_count > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: project.color 
                }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {progress}%
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

export function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30 p-8 transition-all duration-200',
        'hover:border-primary/50 hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
    >
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Plus className="h-6 w-6 text-primary" />
      </div>
      <span className="font-medium text-foreground">New Project</span>
    </button>
  );
}
