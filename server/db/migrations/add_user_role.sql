-- Add role column to users table
-- Default role is 'visitor', with 'admin' as the only other option
DO $$
BEGIN
  -- Add role column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'visitor' NOT NULL;
    
    -- Add check constraint to ensure role is either 'visitor' or 'admin'
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('visitor', 'admin'));
    
    -- Create index for role lookups
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    
    RAISE NOTICE 'Added role column to users table with default value "visitor"';
  ELSE
    RAISE NOTICE 'Role column already exists in users table';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error adding role column: %', SQLERRM;
END $$;
