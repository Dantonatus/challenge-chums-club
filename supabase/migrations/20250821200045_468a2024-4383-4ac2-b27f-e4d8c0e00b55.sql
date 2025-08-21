-- Fix duplicate role insertion on signup by removing legacy trigger and making registration function idempotent

-- 1) Drop legacy trigger that duplicates role insertion
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- 2) Make handle_new_user_registration idempotent and safe against double execution
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this user already has any role record, do nothing (idempotency)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- If there is no admin yet, make this user admin; otherwise mark as pending
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role, approved_at, approved_by)
    VALUES (NEW.id, 'admin', now(), NEW.id);
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'pending');
  END IF;

  RETURN NEW;
END;
$$;
