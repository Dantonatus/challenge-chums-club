import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackEmployee } from '@/lib/feedback/types';

export function useFeedbackEmployees() {
  const qc = useQueryClient();
  const key = ['feedback-employees'];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('feedback_employees' as any)
        .select('*')
        .eq('user_id', auth.user.id)
        .order('name');
      if (error) throw error;
      return data as unknown as FeedbackEmployee[];
    },
  });

  const create = useMutation({
    mutationFn: async (emp: { name: string; role?: string; color: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('feedback_employees' as any)
        .insert({ ...emp, user_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FeedbackEmployee;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<FeedbackEmployee> & { id: string }) => {
      const { error } = await supabase
        .from('feedback_employees' as any)
        .update(fields as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feedback_employees' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { employees: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}
