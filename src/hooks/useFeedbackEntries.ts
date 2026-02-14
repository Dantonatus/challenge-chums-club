import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackEntry } from '@/lib/feedback/types';

export function useFeedbackEntries(employeeId: string | null) {
  const qc = useQueryClient();
  const key = ['feedback-entries', employeeId];

  const query = useQuery({
    queryKey: key,
    enabled: !!employeeId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('feedback_entries' as any)
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('user_id', auth.user.id)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as FeedbackEntry[];
    },
  });

  const create = useMutation({
    mutationFn: async (entry: { employee_id: string; content: string; category: string; sentiment: string; entry_date: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('feedback_entries' as any)
        .insert({ ...entry, user_id: auth.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as FeedbackEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['feedback-employees'] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<FeedbackEntry> & { id: string }) => {
      const { error } = await supabase
        .from('feedback_entries' as any)
        .update(fields as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['feedback-employees'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feedback_entries' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['feedback-employees'] });
    },
  });

  const toggleShared = useMutation({
    mutationFn: async ({ id, is_shared }: { id: string; is_shared: boolean }) => {
      const { error } = await supabase
        .from('feedback_entries' as any)
        .update({ is_shared, shared_at: is_shared ? new Date().toISOString() : null } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { entries: query.data ?? [], isLoading: query.isLoading, create, update, remove, toggleShared };
}
