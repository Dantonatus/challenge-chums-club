import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Project, CreateProjectInput, ProjectStatus } from '@/lib/tasks/types';

const PROJECTS_KEY = ['projects'];

// Fetch all projects with task counts
export function useProjects(status?: ProjectStatus) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, status],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: projects, error } = await query;
      if (error) throw error;

      // Get task counts for each project
      const projectsWithCounts = await Promise.all(
        (projects || []).map(async (project) => {
          const { count: taskCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .neq('status', 'archived');

          const { count: completedCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .eq('status', 'done');

          return {
            ...project,
            task_count: taskCount || 0,
            completed_count: completedCount || 0,
          };
        })
      );

      return projectsWithCounts as Project[];
    },
  });
}

// Fetch single project
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Project;
    },
  });
}

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: input.name,
          description: input.description,
          color: input.color,
          group_id: input.group_id,
          parent_id: input.parent_id || null,
          sort_order: input.sort_order || 0,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from('task_audit_log').insert({
        entity_type: 'project',
        entity_id: data.id,
        action: 'created',
        payload_json: { name: data.name },
        user_id: user.user.id,
      });

      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      toast.success('Project created');
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    },
  });
}

// Update project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateProjectInput> & { id: string }) => {
      // Convert undefined parent_id to null for database
      const dbUpdates = {
        ...updates,
        parent_id: updates.parent_id === undefined ? null : updates.parent_id,
      };

      const { data, error } = await supabase
        .from('projects')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        await supabase.from('task_audit_log').insert({
          entity_type: 'project',
          entity_id: id,
          action: 'updated',
          payload_json: updates,
          user_id: user.user.id,
        });
      }

      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      toast.success('Projekt aktualisiert');
    },
    onError: (error) => {
      toast.error('Projekt konnte nicht aktualisiert werden: ' + error.message);
    },
  });
}

// Delete project
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_KEY });
      toast.success('Project deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete project: ' + error.message);
    },
  });
}
