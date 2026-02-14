import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TrainingCheckin, ParsedCheckin } from '@/lib/training/types';

export function useTrainingCheckins() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['training-checkins'],
    queryFn: async (): Promise<TrainingCheckin[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from('training_checkins' as any)
        .select('*')
        .eq('user_id', auth.user.id)
        .order('checkin_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TrainingCheckin[];
    },
  });

  const importCsv = useMutation({
    mutationFn: async (rows: ParsedCheckin[]) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const userId = auth.user.id;

      // Upsert in batches of 50
      let inserted = 0;
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50).map(r => ({
          user_id: userId,
          checkin_date: r.checkin_date,
          checkin_time: r.checkin_time,
          facility_name: r.facility_name,
          facility_address: r.facility_address,
        }));
        const { error, data } = await (supabase.from('training_checkins' as any) as any)
          .upsert(batch, { onConflict: 'user_id,checkin_date,checkin_time', ignoreDuplicates: true })
          .select();
        if (error) throw error;
        inserted += data?.length || 0;
      }
      return inserted;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-checkins'] }),
  });

  return { checkins: query.data || [], isLoading: query.isLoading, importCsv };
}
