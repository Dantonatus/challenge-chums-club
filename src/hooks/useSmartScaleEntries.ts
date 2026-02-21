import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SmartScaleEntry, ParsedScaleEntry } from '@/lib/smartscale/types';

export function useSmartScaleEntries() {
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['smart-scale-entries'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('smart_scale_entries' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('measured_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as SmartScaleEntry[];
    },
  });

  const bulkImport = useMutation({
    mutationFn: async (parsed: ParsedScaleEntry[]): Promise<number> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Batch in chunks of 100
      const chunks: ParsedScaleEntry[][] = [];
      for (let i = 0; i < parsed.length; i += 100) {
        chunks.push(parsed.slice(i, i + 100));
      }

      let total = 0;
      for (const chunk of chunks) {
        const rows = chunk.map(e => ({ user_id: user.id, ...e }));
        const { error } = await supabase
          .from('smart_scale_entries' as any)
          .upsert(rows as any, { onConflict: 'user_id,measured_at' });
        if (error) throw error;
        total += chunk.length;
      }
      return total;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-scale-entries'] });
    },
  });

  const remove = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('smart_scale_entries' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-scale-entries'] });
    },
  });

  return { entries, isLoading, bulkImport, remove };
}
