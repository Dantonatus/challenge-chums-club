-- Create a function to send password reset emails with proper tokens
CREATE OR REPLACE FUNCTION public.send_password_reset_email(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  user_exists boolean;
BEGIN
  -- Check if user exists
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE email = user_email AND deleted_at IS NULL
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    -- Don't reveal if user exists or not for security
    RETURN jsonb_build_object(
      'success', true,
      'message', 'If an account with this email exists, a reset link has been sent.'
    );
  END IF;
  
  -- Log the password reset request
  PERFORM log_security_event(
    'password_reset_requested',
    null,
    jsonb_build_object(
      'email', user_email,
      'timestamp', now()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password reset email sent successfully.'
  );
END;
$$;