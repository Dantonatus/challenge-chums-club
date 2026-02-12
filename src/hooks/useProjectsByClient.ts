import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlanningProject {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  color: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useProjectsByClient(clientId: string | null) {
  return useQuery({
    queryKey: ['planning-projects', clientId],
    queryFn: async (): Promise<PlanningProject[]> => {
      if (!clientId) return [];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('planning_projects')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PlanningProject[];
    },
    enabled: !!clientId,
  });
}
