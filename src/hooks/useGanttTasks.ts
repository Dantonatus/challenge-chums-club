import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GanttTask, GanttTaskFormData } from '@/lib/planning/gantt-types';
import { useToast } from '@/hooks/use-toast';

export function useGanttTasks(projectId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['gantt-tasks', projectId],
    queryFn: async (): Promise<GanttTask[]> => {
      if (!projectId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gantt_tasks')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as GanttTask[];
    },
    enabled: !!projectId,
  });

  const createTask = useMutation({
    mutationFn: async (formData: GanttTaskFormData): Promise<GanttTask> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get max sort_order
      const existing = query.data || [];
      const maxOrder = existing.length > 0 ? Math.max(...existing.map(t => t.sort_order)) : -1;

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
          sort_order: formData.sort_order ?? maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as GanttTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-tasks', projectId] });
      toast({ title: 'Aufgabe erstellt' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<GanttTaskFormData> & { id: string; is_completed?: boolean }): Promise<GanttTask> => {
      const updateData: Record<string, unknown> = {};
      if (formData.title !== undefined) updateData.title = formData.title;
      if (formData.start_date !== undefined) updateData.start_date = formData.start_date;
      if (formData.end_date !== undefined) updateData.end_date = formData.end_date;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.color !== undefined) updateData.color = formData.color;
      if (formData.sort_order !== undefined) updateData.sort_order = formData.sort_order;
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
      queryClient.invalidateQueries({ queryKey: ['gantt-tasks', projectId] });
      toast({ title: 'Aufgabe aktualisiert' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('gantt_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gantt-tasks', projectId] });
      toast({ title: 'Aufgabe gelöscht' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  return {
    tasks: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createTask,
    updateTask,
    deleteTask,
  };
}
