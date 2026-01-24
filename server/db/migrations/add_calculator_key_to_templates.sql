-- Add calculator_key to support multiple calculators sharing templates table
-- Ensures templates are scoped per-user per-calculator.

ALTER TABLE calculator_templates
  ADD COLUMN IF NOT EXISTS calculator_key TEXT NOT NULL DEFAULT 'car-lease';

-- Index for faster lookups by user + calculator
CREATE INDEX IF NOT EXISTS idx_calculator_templates_user_calc_key
  ON calculator_templates(user_id, calculator_key);

-- Update the "single default" constraint to be per user + calculator_key
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE calculator_templates
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND calculator_key = NEW.calculator_key
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists (migration may run on DBs where triggers were dropped)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_single_default_template_trigger'
  ) THEN
    CREATE TRIGGER ensure_single_default_template_trigger
      BEFORE INSERT OR UPDATE ON calculator_templates
      FOR EACH ROW
      EXECUTE FUNCTION ensure_single_default_template();
  END IF;
END;
$$;

