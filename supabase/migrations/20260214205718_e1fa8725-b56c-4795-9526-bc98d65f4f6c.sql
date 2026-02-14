
-- 1. Create feedback_sessions table
CREATE TABLE public.feedback_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.feedback_employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add session_id column to feedback_entries
ALTER TABLE public.feedback_entries
  ADD COLUMN session_id UUID REFERENCES public.feedback_sessions(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE public.feedback_sessions ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for feedback_sessions
CREATE POLICY "Users can view own sessions"
  ON public.feedback_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.feedback_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.feedback_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.feedback_sessions FOR DELETE
  USING (auth.uid() = user_id);
