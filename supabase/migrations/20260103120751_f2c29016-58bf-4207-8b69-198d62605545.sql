-- Create task priority enum
CREATE TYPE task_priority AS ENUM ('p1', 'p2', 'p3', 'p4');

-- Create task status enum
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'done', 'archived');

-- Create task effort enum
CREATE TYPE task_effort AS ENUM ('xs', 's', 'm', 'l', 'xl');

-- Create recurring frequency enum
CREATE TYPE recurring_frequency AS ENUM ('none', 'daily', 'weekly', 'monthly');

-- Create project status enum
CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');

-- Projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'active',
  color TEXT DEFAULT '#6366f1',
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8b5cf6',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  status task_status NOT NULL DEFAULT 'open',
  due_date DATE,
  due_time TIME,
  priority task_priority NOT NULL DEFAULT 'p4',
  effort task_effort,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  recurring_frequency recurring_frequency NOT NULL DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task-Tags junction table
CREATE TABLE public.task_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE(task_id, tag_id)
);

-- Task audit log
CREATE TABLE public.task_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  payload_json JSONB,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_audit_log ENABLE ROW LEVEL SECURITY;

-- Projects RLS policies
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (user_id = auth.uid() OR (group_id IS NOT NULL AND is_group_member(group_id)));

CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (user_id = auth.uid());

-- Tags RLS policies
CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own tags" ON public.tags
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tags" ON public.tags
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tags" ON public.tags
  FOR DELETE USING (user_id = auth.uid());

-- Tasks RLS policies
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (user_id = auth.uid() OR (group_id IS NOT NULL AND is_group_member(group_id)));

CREATE POLICY "Users can create own tasks" ON public.tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (user_id = auth.uid());

-- Subtasks RLS policies (based on parent task ownership)
CREATE POLICY "Users can view subtasks of own tasks" ON public.subtasks
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.user_id = auth.uid() OR (t.group_id IS NOT NULL AND is_group_member(t.group_id)))));

CREATE POLICY "Users can create subtasks for own tasks" ON public.subtasks
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can update subtasks of own tasks" ON public.subtasks
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can delete subtasks of own tasks" ON public.subtasks
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));

-- Task-Tags RLS policies
CREATE POLICY "Users can view task tags" ON public.task_tags
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (t.user_id = auth.uid() OR (t.group_id IS NOT NULL AND is_group_member(t.group_id)))));

CREATE POLICY "Users can create task tags" ON public.task_tags
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can delete task tags" ON public.task_tags
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));

-- Audit log RLS policies
CREATE POLICY "Users can view own audit logs" ON public.task_audit_log
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create audit logs" ON public.task_audit_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX idx_task_tags_task_id ON public.task_tags(task_id);
CREATE INDEX idx_task_audit_log_entity ON public.task_audit_log(entity_type, entity_id);

-- Create updated_at triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();