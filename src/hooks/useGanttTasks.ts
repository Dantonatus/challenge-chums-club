import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GanttTask, GanttTaskFormData, PlanningProject, PlanningProjectFormData } from '@/lib/planning/types';
import { useToast } from '@/hooks/use-toast';

export function usePlanningProjects(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['planning-projects', clientId],
    queryFn: async (): Promise<PlanningProject[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let q = supabase
        .from('planning_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (clientId) q = q.eq('client_id', clientId);

      const { data, error } = await q;
      if (error) throw error;
      return data as PlanningProject[];
    },
    enabled: true,
  });

  const createProject = useMutation({
    mutationFn: async (formData: PlanningProjectFormData): Promise<PlanningProject> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('planning_projects')
        .insert({
          user_id: user.id,
          client_id: formData.client_id,
          name: formData.name,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          description: formData.description || null,
          status: formData.status || 'active',
          color: formData.color || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PlanningProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-projects'] });
      toast({ title: 'Projekt erstellt' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<PlanningProjectFormData> & { id: string }): Promise<PlanningProject> => {
      const updateData: Record<string, unknown> = {};
      if (formData.name !== undefined) updateData.name = formData.name;
      if (formData.start_date !== undefined) updateData.start_date = formData.start_date;
      if (formData.end_date !== undefined) updateData.end_date = formData.end_date;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.status !== undefined) updateData.status = formData.status;
      if (formData.color !== undefined) updateData.color = formData.color;

      const { data, error } = await supabase
        .from('planning_projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PlanningProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-projects'] });
      toast({ title: 'Projekt aktualisiert' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('planning_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-projects'] });
      toast({ title: 'Projekt gelöscht' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  return {
    projects: query.data || [],
    isLoading: query.isLoading,
    createProject,
    updateProject,
    deleteProject,
  };
}

export function useGanttTasks(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['gantt-tasks', projectId],
    queryFn: async (): Promise<GanttTask[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gantt_tasks')
        .select('*')
        .eq('project_id', projectId!)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as GanttTask[];
    },
    enabled: !!projectId,
  });

  const milestonesQuery = useQuery({
    queryKey: ['gantt-milestones', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('milestones')
        .select('*, client:clients(*)')
        .eq('project_id', projectId!)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const createTask = useMutation({
    mutationFn: async (formData: GanttTaskFormData): Promise<GanttTask> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gantt_tasks')
        .insert({
          user_id: user.id,
          project_id: formData.project_id,
          title: formData.title,
          start_date: formData.start_date,
          end_date: formData.end_date,
          description: formData.description || null,
          color: formData.color || null,
          is_completed: formData.is_completed || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as GanttTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-tasks'] });
      toast({ title: 'Aufgabe erstellt' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<GanttTaskFormData> & { id: string }): Promise<GanttTask> => {
      const updateData: Record<string, unknown> = {};
      if (formData.title !== undefined) updateData.title = formData.title;
      if (formData.start_date !== undefined) updateData.start_date = formData.start_date;
      if (formData.end_date !== undefined) updateData.end_date = formData.end_date;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.color !== undefined) updateData.color = formData.color;
      if (formData.is_completed !== undefined) updateData.is_completed = formData.is_completed;

      const { data, error } = await supabase
        .from('gantt_tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as GanttTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-tasks'] });
      toast({ title: 'Aufgabe aktualisiert' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('gantt_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-tasks'] });
      toast({ title: 'Aufgabe gelöscht' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tasks: tasksQuery.data || [],
    milestones: milestonesQuery.data || [],
    isLoading: tasksQuery.isLoading || milestonesQuery.isLoading,
    createTask,
    updateTask,
    deleteTask,
  };
}
