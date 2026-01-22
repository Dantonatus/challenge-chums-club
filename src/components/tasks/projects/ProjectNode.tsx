import { useState } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, Pencil, FolderPlus, Trash2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { Project } from '@/lib/tasks/types';

interface ProjectNodeProps {
  project: Project;
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit?: (project: Project) => void;
  onCreateSubproject?: (parentId: string) => void;
  onDelete?: (project: Project) => void;
}

export function ProjectNode({
  project,
  level,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  onEdit,
  onCreateSubproject,
  onDelete,
}: ProjectNodeProps) {
  const hasChildren = project.children && project.children.length > 0;
  const isExpanded = expandedIds.has(project.id);
  const isSelected = selectedId === project.id;

  const { isOver, setNodeRef } = useDroppable({
    id: project.id,
  });

  const handleClick = () => {
    onSelect(project.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(project.id);
  };

  const progress = project.task_count 
    ? Math.round((project.completed_count || 0) / project.task_count * 100) 
    : 0;

  const nodeContent = (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
        'hover:bg-accent/50',
        isSelected && 'bg-accent',
        isOver && 'bg-primary/10 ring-2 ring-primary ring-inset'
      )}
      style={{ paddingLeft: `${level * 16 + 12}px` }}
    >
      {/* Expand/Collapse button */}
      <button
        onClick={handleToggle}
        className={cn(
          'p-0.5 rounded hover:bg-accent',
          !hasChildren && 'invisible'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Color indicator */}
      <div
        className="h-3 w-3 rounded-full shrink-0"
        style={{ backgroundColor: project.color }}
      />

      {/* Folder icon */}
      {isExpanded || isSelected ? (
        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
      ) : (
        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
      )}

      {/* Project name */}
      <span className="flex-1 truncate text-sm font-medium">
        {project.name}
      </span>

      {/* Task count badge */}
      {project.task_count !== undefined && project.task_count > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-8 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {project.completed_count}/{project.task_count}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {nodeContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onEdit?.(project)}>
            <Pencil className="h-4 w-4 mr-2" />
            Bearbeiten
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCreateSubproject?.(project.id)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Unterprojekt erstellen
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete?.(project)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children (subprojects) */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {project.children!.map((child) => (
            <ProjectNode
              key={child.id}
              project={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onCreateSubproject={onCreateSubproject}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
