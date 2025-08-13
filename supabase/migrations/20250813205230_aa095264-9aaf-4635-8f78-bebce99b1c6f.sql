-- Add goal_direction to kpi_definitions table
ALTER TABLE kpi_definitions 
ADD COLUMN goal_direction TEXT NOT NULL DEFAULT 'higher_better' 
CHECK (goal_direction IN ('higher_better', 'lower_better'));

-- Update existing records with sensible defaults based on KPI type
UPDATE kpi_definitions 
SET goal_direction = CASE 
  WHEN kpi_type = 'resting_hr' THEN 'lower_better'
  ELSE 'higher_better'
END;

-- Add updated_at to kpi_measurements for edit tracking
ALTER TABLE kpi_measurements 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create trigger for kpi_measurements updated_at
CREATE TRIGGER update_kpi_measurements_updated_at
  BEFORE UPDATE ON kpi_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Recreate the enhanced KPI violation detection function
CREATE OR REPLACE FUNCTION public.detect_kpi_violations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    kpi_def RECORD;
    challenge_penalty_amount numeric;
    violation_amount numeric;
    measurement_period_start date;
    measurement_period_end date;
    period_measurements numeric;
    target_met boolean := false;
    challenge_id_var uuid;
    existing_measurement_count integer;
BEGIN
    -- Get KPI definition with goal direction
    SELECT * INTO kpi_def
    FROM kpi_definitions kd
    WHERE kd.id = NEW.kpi_definition_id;
    
    -- Get challenge penalty amount
    SELECT penalty_amount, id INTO challenge_penalty_amount, challenge_id_var
    FROM challenges c
    WHERE c.id = kpi_def.challenge_id;
    
    -- Calculate period boundaries based on measurement frequency
    CASE kpi_def.measurement_frequency
        WHEN 'daily' THEN
            measurement_period_start := NEW.measurement_date;
            measurement_period_end := NEW.measurement_date;
        WHEN 'weekly' THEN
            -- Find start of week (Monday)
            measurement_period_start := NEW.measurement_date - INTERVAL '1 day' * (EXTRACT(DOW FROM NEW.measurement_date) - 1);
            measurement_period_end := measurement_period_start + INTERVAL '6 days';
        WHEN 'monthly' THEN
            -- First day of month
            measurement_period_start := date_trunc('month', NEW.measurement_date)::date;
            measurement_period_end := (date_trunc('month', NEW.measurement_date) + INTERVAL '1 month - 1 day')::date;
    END CASE;
    
    -- For weekly/monthly: Check if this violates frequency restriction
    IF kpi_def.measurement_frequency IN ('weekly', 'monthly') THEN
        SELECT COUNT(*) INTO existing_measurement_count
        FROM kpi_measurements km
        WHERE km.kpi_definition_id = NEW.kpi_definition_id
          AND km.user_id = NEW.user_id
          AND km.measurement_date >= measurement_period_start
          AND km.measurement_date <= measurement_period_end
          AND km.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid); -- Exclude current record for updates
        
        -- Allow only one measurement per period
        IF existing_measurement_count > 0 THEN
            RAISE EXCEPTION 'Nur ein Eintrag pro % erlaubt', 
                CASE kpi_def.measurement_frequency 
                    WHEN 'weekly' THEN 'Woche'
                    WHEN 'monthly' THEN 'Monat'
                END;
        END IF;
    END IF;
    
    -- Calculate aggregated value for the period
    SELECT CASE kpi_def.aggregation_method
        WHEN 'sum' THEN COALESCE(SUM(measured_value), 0)
        WHEN 'average' THEN COALESCE(AVG(measured_value), 0)
        WHEN 'max' THEN COALESCE(MAX(measured_value), 0)
        WHEN 'min' THEN COALESCE(MIN(measured_value), 0)
        ELSE COALESCE(AVG(measured_value), 0)
    END
    INTO period_measurements
    FROM kpi_measurements km
    WHERE km.kpi_definition_id = NEW.kpi_definition_id
      AND km.user_id = NEW.user_id
      AND km.measurement_date >= measurement_period_start
      AND km.measurement_date <= measurement_period_end;
    
    -- Check if target is met based on goal direction
    target_met := CASE kpi_def.goal_direction
        WHEN 'higher_better' THEN period_measurements >= kpi_def.target_value
        WHEN 'lower_better' THEN period_measurements <= kpi_def.target_value
        ELSE false
    END;
    
    -- For daily: check immediately; for weekly/monthly: check at period end
    IF (kpi_def.measurement_frequency = 'daily') OR 
       (kpi_def.measurement_frequency = 'weekly' AND NEW.measurement_date = measurement_period_end) OR
       (kpi_def.measurement_frequency = 'monthly' AND NEW.measurement_date = measurement_period_end) THEN
        
        -- Remove any existing violations for this period first
        DELETE FROM challenge_violations cv
        WHERE cv.challenge_id = challenge_id_var
          AND cv.user_id = NEW.user_id
          AND cv.created_at::date >= measurement_period_start
          AND cv.created_at::date <= measurement_period_end;
        
        -- If target not met, create violation
        IF NOT target_met THEN
            -- Calculate violation amount
            violation_amount := challenge_penalty_amount;
            
            -- Create violation record
            INSERT INTO challenge_violations (challenge_id, user_id, amount_cents, created_at)
            VALUES (
                challenge_id_var,
                NEW.user_id,
                ROUND(violation_amount * 100), -- Convert to cents
                NOW()
            );
            
            -- Update penalty count for participant
            UPDATE challenge_participants 
            SET penalty_count = penalty_count + 1
            WHERE challenge_id = challenge_id_var AND user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;