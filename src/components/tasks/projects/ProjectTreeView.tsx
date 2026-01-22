import { useState, useEffect } from 'react';
import { Plus, Inbox } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectNode } from './ProjectNode';
import type { Project } from '@/lib/tasks/types';

interface ProjectTreeViewProps {
  projects: Project[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreateProject: () => void;
  onCreateSubproject?: (parentId: string) => void;
  onEditProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
}

export function ProjectTreeView({
  projects,
  isLoading,
  selectedId,
  onSelect,
  onCreateProject,
  onCreateSubproject,
  onEditProject,
  onDeleteProject,
}: ProjectTreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Auto-expand parents when a child is selected
  useEffect(() => {
    if (selectedId) {
      const findAndExpandParents = (nodes: Project[], targetId: string, parents: string[]): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) {
            setExpandedIds(prev => new Set([...prev, ...parents]));
            return true;
          }
          if (node.children && node.children.length > 0) {
            if (findAndExpandParents(node.children, targetId, [...parents, node.id])) {
              return true;
            }
          }
        }
        return false;
      };
      findAndExpandParents(projects, selectedId, []);
    }
  }, [selectedId, projects]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Droppable for unassigned tasks
  const { isOver: isOverUnassigned, setNodeRef: setUnassignedRef } = useDroppable({
    id: 'unassigned',
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h2 className="font-semibold text-sm">Projekte</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCreateProject}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {/* Unassigned drop zone */}
          <div
            ref={setUnassignedRef}
            onClick={() => onSelect(null)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
              'hover:bg-accent/50',
              selectedId === null && 'bg-accent',
              isOverUnassigned && 'bg-primary/10 ring-2 ring-primary ring-inset'
            )}
          >
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Ohne Projekt</span>
          </div>

          {/* Project tree */}
          {projects.map((project) => (
            <ProjectNode
              key={project.id}
              project={project}
              level={0}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              onEdit={onEditProject}
              onCreateSubproject={onCreateSubproject}
              onDelete={onDeleteProject}
            />
          ))}

          {projects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>Noch keine Projekte</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={onCreateProject}
              >
                Erstes Projekt erstellen
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
