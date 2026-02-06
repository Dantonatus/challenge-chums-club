import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Milestone, MilestoneWithClient, MilestoneFormData, Quarter, HalfYear, getQuarterDateRange, getHalfYearDateRange } from '@/lib/planning/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UseMilestonesOptions {
  quarter?: Quarter;
  halfYear?: HalfYear;
}

export function useMilestones(options?: UseMilestonesOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['milestones', options?.quarter?.year, options?.quarter?.quarter, options?.halfYear?.year, options?.halfYear?.half],
    queryFn: async (): Promise<MilestoneWithClient[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let queryBuilder = supabase
        .from('milestones')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      // Filter by quarter or half year if provided
      if (options?.halfYear) {
        const { start, end } = getHalfYearDateRange(options.halfYear);
        queryBuilder = queryBuilder
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(end, 'yyyy-MM-dd'));
      } else if (options?.quarter) {
        const { start, end } = getQuarterDateRange(options.quarter);
        queryBuilder = queryBuilder
          .gte('date', format(start, 'yyyy-MM-dd'))
          .lte('date', format(end, 'yyyy-MM-dd'));
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data as MilestoneWithClient[];
    },
    enabled: true,
  });

  const createMilestone = useMutation({
    mutationFn: async (formData: MilestoneFormData): Promise<Milestone> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('milestones')
        .insert({
          user_id: user.id,
          client_id: formData.client_id,
          title: formData.title,
          date: formData.date,
          time: formData.time || null,
          milestone_type: formData.milestone_type,
          description: formData.description || null,
          priority: formData.priority || 'medium',
          location: formData.location || null,
          attendees: formData.attendees || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast({ title: 'Meilenstein erstellt' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<MilestoneFormData> & { id: string; is_completed?: boolean }): Promise<Milestone> => {
      const updateData: Record<string, unknown> = {};
      
      if (formData.title !== undefined) updateData.title = formData.title;
      if (formData.client_id !== undefined) updateData.client_id = formData.client_id;
      if (formData.date !== undefined) updateData.date = formData.date;
      if (formData.time !== undefined) updateData.time = formData.time;
      if (formData.milestone_type !== undefined) updateData.milestone_type = formData.milestone_type;
      if (formData.description !== undefined) updateData.description = formData.description;
      if (formData.priority !== undefined) updateData.priority = formData.priority;
      if (formData.location !== undefined) updateData.location = formData.location;
      if (formData.attendees !== undefined) updateData.attendees = formData.attendees;
      if (formData.is_completed !== undefined) {
        updateData.is_completed = formData.is_completed;
        updateData.completed_at = formData.is_completed ? new Date().toISOString() : null;
      }

      const { data, error } = await supabase
        .from('milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast({ title: 'Meilenstein aktualisiert' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('milestones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      toast({ title: 'Meilenstein gelöscht' });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }): Promise<Milestone> => {
      const { data, error } = await supabase
        .from('milestones')
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Milestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
    },
    onError: (error) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  return {
    milestones: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    toggleComplete,
  };
}

// Hook to get milestones grouped by client
export function useMilestonesByClient(options: { quarter?: Quarter; halfYear?: HalfYear }) {
  const { milestones, ...rest } = useMilestones(options);

  const byClient = milestones.reduce((acc, milestone) => {
    const clientId = milestone.client_id;
    if (!acc[clientId]) {
      acc[clientId] = {
        client: milestone.client,
        milestones: [],
      };
    }
    acc[clientId].milestones.push(milestone);
    return acc;
  }, {} as Record<string, { client: MilestoneWithClient['client']; milestones: MilestoneWithClient[] }>);

  return {
    ...rest,
    milestones,
    byClient: Object.values(byClient),
  };
}
