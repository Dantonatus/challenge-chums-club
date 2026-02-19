
-- Learning Topics
CREATE TABLE public.learning_topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  emoji text,
  color text NOT NULL DEFAULT '#3B82F6',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own topics" ON public.learning_topics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own topics" ON public.learning_topics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics" ON public.learning_topics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own topics" ON public.learning_topics FOR DELETE USING (auth.uid() = user_id);

-- Learning Nuggets
CREATE TABLE public.learning_nuggets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic_id uuid REFERENCES public.learning_topics(id) ON DELETE SET NULL,
  title text NOT NULL,
  summary text,
  key_points jsonb DEFAULT '[]'::jsonb,
  content text,
  source text,
  tags text[] DEFAULT '{}',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_nuggets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nuggets" ON public.learning_nuggets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own nuggets" ON public.learning_nuggets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nuggets" ON public.learning_nuggets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nuggets" ON public.learning_nuggets FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger for nuggets
CREATE TRIGGER update_learning_nuggets_updated_at
  BEFORE UPDATE ON public.learning_nuggets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
