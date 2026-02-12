import { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { useProjectsByClient } from '@/hooks/useProjectsByClient';
import { useGanttTasks } from '@/hooks/useGanttTasks';
import { useMilestones } from '@/hooks/useMilestones';
import { GanttChart } from '@/components/planning/gantt/GanttChart';
import { GanttTaskSheet } from '@/components/planning/gantt/GanttTaskSheet';
import { MilestoneSheet } from '@/components/planning/MilestoneSheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, FileDown } from 'lucide-react';
import { GanttTask } from '@/lib/planning/gantt-types';
import { MilestoneWithClient } from '@/lib/planning/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProjectPlanningPage() {
  const { clients, isLoading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showTaskSheet, setShowTaskSheet] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneWithClient | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useProjectsByClient(selectedClientId);
  const { tasks, isLoading: tasksLoading, createTask, updateTask, deleteTask } = useGanttTasks(selectedProjectId);
  const { milestones } = useMilestones();

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Filter milestones for the selected project
  const projectMilestones = milestones.filter(m => m.client_id === selectedClientId) as MilestoneWithClient[];

  const handleTaskClick = (task: GanttTask) => {
    setSelectedTask(task);
    setShowTaskSheet(true);
  };

  const handleAddTask = () => {
    setSelectedTask(null);
    setShowTaskSheet(true);
  };

  if (clientsLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Erstelle zuerst einen Kunden im Übersicht-Tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Client selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedClientId || ''} onValueChange={(v) => { setSelectedClientId(v); setSelectedProjectId(null); }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Kunde wählen" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedProjectId && (
          <Button onClick={handleAddTask} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Aufgabe
          </Button>
        )}
      </div>

      {/* Project tabs */}
      {selectedClientId && (
        projectsLoading ? (
          <Skeleton className="h-10 w-64" />
        ) : projects.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Keine Projekte für diesen Kunden. Erstelle ein Projekt im Übersicht-Tab.
          </div>
        ) : (
          <Tabs value={selectedProjectId || ''} onValueChange={setSelectedProjectId}>
            <TabsList>
              {projects.map(p => (
                <TabsTrigger key={p.id} value={p.id}>{p.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )
      )}

      {/* Gantt Chart */}
      {selectedProject && (
        tasksLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <GanttChart
            tasks={tasks}
            milestones={projectMilestones}
            projectStart={selectedProject.start_date}
            projectEnd={selectedProject.end_date}
            clientColor={selectedClient?.color || '#3B82F6'}
            onTaskClick={handleTaskClick}
            onMilestoneClick={setSelectedMilestone}
          />
        )
      )}

      {/* Task Sheet */}
      {selectedProjectId && (
        <GanttTaskSheet
          open={showTaskSheet}
          onOpenChange={setShowTaskSheet}
          task={selectedTask}
          projectId={selectedProjectId}
          onSave={(data) => createTask.mutate(data)}
          onUpdate={(data) => updateTask.mutate(data)}
          onDelete={(id) => deleteTask.mutate(id)}
        />
      )}

      {/* Milestone Sheet */}
      <MilestoneSheet
        milestone={selectedMilestone}
        onClose={() => setSelectedMilestone(null)}
      />
    </div>
  );
}
