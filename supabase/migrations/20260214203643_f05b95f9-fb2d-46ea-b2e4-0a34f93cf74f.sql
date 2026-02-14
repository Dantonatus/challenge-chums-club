
-- feedback_employees table
CREATE TABLE public.feedback_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  role text,
  color text NOT NULL DEFAULT '#3B82F6',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own employees" ON public.feedback_employees FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own employees" ON public.feedback_employees FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own employees" ON public.feedback_employees FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own employees" ON public.feedback_employees FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_feedback_employees_updated_at
  BEFORE UPDATE ON public.feedback_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- feedback_entries table
CREATE TABLE public.feedback_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.feedback_employees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'observation',
  sentiment text NOT NULL DEFAULT 'neutral',
  entry_date text NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD'),
  is_shared boolean NOT NULL DEFAULT false,
  shared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries" ON public.feedback_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own entries" ON public.feedback_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own entries" ON public.feedback_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own entries" ON public.feedback_entries FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_feedback_entries_updated_at
  BEFORE UPDATE ON public.feedback_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
