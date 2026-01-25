-- Admin passcode (admin_passcodes). Distinct from utilities passcode. Requires create_auth_tables.

CREATE TABLE IF NOT EXISTS admin_passcodes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  passcode_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_passcodes_user_id_fkey') THEN
    ALTER TABLE admin_passcodes
      ADD CONSTRAINT admin_passcodes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'admin_passcodes_user_id_fkey: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_passcodes_user_id ON admin_passcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_passcodes_expires_at ON admin_passcodes(expires_at);

DROP TRIGGER IF EXISTS update_admin_passcodes_updated_at ON admin_passcodes;
CREATE TRIGGER update_admin_passcodes_updated_at
  BEFORE UPDATE ON admin_passcodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
