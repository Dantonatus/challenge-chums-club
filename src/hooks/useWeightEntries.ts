import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { forecast } from '@/lib/weight/analytics';
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

      // After successful upsert, save forecast snapshots
      // Get the latest entries including the new one
      const { data: latestEntries } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (latestEntries && latestEntries.length >= 3) {
        const typedEntries = latestEntries as WeightEntry[];
        const fc14 = forecast(typedEntries, 14);
        const fc30 = forecast(typedEntries, 30);

        // Upsert both snapshots (overwrite same day)
        for (const [days, fc] of [[14, fc14], [30, fc30]] as const) {
          // Delete existing snapshot for same date + days
          await supabase
            .from('weight_forecast_snapshots' as any)
            .delete()
            .eq('user_id', user.id)
            .eq('snapshot_date', entry.date)
            .eq('forecast_days', days);

          await supabase
            .from('weight_forecast_snapshots' as any)
            .insert({
              user_id: user.id,
              snapshot_date: entry.date,
              forecast_days: days,
              daily_swing: fc.dailySwing,
              points_json: fc.points,
            } as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-entries'] });
      queryClient.invalidateQueries({ queryKey: ['forecast-snapshots'] });
    },
  });

  return { entries, isLoading, upsert };
}
