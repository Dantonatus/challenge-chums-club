-- Create approval_tokens table for secure user approval flow
CREATE TABLE public.approval_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for approval_tokens
-- Only service role (edge functions) can manage tokens
CREATE POLICY "Service role can manage approval tokens" 
ON public.approval_tokens 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view tokens for monitoring
CREATE POLICY "Admins can view approval tokens" 
ON public.approval_tokens 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_approval_tokens_token ON public.approval_tokens(token);
CREATE INDEX idx_approval_tokens_user_id ON public.approval_tokens(user_id);
CREATE INDEX idx_approval_tokens_expires_at ON public.approval_tokens(expires_at);

-- Add foreign key constraint (optional, but good practice)
ALTER TABLE public.approval_tokens 
ADD CONSTRAINT fk_approval_tokens_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;