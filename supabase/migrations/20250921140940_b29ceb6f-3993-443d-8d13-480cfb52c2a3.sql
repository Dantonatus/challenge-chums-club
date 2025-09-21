-- Fix group functionality: enable deletion and auto-add owner as member

-- First, create a trigger to automatically add group owner as member when group is created
CREATE OR REPLACE FUNCTION public.add_owner_as_group_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the group owner as a member with admin role
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS on_group_created ON public.groups;
CREATE TRIGGER on_group_created
  AFTER INSERT ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.add_owner_as_group_member();

-- Update challenge creation policy to allow group owners to create challenges
DROP POLICY IF EXISTS "Members can create challenges" ON public.challenges;

CREATE POLICY "Members can create challenges" 
ON public.challenges 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by = auth.uid() 
  AND (
    group_id IS NULL  -- Personal challenges
    OR is_group_member(group_id, auth.uid())  -- Group members
    OR is_group_owner(group_id, auth.uid())   -- Group owners
  )
);

-- Ensure group owners can delete their groups (should already work but let's be explicit)
DROP POLICY IF EXISTS "Group owner can manage group" ON public.groups;

CREATE POLICY "Group owner can manage group" 
ON public.groups 
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());