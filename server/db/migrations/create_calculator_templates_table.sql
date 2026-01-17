-- Create calculator_templates table for storing car lease calculator templates
CREATE TABLE IF NOT EXISTS calculator_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL, -- Stores all calculator assumptions
  is_default BOOLEAN DEFAULT false, -- Mark one template as default per user
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_calculator_templates_user_id ON calculator_templates(user_id);

-- Create index on user_id and is_default for default template lookups
CREATE INDEX IF NOT EXISTS idx_calculator_templates_user_default ON calculator_templates(user_id, is_default) WHERE is_default = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_calculator_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calculator_templates_updated_at
  BEFORE UPDATE ON calculator_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_calculator_templates_updated_at();

-- Ensure only one default template per user
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other default templates for this user
    UPDATE calculator_templates
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_template_trigger
  BEFORE INSERT OR UPDATE ON calculator_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();
