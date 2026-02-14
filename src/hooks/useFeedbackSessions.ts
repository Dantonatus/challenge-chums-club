import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackSession } from '@/lib/feedback/types';

export function useFeedbackSessions(employeeId: string | null) {
  const qc = useQueryClient();
  const key = ['feedback-sessions', employeeId];

  const query = useQuery({
    queryKey: key,
    enabled: !!employeeId,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('feedback_sessions' as any)
        .select('*')
        .eq('employee_id', employeeId!)
        .eq('user_id', auth.user.id)
        .order('session_date', { ascending: false });
      if (error) throw error;
      return data as unknown as FeedbackSession[];
    },
  });

  const create = useMutation({
    mutationFn: async (session: {
      employee_id: string;
      session_date: string;
      notes?: string;
      entry_ids: string[];
    }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');

      // 1. Create session
      const { data, error } = await supabase
        .from('feedback_sessions' as any)
        .insert({
          employee_id: session.employee_id,
          user_id: auth.user.id,
          session_date: session.session_date,
          notes: session.notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      const newSession = data as unknown as FeedbackSession;

      // 2. Link entries to session
      if (session.entry_ids.length > 0) {
        const { error: updateError } = await supabase
          .from('feedback_entries' as any)
          .update({ session_id: newSession.id, is_shared: true, shared_at: new Date().toISOString() } as any)
          .in('id', session.entry_ids);
        if (updateError) throw updateError;
      }

      return newSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['feedback-entries'] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // First unlink entries
      const { error: unlinkError } = await supabase
        .from('feedback_entries' as any)
        .update({ session_id: null, is_shared: false, shared_at: null } as any)
        .eq('session_id', id);
      if (unlinkError) throw unlinkError;

      const { error } = await supabase
        .from('feedback_sessions' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ['feedback-entries'] });
    },
  });

  return { sessions: query.data ?? [], isLoading: query.isLoading, create, remove };
}
