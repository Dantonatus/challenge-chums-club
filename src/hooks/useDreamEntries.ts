import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DreamEntry } from '@/lib/dreams/types';
import { useEffect, useState } from 'react';

function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  return userId;
}

export function useDreamEntries() {
  const userId = useUserId();
  const qc = useQueryClient();
  const key = ['dream_entries', userId];

  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dream_entries' as any)
        .select('*')
        .eq('user_id', userId!)
        .order('entry_date', { ascending: false })
        .order('entry_time', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DreamEntry[];
    },
  });

  const create = useMutation({
    mutationFn: async (entry: Partial<DreamEntry>) => {
      const { error } = await supabase
        .from('dream_entries' as any)
        .insert({ ...entry, user_id: userId } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<DreamEntry> & { id: string }) => {
      const { error } = await supabase
        .from('dream_entries' as any)
        .update({ ...rest, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dream_entries' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { entries: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}
