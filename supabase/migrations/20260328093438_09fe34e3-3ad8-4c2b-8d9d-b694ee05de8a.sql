
CREATE TABLE public.dream_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_time time DEFAULT CURRENT_TIME,
  mood text,
  vividness smallint,
  sleep_quality smallint,
  is_lucid boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  emotions text[],
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dream_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dreams" ON public.dream_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own dreams" ON public.dream_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dreams" ON public.dream_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dreams" ON public.dream_entries FOR DELETE USING (auth.uid() = user_id);
