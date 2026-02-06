-- Add client service period columns
ALTER TABLE public.clients
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE;

-- Add check constraint for valid date range
ALTER TABLE public.clients
  ADD CONSTRAINT chk_client_period CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);