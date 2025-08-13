-- Add custom color field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN custom_color text;

-- Add a comment to describe the field
COMMENT ON COLUMN public.profiles.custom_color IS 'User-selected custom color in hex format (e.g., #D32F2F)';