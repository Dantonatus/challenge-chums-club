-- Final security hardening: Restrict approval tokens to absolute minimum access
DROP POLICY IF EXISTS "Restricted service access to approval tokens" ON public.approval_tokens;

-- Ultra-restrictive policy - only for token validation in specific edge functions
CREATE POLICY "Edge function validation only"
ON public.approval_tokens
FOR SELECT
USING (
    auth.jwt() ->> 'role' = 'service_role' AND
    current_setting('application_name', true) LIKE '%edge-runtime%'
);

-- Allow INSERT for token creation (signup process)
CREATE POLICY "Token creation for signup"
ON public.approval_tokens  
FOR INSERT
WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
);

-- Allow UPDATE only for marking tokens as used
CREATE POLICY "Token usage tracking"
ON public.approval_tokens
FOR UPDATE
USING (
    auth.jwt() ->> 'role' = 'service_role' AND
    used_at IS NULL -- Can only update unused tokens
)
WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
);

-- Additional RLS policy to further secure group invite codes from application layer
-- This ensures groups queries don't accidentally expose invite codes to members
CREATE OR REPLACE FUNCTION public.get_group_info_for_member(group_id_param uuid)
RETURNS TABLE(id uuid, name text, description text, owner_id uuid, created_at timestamptz, updated_at timestamptz)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.description, g.owner_id, g.created_at, g.updated_at
  FROM groups g 
  WHERE g.id = group_id_param 
    AND is_group_member(g.id);
$$;