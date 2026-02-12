import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { usePlanningProjects, useGanttTasks } from '@/hooks/useGanttTasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Settings, FileDown } from 'lucide-react';
import { GanttChart } from './GanttChart';
import { GanttTaskSheet } from './GanttTaskSheet';
import { GanttProjectSheet } from './GanttProjectSheet';
import { MilestoneSheet } from '@/components/planning/MilestoneSheet';
import { GanttTask, PlanningProject, MilestoneWithClient } from '@/lib/planning/types';
import { GanttPhaseDescriptions } from './GanttPhaseDescriptions';
import { Skeleton } from '@/components/ui/skeleton';
import { exportGanttPDF } from '@/lib/planning/exportGanttPDF';

export function GanttPage() {
  const { clients, isLoading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const { projects, isLoading: projectsLoading } = usePlanningProjects(selectedClientId || undefined);
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  const { tasks, milestones, isLoading: tasksLoading } = useGanttTasks(selectedProjectId || undefined);

  // Sheets
  const [editTask, setEditTask] = useState<GanttTask | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [editProject, setEditProject] = useState<PlanningProject | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [editMilestone, setEditMilestone] = useState<MilestoneWithClient | null>(null);

  // When client changes, reset project selection
  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    setSelectedProjectId('');
  };

  const handleExportPDF = () => {
    if (!selectedProject || !selectedClient) return;
    exportGanttPDF(selectedProject, tasks, milestones as MilestoneWithClient[], selectedClient);
  };

  if (clientsLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Client select */}
        <div className="w-52">
          <Select value={selectedClientId} onValueChange={handleClientChange}>
            <SelectTrigger>
              <SelectValue placeholder="Kunde wählen" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Project select */}
        {selectedClientId && (
          <div className="w-52">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Projekt wählen" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Actions */}
        {selectedClientId && (
          <Button variant="outline" size="sm" onClick={() => setShowNewProject(true)}>
            <Plus className="h-4 w-4 mr-1" /> Projekt
          </Button>
        )}

        {selectedProjectId && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditProject(selectedProject)}>
              <Settings className="h-4 w-4 mr-1" /> Projekt
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowNewTask(true)}>
              <Plus className="h-4 w-4 mr-1" /> Aufgabe
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-1" /> PDF
            </Button>
          </>
        )}
      </div>

      {/* Empty states */}
      {!selectedClientId && (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Wähle einen Kunden, um die Projektplanung zu starten.
        </div>
      )}

      {selectedClientId && !selectedProjectId && !projectsLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm gap-3">
          <p>{projects.length === 0 ? 'Noch keine Projekte für diesen Kunden.' : 'Wähle ein Projekt aus.'}</p>
          {projects.length === 0 && (
            <Button size="sm" onClick={() => setShowNewProject(true)}>
              <Plus className="h-4 w-4 mr-1" /> Erstes Projekt anlegen
            </Button>
          )}
        </div>
      )}

      {/* Gantt Chart */}
      {selectedProject && !tasksLoading && (
        <GanttChart
          project={selectedProject}
          tasks={tasks}
          milestones={milestones as MilestoneWithClient[]}
          clientColor={selectedClient?.color || '#3B82F6'}
          onTaskClick={setEditTask}
          onMilestoneClick={setEditMilestone}
        />
      )}

      {selectedProject && !tasksLoading && tasks.length > 0 && (
        <GanttPhaseDescriptions tasks={tasks} clientColor={selectedClient?.color || '#3B82F6'} />
      )}

      {tasksLoading && selectedProjectId && <Skeleton className="h-[300px] w-full" />}

      {/* Sheets */}
      <GanttTaskSheet
        task={showNewTask ? null : editTask}
        projectId={selectedProjectId}
        onClose={() => { setEditTask(null); setShowNewTask(false); }}
        isNew={showNewTask}
      />

      <GanttProjectSheet
        project={showNewProject ? null : editProject}
        clientId={selectedClientId}
        onClose={() => { setEditProject(null); setShowNewProject(false); }}
        isNew={showNewProject}
      />

      <MilestoneSheet
        milestone={editMilestone}
        onClose={() => setEditMilestone(null)}
      />
    </div>
  );
}
