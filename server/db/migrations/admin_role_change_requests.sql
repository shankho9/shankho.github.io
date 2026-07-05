-- Admin role change OTP requests (email verification before role updates)
-- Supports users.id as INTEGER (SERIAL) or TEXT depending on environment.
DO $$
DECLARE
  user_id_type TEXT;
BEGIN
  SELECT data_type INTO user_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';

  IF user_id_type IS NULL THEN
    RAISE NOTICE 'users table not found; skipping admin_role_change_requests migration';
    RETURN;
  END IF;

  -- Recreate if an older migration created INTEGER FK columns against TEXT users.id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admin_role_change_requests'
  ) AND user_id_type <> 'integer' AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_role_change_requests'
      AND column_name = 'admin_user_id'
      AND data_type = 'integer'
  ) THEN
    DROP TABLE admin_role_change_requests;
  END IF;

  IF user_id_type = 'integer' THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS admin_role_change_requests (
        id SERIAL PRIMARY KEY,
        admin_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        new_role VARCHAR(20) NOT NULL CHECK (new_role IN (''visitor'', ''admin'')),
        otp_hash VARCHAR(255) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )';
  ELSE
    EXECUTE '
      CREATE TABLE IF NOT EXISTS admin_role_change_requests (
        id SERIAL PRIMARY KEY,
        admin_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        new_role VARCHAR(20) NOT NULL CHECK (new_role IN (''visitor'', ''admin'')),
        otp_hash VARCHAR(255) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_role_change_admin ON admin_role_change_requests(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_change_target ON admin_role_change_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_change_expires ON admin_role_change_requests(expires_at);
