-- Add challenge_type enum to support both habit and kpi challenges
CREATE TYPE challenge_type AS ENUM ('habit', 'kpi');

-- Add challenge_type column to existing challenges table
ALTER TABLE public.challenges 
ADD COLUMN challenge_type challenge_type NOT NULL DEFAULT 'habit';

-- Create table for KPI definitions and configuration
CREATE TABLE public.kpi_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL,
  kpi_type TEXT NOT NULL, -- 'steps', 'sleep_hours', 'hrv', 'resting_hr', 'custom'
  target_value NUMERIC NOT NULL,
  unit TEXT NOT NULL, -- 'steps', 'hours', 'bpm', 'ms', 'custom'
  measurement_frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  aggregation_method TEXT NOT NULL DEFAULT 'average', -- 'average', 'sum', 'max', 'min'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for KPI measurements/data entry
CREATE TABLE public.kpi_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_definition_id UUID NOT NULL,
  user_id UUID NOT NULL,
  measured_value NUMERIC NOT NULL,
  measurement_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(kpi_definition_id, user_id, measurement_date)
);

-- Enable RLS on new tables
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kpi_definitions
CREATE POLICY "Members can view KPI definitions" 
ON public.kpi_definitions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM challenges c 
  WHERE c.id = kpi_definitions.challenge_id 
  AND is_group_member(c.group_id)
));

CREATE POLICY "Owner or creator can manage KPI definitions" 
ON public.kpi_definitions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM challenges c 
  WHERE c.id = kpi_definitions.challenge_id 
  AND (is_group_owner(c.group_id) OR c.created_by = auth.uid())
));

-- RLS Policies for kpi_measurements
CREATE POLICY "Members can view KPI measurements" 
ON public.kpi_measurements 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM kpi_definitions kd
  JOIN challenges c ON c.id = kd.challenge_id
  WHERE kd.id = kpi_measurements.kpi_definition_id 
  AND is_group_member(c.group_id)
));

CREATE POLICY "Participants can manage their own measurements" 
ON public.kpi_measurements 
FOR ALL 
USING (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM kpi_definitions kd
  JOIN challenge_participants cp ON cp.challenge_id = kd.challenge_id
  WHERE kd.id = kpi_measurements.kpi_definition_id 
  AND cp.user_id = auth.uid()
));

-- Create trigger for updating timestamps
CREATE TRIGGER update_kpi_definitions_updated_at
BEFORE UPDATE ON public.kpi_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.kpi_definitions 
ADD CONSTRAINT fk_kpi_definitions_challenge 
FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;

ALTER TABLE public.kpi_measurements 
ADD CONSTRAINT fk_kpi_measurements_definition 
FOREIGN KEY (kpi_definition_id) REFERENCES public.kpi_definitions(id) ON DELETE CASCADE;