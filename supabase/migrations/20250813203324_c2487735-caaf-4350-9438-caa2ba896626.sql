-- Add penalty system to KPI challenges by adding penalty_amount to challenges table if not exists
-- (This column might already exist, so we use ALTER TABLE IF EXISTS pattern)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'penalty_amount') THEN
        ALTER TABLE challenges ADD COLUMN penalty_amount numeric NOT NULL DEFAULT 1.00;
    END IF;
END $$;

-- Create function to detect KPI violations based on measurement frequency
CREATE OR REPLACE FUNCTION public.detect_kpi_violations()
RETURNS TRIGGER AS $$
DECLARE
    kpi_def RECORD;
    challenge_rec RECORD;
    violation_amount numeric;
    measurement_period_start date;
    measurement_period_end date;
    period_measurements numeric;
    target_met boolean := false;
BEGIN
    -- Get KPI definition and challenge details
    SELECT kd.*, c.penalty_amount, c.start_date, c.end_date 
    INTO kpi_def, challenge_rec
    FROM kpi_definitions kd
    JOIN challenges c ON c.id = kd.challenge_id
    WHERE kd.id = NEW.kpi_definition_id;
    
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
    
    -- Check if target is met
    target_met := period_measurements >= kpi_def.target_value;
    
    -- If target not met and we're at the end of the measurement period, create violation
    IF NOT target_met AND NEW.measurement_date = measurement_period_end THEN
        -- Check if violation already exists for this period
        IF NOT EXISTS (
            SELECT 1 FROM challenge_violations cv
            WHERE cv.challenge_id = kpi_def.challenge_id
              AND cv.user_id = NEW.user_id
              AND cv.created_at::date >= measurement_period_start
              AND cv.created_at::date <= measurement_period_end
        ) THEN
            -- Calculate violation amount (difference from target)
            violation_amount := (kpi_def.target_value - period_measurements) * challenge_rec.penalty_amount;
            
            -- Create violation record
            INSERT INTO challenge_violations (challenge_id, user_id, amount_cents, created_at)
            VALUES (
                kpi_def.challenge_id,
                NEW.user_id,
                ROUND(violation_amount * 100), -- Convert to cents
                NOW()
            );
            
            -- Update penalty count for participant
            UPDATE challenge_participants 
            SET penalty_count = penalty_count + 1
            WHERE challenge_id = kpi_def.challenge_id AND user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic KPI violation detection
DROP TRIGGER IF EXISTS kpi_violation_detection_trigger ON kpi_measurements;
CREATE TRIGGER kpi_violation_detection_trigger
    AFTER INSERT ON kpi_measurements
    FOR EACH ROW
    EXECUTE FUNCTION detect_kpi_violations();

-- Create function for manual KPI violation entry
CREATE OR REPLACE FUNCTION public.create_manual_kpi_violation(
    p_challenge_id uuid,
    p_user_id uuid,
    p_amount_cents integer,
    p_violation_date date DEFAULT CURRENT_DATE
)
RETURNS uuid AS $$
DECLARE
    violation_id uuid;
BEGIN
    -- Check if user is participant in challenge
    IF NOT EXISTS (
        SELECT 1 FROM challenge_participants cp
        WHERE cp.challenge_id = p_challenge_id AND cp.user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a participant in this challenge';
    END IF;
    
    -- Create violation record
    INSERT INTO challenge_violations (challenge_id, user_id, amount_cents, created_at)
    VALUES (p_challenge_id, p_user_id, p_amount_cents, p_violation_date)
    RETURNING id INTO violation_id;
    
    -- Update penalty count
    UPDATE challenge_participants 
    SET penalty_count = penalty_count + 1
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id;
    
    RETURN violation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;