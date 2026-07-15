import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type HealthGoalMode =
  | 'weight_loss'
  | 'weight_gain'
  | 'maintain'
  | 'recomposition'
  | 'training_consistency';

export interface HealthGoal {
  id: string;
  user_id: string;
  goal_mode: HealthGoalMode;
  target_weight_kg: number | null;
  target_body_fat_percent: number | null;
  weekly_training_target: number | null;
  target_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthGoalInput {
  goal_mode: HealthGoalMode;
  target_weight_kg?: number | null;
  target_body_fat_percent?: number | null;
  weekly_training_target?: number | null;
  target_date?: string | null;
  notes?: string | null;
}

export function useHealthGoal() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['health-goal'],
    queryFn: async (): Promise<HealthGoal | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from('health_goals' as any)
        .select('*')
        .eq('user_id', auth.user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as HealthGoal) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (input: HealthGoalInput) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Not authenticated');
      const existing = query.data;
      if (existing) {
        const { error } = await supabase
          .from('health_goals' as any)
          .update({ ...input } as any)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('health_goals' as any)
          .insert({ user_id: auth.user.id, is_active: true, ...input } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health-goal'] }),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const existing = query.data;
      if (!existing) return;
      const { error } = await supabase
        .from('health_goals' as any)
        .update({ is_active: false } as any)
        .eq('id', existing.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health-goal'] }),
  });

  return { goal: query.data ?? null, isLoading: query.isLoading, save, clear };
}
