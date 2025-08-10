-- Create enums first
CREATE TYPE IF NOT EXISTS public.group_role AS ENUM ('owner','admin','member');
CREATE TYPE IF NOT EXISTS public.challenge_frequency AS ENUM ('daily','weekly','times_per_week','whole_week');
CREATE TYPE IF NOT EXISTS public.challenge_duration_type AS ENUM ('weeks','months','continuous');
CREATE TYPE IF NOT EXISTS public.challenge_status AS ENUM ('active','paused','ended');
CREATE TYPE IF NOT EXISTS public.payment_type AS ENUM ('owed','paid','adjustment');
CREATE TYPE IF NOT EXISTS public.idea_status AS ENUM ('proposed','approved','rejected');

-- Core helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.group_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  frequency public.challenge_frequency NOT NULL DEFAULT 'daily',
  frequency_count int,
  duration_type public.challenge_duration_type NOT NULL DEFAULT 'continuous',
  duration_count int,
  penalty_cents int NOT NULL DEFAULT 100,
  strike_allowance int NOT NULL DEFAULT 0,
  status public.challenge_status NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  penalty_override_cents int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  success boolean NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id, date)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents int NOT NULL,
  type public.payment_type NOT NULL,
  related_challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL,
  period_start date,
  period_end date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status public.idea_status NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.idea_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value smallint NOT NULL CHECK (value IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.idea_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduled_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_key text NOT NULL,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_challenges_updated_at
BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_ideas_updated_at
BEFORE UPDATE ON public.ideas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now helper functions that reference tables
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = _group_id AND gm.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id AND g.owner_id = _user_id
  );
$$;

-- Enable RLS and policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_tips ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY IF NOT EXISTS "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Groups policies
CREATE POLICY IF NOT EXISTS "Group owner can manage group" ON public.groups
FOR ALL TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Members can view their groups" ON public.groups
FOR SELECT TO authenticated
USING (public.is_group_member(id));

-- Group members policies
CREATE POLICY IF NOT EXISTS "Members can view group membership" ON public.group_members
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY IF NOT EXISTS "Owner can add members" ON public.group_members
FOR INSERT TO authenticated
WITH CHECK (public.is_group_owner(group_id));

CREATE POLICY IF NOT EXISTS "Owner or self can remove membership" ON public.group_members
FOR DELETE TO authenticated
USING (public.is_group_owner(group_id) OR user_id = auth.uid());

-- Challenges policies
CREATE POLICY IF NOT EXISTS "Members can view challenges" ON public.challenges
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY IF NOT EXISTS "Members can create challenges" ON public.challenges
FOR INSERT TO authenticated
WITH CHECK (public.is_group_member(group_id) AND created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Owner or creator can update challenges" ON public.challenges
FOR UPDATE TO authenticated
USING (public.is_group_owner(group_id) OR created_by = auth.uid())
WITH CHECK (public.is_group_owner(group_id) OR created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Owner or creator can delete challenges" ON public.challenges
FOR DELETE TO authenticated
USING (public.is_group_owner(group_id) OR created_by = auth.uid());

-- Challenge participants policies
CREATE POLICY IF NOT EXISTS "Members can view challenge participants" ON public.challenge_participants
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND public.is_group_member(c.group_id))
);

CREATE POLICY IF NOT EXISTS "Owner or creator can modify challenge participants" ON public.challenge_participants
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND (public.is_group_owner(c.group_id) OR c.created_by = auth.uid()))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND (public.is_group_owner(c.group_id) OR c.created_by = auth.uid()))
);

-- Logs policies
CREATE POLICY IF NOT EXISTS "Members can view logs in group" ON public.logs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND public.is_group_member(c.group_id)
  )
);

CREATE POLICY IF NOT EXISTS "Participants can write their own logs" ON public.logs
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.challenge_participants cp WHERE cp.challenge_id = challenge_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Participants can update/delete their own logs" ON public.logs
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Participants can delete their own logs" ON public.logs
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Payments policies
CREATE POLICY IF NOT EXISTS "Members can view payments in group" ON public.payments
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY IF NOT EXISTS "Owner can record owed/adjustment; users can mark their own paid" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (
  (type IN ('owed','adjustment') AND public.is_group_owner(group_id)) OR
  (type = 'paid' AND user_id = auth.uid() AND public.is_group_member(group_id))
);

-- Ideas policies
CREATE POLICY IF NOT EXISTS "Group members can view ideas" ON public.ideas
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY IF NOT EXISTS "Members can create ideas" ON public.ideas
FOR INSERT TO authenticated
WITH CHECK (public.is_group_member(group_id) AND created_by = auth.uid());

CREATE POLICY IF NOT EXISTS "Author or owner can update ideas" ON public.ideas
FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.is_group_owner(group_id))
WITH CHECK (created_by = auth.uid() OR public.is_group_owner(group_id));

CREATE POLICY IF NOT EXISTS "Author or owner can delete ideas" ON public.ideas
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.is_group_owner(group_id));

-- Idea votes policies
CREATE POLICY IF NOT EXISTS "Members can view votes" ON public.idea_votes
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_id AND public.is_group_member(i.group_id))
);

CREATE POLICY IF NOT EXISTS "Members can vote once per idea" ON public.idea_votes
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_id AND public.is_group_member(i.group_id))
);

CREATE POLICY IF NOT EXISTS "Users can update their own vote" ON public.idea_votes
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Idea comments policies
CREATE POLICY IF NOT EXISTS "Members can view comments" ON public.idea_comments
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_id AND public.is_group_member(i.group_id))
);

CREATE POLICY IF NOT EXISTS "Members can comment" ON public.idea_comments
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.ideas i WHERE i.id = idea_id AND public.is_group_member(i.group_id))
);

CREATE POLICY IF NOT EXISTS "Authors can delete their comments" ON public.idea_comments
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Journal entries policies
CREATE POLICY IF NOT EXISTS "Users can view their own journal" ON public.journal_entries
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can write their own journal" ON public.journal_entries
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete their own journal" ON public.journal_entries
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Scheduled tips policies
CREATE POLICY IF NOT EXISTS "Members can view scheduled tips" ON public.scheduled_tips
FOR SELECT TO authenticated
USING (public.is_group_member(group_id));

CREATE POLICY IF NOT EXISTS "Members can schedule tips for their group" ON public.scheduled_tips
FOR INSERT TO authenticated
WITH CHECK (public.is_group_member(group_id) AND user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Owner or creator can delete scheduled tips" ON public.scheduled_tips
FOR DELETE TO authenticated
USING (public.is_group_owner(group_id) OR user_id = auth.uid());

-- Enable realtime on key tables
ALTER TABLE public.logs REPLICA IDENTITY FULL;
ALTER TABLE public.challenges REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.ideas REPLICA IDENTITY FULL;
ALTER TABLE public.idea_comments REPLICA IDENTITY FULL;
ALTER TABLE public.idea_votes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_votes;