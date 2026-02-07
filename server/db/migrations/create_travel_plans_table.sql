DO $$
DECLARE
  user_id_type TEXT;
BEGIN
  SELECT data_type INTO user_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';

  IF user_id_type = 'integer' THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS travel_plans (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      plan_data JSONB NOT NULL,
      is_template BOOLEAN DEFAULT false,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )';
  ELSE
    EXECUTE 'CREATE TABLE IF NOT EXISTS travel_plans (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      plan_data JSONB NOT NULL,
      is_template BOOLEAN DEFAULT false,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION ensure_single_default_travel_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true AND NEW.is_template = true THEN
    UPDATE travel_plans
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true
      AND is_template = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'travel_plans') THEN
    CREATE INDEX IF NOT EXISTS idx_travel_plans_user_id ON travel_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_travel_plans_is_template ON travel_plans(is_template);
    CREATE INDEX IF NOT EXISTS idx_travel_plans_user_default ON travel_plans(user_id, is_default)
      WHERE is_default = true;

    DROP TRIGGER IF EXISTS update_travel_plans_updated_at ON travel_plans;
    CREATE TRIGGER update_travel_plans_updated_at
      BEFORE UPDATE ON travel_plans
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS ensure_single_default_travel_template_trigger ON travel_plans;
    CREATE TRIGGER ensure_single_default_travel_template_trigger
      BEFORE INSERT OR UPDATE ON travel_plans
      FOR EACH ROW
      EXECUTE FUNCTION ensure_single_default_travel_template();
  END IF;
END $$;
