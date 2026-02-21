
CREATE TABLE public.smart_scale_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  weight_kg NUMERIC,
  bmi NUMERIC,
  fat_percent NUMERIC,
  subcutaneous_fat_percent NUMERIC,
  heart_rate_bpm INTEGER,
  cardiac_index NUMERIC,
  visceral_fat NUMERIC,
  body_water_percent NUMERIC,
  skeletal_muscle_percent NUMERIC,
  muscle_mass_kg NUMERIC,
  bone_mass_kg NUMERIC,
  protein_percent NUMERIC,
  bmr_kcal INTEGER,
  metabolic_age INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, measured_at)
);

ALTER TABLE public.smart_scale_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scale entries"
  ON public.smart_scale_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scale entries"
  ON public.smart_scale_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scale entries"
  ON public.smart_scale_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scale entries"
  ON public.smart_scale_entries FOR DELETE
  USING (auth.uid() = user_id);
