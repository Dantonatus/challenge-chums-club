-- Fix critical security issues in the database

-- 1. Fix payments table RLS to restrict payment visibility to only the user who made the payment
-- Remove the current overly permissive policy that allows group owners to view all payments
DROP POLICY IF EXISTS "Users and group owners can view payments" ON public.payments;

-- Create a more secure policy that only allows users to view their own payments
-- Admins can still view all payments for administrative purposes
CREATE POLICY "Users can only view their own payments"
ON public.payments
FOR SELECT
USING (
  user_id = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Fix approval_tokens table - this should only be accessible by service role
-- The current policies are actually correct and secure, but let's ensure they're properly documented

-- 3. Ensure journal_entries remain completely private (current policies are correct)
-- The existing policy "Users can view only their own private journal" is secure

-- 4. Add additional security for payment insertions to ensure data integrity
-- Update the payment insertion policy to be more explicit about security
DROP POLICY IF EXISTS "Owner can record owed/adjustment; users can mark their own paid" ON public.payments;

CREATE POLICY "Secure payment insertions"
ON public.payments
FOR INSERT
WITH CHECK (
  (
    -- Users can only mark their own payments as paid
    type = 'paid'::payment_type AND 
    user_id = auth.uid() AND 
    is_group_member(group_id)
  ) OR (
    -- Only group owners can record owed amounts or adjustments for their members
    type = ANY(ARRAY['owed'::payment_type, 'adjustment'::payment_type]) AND 
    is_group_owner(group_id) AND
    -- Ensure the target user is actually a member of the group
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = payments.group_id AND gm.user_id = payments.user_id
    )
  ) OR (
    -- Admins can insert any payment type for administrative purposes
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 5. Add audit logging for sensitive payment operations
-- Create a function to log payment access for security monitoring
CREATE OR REPLACE FUNCTION public.log_payment_access()
RETURNS trigger AS $$
BEGIN
  -- Log when payments are viewed (for audit purposes)
  INSERT INTO auth.audit_log_entries (
    instance_id,
    id,
    payload,
    created_at,
    ip_address
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    jsonb_build_object(
      'event_type', 'payment_accessed',
      'accessed_by', auth.uid(),
      'payment_id', NEW.id,
      'amount_cents', NEW.amount_cents,
      'payment_type', NEW.type,
      'timestamp', now()
    ),
    now(),
    inet_client_addr()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;