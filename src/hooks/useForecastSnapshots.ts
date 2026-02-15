import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ForecastSnapshot } from '@/lib/weight/types';

export function useForecastSnapshots(forecastDays?: number) {
  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['forecast-snapshots', forecastDays],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('weight_forecast_snapshots' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: false })
        .limit(10);

      if (forecastDays) {
        query = query.eq('forecast_days', forecastDays);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ForecastSnapshot[];
    },
  });

  return { snapshots, isLoading };
}
