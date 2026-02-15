
CREATE TABLE public.weight_forecast_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  snapshot_date text NOT NULL,
  forecast_days integer NOT NULL,
  daily_swing numeric NOT NULL,
  points_json jsonb NOT NULL
);

ALTER TABLE public.weight_forecast_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON public.weight_forecast_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own snapshots"
  ON public.weight_forecast_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots"
  ON public.weight_forecast_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own snapshots"
  ON public.weight_forecast_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_weight_forecast_snapshots_user_date 
  ON public.weight_forecast_snapshots (user_id, snapshot_date DESC);
