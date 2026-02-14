import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackEntry } from '@/lib/feedback/types';

export function useFeedbackEntries(employeeId: string | null) {
  const qc = useQueryClient();
  const key = ['feedback-entries', employeeId];

  // Open entries only (no session_id)
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
        .is('session_id', null)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as FeedbackEntry[];
    },
  });

  // All entries for a specific session
  const allEntriesKey = ['feedback-entries-all', employeeId];
  const allQuery = useQuery({
    queryKey: allEntriesKey,
    enabled: !!employeeId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('feedback_entries' as any)
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('user_id', auth.user.id)
        .not('session_id', 'is', null)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return data as unknown as FeedbackEntry[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: allEntriesKey });
    qc.invalidateQueries({ queryKey: ['feedback-employees'] });
    qc.invalidateQueries({ queryKey: ['feedback-sessions'] });
  };

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
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<FeedbackEntry> & { id: string }) => {
      const { error } = await supabase
        .from('feedback_entries' as any)
        .update(fields as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feedback_entries' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const archiveSingle = useMutation({
    mutationFn: async ({ entryId, employeeId }: { entryId: string; employeeId: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');

      // Create mini-session
      const { data: session, error: sessionError } = await supabase
        .from('feedback_sessions' as any)
        .insert({
          employee_id: employeeId,
          user_id: auth.user.id,
          session_date: new Date().toISOString().slice(0, 10),
          notes: null,
        })
        .select()
        .single();
      if (sessionError) throw sessionError;

      // Link entry to session
      const { error: updateError } = await supabase
        .from('feedback_entries' as any)
        .update({ session_id: (session as any).id, is_shared: true, shared_at: new Date().toISOString() } as any)
        .eq('id', entryId);
      if (updateError) throw updateError;
    },
    onSuccess: invalidateAll,
  });

  return {
    entries: query.data ?? [],
    archivedEntries: allQuery.data ?? [],
    isLoading: query.isLoading,
    create,
    update,
    remove,
    archiveSingle,
  };
}
