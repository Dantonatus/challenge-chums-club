import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, closestCenter, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useProjectTree } from '@/hooks/useProjectTree';
import { useTasks } from '@/hooks/useTasks';
import { useMoveTask } from '@/hooks/useMoveTask';
import { ProjectTreeView } from '@/components/tasks/projects/ProjectTreeView';
import { ProjectDetailPanel } from '@/components/tasks/projects/ProjectDetailPanel';
import { TaskDragOverlay } from '@/components/tasks/projects/DraggableTaskItem';
import { CreateProjectDialog } from '@/components/tasks/CreateProjectDialog';
import type { Task, Project } from '@/lib/tasks/types';
import { findProjectInTree } from '@/hooks/useProjectTree';

export default function TasksProjects() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDialogParentId, setCreateDialogParentId] = useState<string | undefined>();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const { data: projectTree = [], isLoading: projectsLoading } = useProjectTree();
  const { data: allTasks = [], isLoading: tasksLoading } = useTasks({ status: ['open', 'in_progress'] });
  const { data: allDoneTasks = [] } = useTasks({ status: ['done'] });
  const moveTask = useMoveTask();

  // Filter tasks for selected project
  const projectTasks = useMemo(() => {
    if (selectedProjectId === null) {
      // Unassigned tasks
      return allTasks.filter(t => !t.project_id);
    }
    return allTasks.filter(t => t.project_id === selectedProjectId);
  }, [allTasks, selectedProjectId]);

  const projectDoneTasks = useMemo(() => {
    if (selectedProjectId === null) {
      return allDoneTasks.filter(t => !t.project_id);
    }
    return allDoneTasks.filter(t => t.project_id === selectedProjectId);
  }, [allDoneTasks, selectedProjectId]);

  // Get selected project object
  const selectedProject = useMemo(() => {
    if (selectedProjectId === null) return null;
    return findProjectInTree(projectTree, selectedProjectId);
  }, [projectTree, selectedProjectId]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetId = over.id as string;

    // Determine target project ID
    const newProjectId = targetId === 'unassigned' ? null : targetId;

    // Only move if different from current
    const task = allTasks.find(t => t.id === taskId) || allDoneTasks.find(t => t.id === taskId);
    if (task && task.project_id !== newProjectId) {
      moveTask.mutate({ taskId, projectId: newProjectId });
    }
  };

  const handleCreateProject = () => {
    setCreateDialogParentId(undefined);
    setShowCreateDialog(true);
  };

  const handleCreateSubproject = (parentId: string) => {
    setCreateDialogParentId(parentId);
    setShowCreateDialog(true);
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-8rem)] gap-0 -mx-4 -mt-4">
        {/* Left: Project Tree */}
        <div className="w-64 shrink-0 border-r bg-muted/30">
          <ProjectTreeView
            projects={projectTree}
            isLoading={projectsLoading}
            selectedId={selectedProjectId}
            onSelect={setSelectedProjectId}
            onCreateProject={handleCreateProject}
          />
        </div>

        {/* Right: Project Detail with Tasks */}
        <ProjectDetailPanel
          project={selectedProject}
          projects={projectTree}
          tasks={projectTasks}
          doneTasks={projectDoneTasks}
          isLoading={tasksLoading}
          onCreateSubproject={handleCreateSubproject}
        />
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && <TaskDragOverlay task={activeTask} />}
      </DragOverlay>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        parentId={createDialogParentId}
      />
    </DndContext>
  );
}
