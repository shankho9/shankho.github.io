-- Admin passcode (admin_passcodes). Distinct from utilities passcode.
-- Supports users.id as INTEGER (SERIAL) or TEXT depending on environment.

DO $$
DECLARE
  user_id_type TEXT;
BEGIN
  SELECT data_type INTO user_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';

  IF user_id_type IS NULL THEN
    RAISE NOTICE 'users table not found; skipping admin_passcodes migration';
    RETURN;
  END IF;

  -- Recreate if an older migration created INTEGER user_id against TEXT users.id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_passcodes'
  ) AND user_id_type <> 'integer' AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_passcodes'
      AND column_name = 'user_id'
      AND data_type = 'integer'
  ) THEN
    DROP TABLE admin_passcodes;
  END IF;

  IF user_id_type = 'integer' THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS admin_passcodes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        passcode_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_passcodes_user_id_fkey') THEN
      ALTER TABLE admin_passcodes
        ADD CONSTRAINT admin_passcodes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  ELSE
    EXECUTE '
      CREATE TABLE IF NOT EXISTS admin_passcodes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        passcode_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )';
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_passcodes_user_id_fkey') THEN
      ALTER TABLE admin_passcodes
        ADD CONSTRAINT admin_passcodes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_passcodes_user_id ON admin_passcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_passcodes_expires_at ON admin_passcodes(expires_at);

DROP TRIGGER IF EXISTS update_admin_passcodes_updated_at ON admin_passcodes;
CREATE TRIGGER update_admin_passcodes_updated_at
  BEFORE UPDATE ON admin_passcodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
