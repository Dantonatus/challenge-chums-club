
-- Create training_checkins table
CREATE TABLE public.training_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  checkin_date text NOT NULL,
  checkin_time text NOT NULL,
  facility_name text NOT NULL,
  facility_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT training_checkins_unique UNIQUE (user_id, checkin_date, checkin_time)
);

-- Enable RLS
ALTER TABLE public.training_checkins ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own checkins"
  ON public.training_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON public.training_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins"
  ON public.training_checkins FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkins"
  ON public.training_checkins FOR DELETE
  USING (auth.uid() = user_id);
