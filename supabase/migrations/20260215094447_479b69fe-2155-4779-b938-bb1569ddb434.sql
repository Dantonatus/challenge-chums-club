
-- Create weight_entries table
CREATE TABLE public.weight_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  weight_kg numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as body_scans)
CREATE POLICY "Users can view own weight entries"
  ON public.weight_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight entries"
  ON public.weight_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight entries"
  ON public.weight_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries"
  ON public.weight_entries FOR DELETE
  USING (auth.uid() = user_id);
