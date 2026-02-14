
CREATE TABLE public.body_scans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  scan_date text NOT NULL,
  scan_time text NOT NULL,
  device text NOT NULL DEFAULT 'TANITA MC-780',
  age_years integer,
  height_cm numeric,
  weight_kg numeric,
  fat_percent numeric,
  fat_mass_kg numeric,
  muscle_mass_kg numeric,
  bone_mass_kg numeric,
  bmi numeric,
  metabolic_age integer,
  tbw_kg numeric,
  tbw_percent numeric,
  ecw_kg numeric,
  icw_kg numeric,
  ecw_tbw_ratio numeric,
  bmr_kcal numeric,
  visceral_fat integer,
  physique_text text,
  segments_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, scan_date, scan_time)
);

ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans"
  ON public.body_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans"
  ON public.body_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
  ON public.body_scans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
  ON public.body_scans FOR DELETE
  USING (auth.uid() = user_id);
