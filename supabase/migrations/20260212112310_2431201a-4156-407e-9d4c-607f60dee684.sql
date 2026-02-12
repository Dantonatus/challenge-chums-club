
-- Enums
CREATE TYPE public.challenge_type AS ENUM ('habit', 'kpi');
CREATE TYPE public.challenge_duration_type AS ENUM ('days', 'weeks', 'months', 'custom');
CREATE TYPE public.challenge_frequency AS ENUM ('daily', 'weekly', 'custom');
CREATE TYPE public.challenge_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE public.group_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.idea_status AS ENUM ('proposed', 'approved', 'rejected', 'implemented');
CREATE TYPE public.payment_type AS ENUM ('penalty', 'reward', 'settlement');
CREATE TYPE public.project_status AS ENUM ('active', 'completed', 'archived', 'on_hold');
CREATE TYPE public.recipe_difficulty AS ENUM ('easy', 'medium', 'hard');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  custom_color TEXT,
  is_approved BOOLEAN DEFAULT false,
  privacy_settings JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- groups
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  invite_code TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups viewable by members" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Owner can update group" ON public.groups FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can delete group" ON public.groups FOR DELETE USING (auth.uid() = owner_id);

-- group_members
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.group_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can insert membership" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own membership" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- challenges
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  challenge_type public.challenge_type NOT NULL DEFAULT 'habit',
  frequency public.challenge_frequency NOT NULL DEFAULT 'daily',
  frequency_count INTEGER,
  duration_type public.challenge_duration_type NOT NULL DEFAULT 'weeks',
  duration_count INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  penalty_amount NUMERIC NOT NULL DEFAULT 0,
  penalty_cents INTEGER NOT NULL DEFAULT 0,
  strike_allowance INTEGER NOT NULL DEFAULT 0,
  status public.challenge_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges viewable by all" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update" ON public.challenges FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete" ON public.challenges FOR DELETE USING (auth.uid() = created_by);

-- challenge_participants
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  penalty_count INTEGER NOT NULL DEFAULT 0,
  penalty_override_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants viewable" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can insert participation" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own participation" ON public.challenge_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own participation" ON public.challenge_participants FOR DELETE USING (auth.uid() = user_id);

-- challenge_violations
CREATE TABLE public.challenge_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.challenge_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Violations viewable" ON public.challenge_violations FOR SELECT USING (true);
CREATE POLICY "Users can insert violations" ON public.challenge_violations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own violations" ON public.challenge_violations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own violations" ON public.challenge_violations FOR DELETE USING (auth.uid() = user_id);

-- logs
CREATE TABLE public.logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs viewable" ON public.logs FOR SELECT USING (true);
CREATE POLICY "Users can insert logs" ON public.logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.logs FOR DELETE USING (auth.uid() = user_id);

-- kpi_definitions
CREATE TABLE public.kpi_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  kpi_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  goal_direction TEXT NOT NULL DEFAULT 'higher_is_better',
  aggregation_method TEXT NOT NULL DEFAULT 'latest',
  measurement_frequency TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KPI defs viewable" ON public.kpi_definitions FOR SELECT USING (true);
CREATE POLICY "Users can insert kpi defs" ON public.kpi_definitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update kpi defs" ON public.kpi_definitions FOR UPDATE USING (true);

-- kpi_measurements
CREATE TABLE public.kpi_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_definition_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  measured_value NUMERIC NOT NULL,
  measurement_date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KPI measurements viewable" ON public.kpi_measurements FOR SELECT USING (true);
CREATE POLICY "Users can insert measurements" ON public.kpi_measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own measurements" ON public.kpi_measurements FOR UPDATE USING (auth.uid() = user_id);

-- ideas
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  status public.idea_status NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ideas viewable" ON public.ideas FOR SELECT USING (true);
CREATE POLICY "Users can create ideas" ON public.ideas FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update ideas" ON public.ideas FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete ideas" ON public.ideas FOR DELETE USING (auth.uid() = created_by);

-- idea_comments
CREATE TABLE public.idea_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable" ON public.idea_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.idea_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- idea_votes
CREATE TABLE public.idea_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  value INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes viewable" ON public.idea_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.idea_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vote" ON public.idea_votes FOR UPDATE USING (auth.uid() = user_id);

-- payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  type public.payment_type NOT NULL,
  note TEXT,
  related_challenge_id UUID REFERENCES public.challenges(id),
  period_start TEXT,
  period_end TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payments viewable" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Users can create payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- journal_entries
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own entries" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create entries" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- recipes
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.groups(id),
  title TEXT NOT NULL,
  short_description TEXT,
  ingredients_json JSONB,
  steps_json JSONB,
  tags_json JSONB,
  servings INTEGER NOT NULL DEFAULT 1,
  prep_time INTEGER,
  cook_time INTEGER,
  difficulty public.recipe_difficulty,
  cuisine TEXT,
  source TEXT,
  calories_per_serving NUMERIC,
  calories_total NUMERIC,
  macros_json JSONB,
  micros_json JSONB,
  nutrition_confidence NUMERIC,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recipes viewable" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Users can create recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- recipe_favorites
CREATE TABLE public.recipe_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Favorites viewable" ON public.recipe_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create favorites" ON public.recipe_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete favorites" ON public.recipe_favorites FOR DELETE USING (auth.uid() = user_id);

-- ingredient_matches
CREATE TABLE public.ingredient_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_text TEXT NOT NULL,
  matched_food_name TEXT,
  match_score NUMERIC,
  grams NUMERIC,
  nutrients_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ingredient_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches viewable" ON public.ingredient_matches FOR SELECT USING (true);
CREATE POLICY "Users can insert matches" ON public.ingredient_matches FOR INSERT WITH CHECK (true);

-- saved_views
CREATE TABLE public.saved_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  date_range JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own views" ON public.saved_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create views" ON public.saved_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own views" ON public.saved_views FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own views" ON public.saved_views FOR DELETE USING (auth.uid() = user_id);

-- approval_tokens
CREATE TABLE public.approval_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  security_hash TEXT,
  creation_context JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by UUID,
  used_from_ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tokens" ON public.approval_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tokens" ON public.approval_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tokens updatable" ON public.approval_tokens FOR UPDATE USING (true);

-- projects (task planner)
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  status public.project_status NOT NULL DEFAULT 'active',
  group_id UUID REFERENCES public.groups(id),
  parent_id UUID REFERENCES public.projects(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- scheduled_tips
CREATE TABLE public.scheduled_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tip_key TEXT NOT NULL,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  show_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tips" ON public.scheduled_tips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tips" ON public.scheduled_tips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tips" ON public.scheduled_tips FOR UPDATE USING (auth.uid() = user_id);

-- shopping_list_items
CREATE TABLE public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_text TEXT NOT NULL,
  is_checked BOOLEAN NOT NULL DEFAULT false,
  quantity NUMERIC,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own items" ON public.shopping_list_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create items" ON public.shopping_list_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON public.shopping_list_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON public.shopping_list_items FOR DELETE USING (auth.uid() = user_id);

-- tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  effort TEXT,
  due_date TEXT,
  due_time TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_someday BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  recurrence TEXT,
  reminder_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- subtasks
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subtasks viewable via task" ON public.subtasks FOR SELECT USING (true);
CREATE POLICY "Users can create subtasks" ON public.subtasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update subtasks" ON public.subtasks FOR UPDATE USING (true);
CREATE POLICY "Users can delete subtasks" ON public.subtasks FOR DELETE USING (true);

-- tags
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- task_tags
CREATE TABLE public.task_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, tag_id)
);
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Task tags viewable" ON public.task_tags FOR SELECT USING (true);
CREATE POLICY "Users can create task tags" ON public.task_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete task tags" ON public.task_tags FOR DELETE USING (true);

-- task_preferences
CREATE TABLE public.task_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_view TEXT DEFAULT 'inbox',
  show_completed BOOLEAN DEFAULT false,
  sort_by TEXT DEFAULT 'created_at',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prefs" ON public.task_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create prefs" ON public.task_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prefs" ON public.task_preferences FOR UPDATE USING (auth.uid() = user_id);
