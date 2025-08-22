-- Create saved_views table for storing user view configurations
CREATE TABLE public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL,
  date_range jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own saved views" 
ON public.saved_views 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own saved views" 
ON public.saved_views 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own saved views" 
ON public.saved_views 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own saved views" 
ON public.saved_views 
FOR DELETE 
USING (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_saved_views_updated_at
BEFORE UPDATE ON public.saved_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();