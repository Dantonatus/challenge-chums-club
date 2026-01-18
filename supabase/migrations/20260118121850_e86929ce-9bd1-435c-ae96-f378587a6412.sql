-- ============================================================
-- Security Fix: Input validation for join_group and secure invite code access
-- ============================================================

-- 1. Improve join_group with input validation and failed attempt logging
CREATE OR REPLACE FUNCTION public.join_group(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_user_id uuid;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- INPUT VALIDATION: Check for null, length, and format
  IF p_invite_code IS NULL OR 
     length(p_invite_code) < 10 OR 
     length(p_invite_code) > 100 THEN
    -- Log failed attempt for security monitoring
    PERFORM log_security_event(
      'join_group_invalid_format',
      v_user_id,
      jsonb_build_object(
        'code_length', COALESCE(length(p_invite_code), 0),
        'timestamp', now()
      )
    );
    RAISE EXCEPTION 'Invalid invite code format';
  END IF;

  -- Validate format: only alphanumeric, hyphens, and underscores allowed
  IF p_invite_code !~ '^[a-zA-Z0-9_-]+$' THEN
    PERFORM log_security_event(
      'join_group_invalid_chars',
      v_user_id,
      jsonb_build_object('timestamp', now())
    );
    RAISE EXCEPTION 'Invalid invite code format';
  END IF;

  -- Look up the group
  SELECT id INTO v_group_id FROM public.groups WHERE invite_code = p_invite_code;
  
  IF v_group_id IS NULL THEN
    -- Log failed attempt (don't reveal if code exists or not)
    PERFORM log_security_event(
      'join_group_not_found',
      v_user_id,
      jsonb_build_object('timestamp', now())
    );
    -- Use same error message to prevent enumeration
    RAISE EXCEPTION 'Invalid invite code format';
  END IF;

  -- Insert membership (ON CONFLICT handles already a member)
  INSERT INTO public.group_members (group_id, user_id)
  VALUES (v_group_id, v_user_id)
  ON CONFLICT (group_id, user_id) DO NOTHING;

  RETURN v_group_id;
END;
$$;

-- 2. Create secure RPC function to get invite code (owner only)
CREATE OR REPLACE FUNCTION public.get_group_invite_code(p_group_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invite_code text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Require authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Only group owners can retrieve invite codes
  IF NOT is_group_owner(p_group_id, v_user_id) THEN
    RAISE EXCEPTION 'Only group owners can view invite codes';
  END IF;
  
  -- Retrieve the invite code
  SELECT invite_code INTO v_invite_code
  FROM groups
  WHERE id = p_group_id;
  
  IF v_invite_code IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;
  
  RETURN v_invite_code;
END;
$$;

-- 3. Create a view that excludes invite_code for regular member queries
CREATE OR REPLACE VIEW public.groups_safe AS
SELECT 
  id, 
  name, 
  description, 
  owner_id, 
  created_at, 
  updated_at
FROM public.groups;

-- Grant access to the view
GRANT SELECT ON public.groups_safe TO authenticated;

-- Add comment documenting the security model
COMMENT ON FUNCTION public.get_group_invite_code(uuid) IS 
'SECURITY: Returns invite code only to group owners. Used by owner-only UI components.';