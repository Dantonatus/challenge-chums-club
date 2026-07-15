-- Health goals table for Performance Intelligence reporting
CREATE TABLE public.health_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_mode text NOT NULL CHECK (goal_mode IN ('weight_loss','weight_gain','maintain','recomposition','training_consistency')),
  target_weight_kg numeric(6,2),
  target_body_fat_percent numeric(5,2),
  weekly_training_target integer CHECK (weekly_training_target IS NULL OR (weekly_training_target BETWEEN 0 AND 21)),
  target_date date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- At most one active goal per user
CREATE UNIQUE INDEX health_goals_one_active_per_user
  ON public.health_goals(user_id)
  WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_goals TO authenticated;
GRANT ALL ON public.health_goals TO service_role;

ALTER TABLE public.health_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_goals_select_own" ON public.health_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "health_goals_insert_own" ON public.health_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "health_goals_update_own" ON public.health_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "health_goals_delete_own" ON public.health_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER health_goals_updated_at
  BEFORE UPDATE ON public.health_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();