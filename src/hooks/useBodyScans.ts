import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BodyScan, ParsedBodyScan } from '@/lib/bodyscan/types';

export function useBodyScans() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['body-scans'],
    queryFn: async (): Promise<BodyScan[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from('body_scans' as any)
        .select('*')
        .eq('user_id', auth.user.id)
        .order('scan_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BodyScan[];
    },
  });

  const importScan = useMutation({
    mutationFn: async (scan: ParsedBodyScan) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');

      const row = {
        user_id: auth.user.id,
        ...scan,
        segments_json: scan.segments_json as any,
      };

      const { error, data } = await (supabase.from('body_scans' as any) as any)
        .upsert(row, { onConflict: 'user_id,scan_date,scan_time', ignoreDuplicates: true })
        .select();
      if (error) throw error;
      return data?.length || 0;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-scans'] }),
  });

  return { scans: query.data || [], isLoading: query.isLoading, importScan };
}
