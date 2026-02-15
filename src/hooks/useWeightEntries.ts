import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WeightEntry } from '@/lib/weight/types';

export function useWeightEntries() {
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['weight-entries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WeightEntry[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (entry: { date: string; time: string; weight_kg: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('weight_entries')
        .upsert(
          { user_id: user.id, date: entry.date, time: entry.time, weight_kg: entry.weight_kg },
          { onConflict: 'user_id,date' }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weight-entries'] }),
  });

  return { entries, isLoading, upsert };
}
