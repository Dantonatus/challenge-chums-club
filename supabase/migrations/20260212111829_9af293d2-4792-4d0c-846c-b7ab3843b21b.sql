
-- Create update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create clients table (needed as FK target)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  logo_url TEXT,
  contact_email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date TEXT,
  end_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- Create planning_projects table (needed as FK target)
CREATE TABLE public.planning_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects" ON public.planning_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON public.planning_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.planning_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.planning_projects FOR DELETE USING (auth.uid() = user_id);

-- Create milestones table (needed for Gantt milestone overlay)
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.planning_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT NOT NULL DEFAULT 'general',
  date TEXT NOT NULL,
  time TEXT,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  location TEXT,
  attendees TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own milestones" ON public.milestones FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own milestones" ON public.milestones FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own milestones" ON public.milestones FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own milestones" ON public.milestones FOR DELETE USING (auth.uid() = user_id);

-- Create gantt_tasks table
CREATE TABLE public.gantt_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.planning_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gantt_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gantt tasks" ON public.gantt_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own gantt tasks" ON public.gantt_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gantt tasks" ON public.gantt_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gantt tasks" ON public.gantt_tasks FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planning_projects_updated_at BEFORE UPDATE ON public.planning_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_gantt_tasks_updated_at BEFORE UPDATE ON public.gantt_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
