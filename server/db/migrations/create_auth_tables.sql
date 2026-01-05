-- Create users table for unified authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  picture TEXT,
  password_hash VARCHAR(255), -- NULL for OAuth-only users
  mfa_secret VARCHAR(255), -- TOTP secret for MFA
  mfa_enabled BOOLEAN DEFAULT false,
  auth_provider VARCHAR(50) DEFAULT 'email' CHECK (auth_provider IN ('email', 'google')),
  google_sub VARCHAR(255) UNIQUE, -- Google user ID for OAuth users
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Add missing columns to existing users table if it already exists
DO $$
BEGIN
  -- Add name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
    ALTER TABLE users ADD COLUMN name VARCHAR(255);
  END IF;
  
  -- Add picture column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'picture') THEN
    ALTER TABLE users ADD COLUMN picture TEXT;
  END IF;
  
  -- Add password_hash column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
  END IF;
  
  -- Add mfa_secret column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_secret') THEN
    ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);
  END IF;
  
  -- Add mfa_enabled column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'mfa_enabled') THEN
    ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;
  END IF;
  
  -- Add auth_provider column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'auth_provider') THEN
    ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email';
    -- Add check constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_provider_check') THEN
      ALTER TABLE users ADD CONSTRAINT users_auth_provider_check CHECK (auth_provider IN ('email', 'google'));
    END IF;
  END IF;
  
  -- Add google_sub column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'google_sub') THEN
    ALTER TABLE users ADD COLUMN google_sub VARCHAR(255);
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_google_sub_key') THEN
      ALTER TABLE users ADD CONSTRAINT users_google_sub_key UNIQUE(google_sub);
    END IF;
  END IF;
  
  -- Add email_verified column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
    ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  -- Add last_login_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
  END IF;
END $$;

-- Create devices table for device tracking (must be created before sessions)
-- Create without foreign key first, then add it separately
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(255),
  os VARCHAR(255),
  ip_address VARCHAR(45),
  is_trusted BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'devices_user_id_device_fingerprint_key'
  ) THEN
    ALTER TABLE devices 
    ADD CONSTRAINT devices_user_id_device_fingerprint_key 
    UNIQUE(user_id, device_fingerprint);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add foreign key constraint to devices if it doesn't exist
-- First, clean up any orphaned data
DO $$
BEGIN
  -- Delete any devices that reference non-existent users
  DELETE FROM devices 
  WHERE user_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE id = devices.user_id
  );
  
  -- Now add the constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'devices_user_id_fkey'
  ) THEN
    ALTER TABLE devices 
    ADD CONSTRAINT devices_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    -- If constraint can't be added due to data issues, log and continue
    RAISE NOTICE 'Could not add devices_user_id_fkey constraint: %', SQLERRM;
END $$;

-- Create sessions table for session management (references devices, so must be after devices)
-- Create without foreign keys first, then add them separately
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_id INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT false
);

-- Add foreign key constraints to sessions if they don't exist
DO $$
BEGIN
  -- Clean up orphaned sessions
  DELETE FROM sessions 
  WHERE user_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE id = sessions.user_id
  );
  
  -- Add user_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sessions_user_id_fkey'
  ) THEN
    ALTER TABLE sessions 
    ADD CONSTRAINT sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add sessions_user_id_fkey constraint: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Clean up sessions with invalid device_id
  DELETE FROM sessions 
  WHERE device_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM devices WHERE id = sessions.device_id
  );
  
  -- Add device_id foreign key
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'sessions_device_id_fkey'
  ) THEN
    ALTER TABLE sessions 
    ADD CONSTRAINT sessions_device_id_fkey 
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add sessions_device_id_fkey constraint: %', SQLERRM;
END $$;

-- Create utility_passcodes table for dev utilities (planner, locations)
-- Create without foreign key first, then add it separately
CREATE TABLE IF NOT EXISTS utility_passcodes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  passcode_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- 3 months from creation/update
  UNIQUE(user_id)
);

-- Add foreign key constraint to utility_passcodes if it doesn't exist
DO $$
BEGIN
  -- Clean up orphaned utility_passcodes
  DELETE FROM utility_passcodes 
  WHERE user_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM users WHERE id = utility_passcodes.user_id
  );
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'utility_passcodes_user_id_fkey'
  ) THEN
    ALTER TABLE utility_passcodes 
    ADD CONSTRAINT utility_passcodes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not add utility_passcodes_user_id_fkey constraint: %', SQLERRM;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_utility_passcodes_user_id ON utility_passcodes(user_id);
CREATE INDEX IF NOT EXISTS idx_utility_passcodes_expires_at ON utility_passcodes(expires_at);

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_utility_passcodes_updated_at ON utility_passcodes;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_utility_passcodes_updated_at BEFORE UPDATE ON utility_passcodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create password_reset_tokens table for password reset functionality
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Add foreign key to password_reset_tokens table if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'password_reset_tokens'::regclass AND conname = 'password_reset_tokens_user_id_fkey') THEN
        -- Clean up orphaned tokens before adding FK
        DELETE FROM password_reset_tokens WHERE user_id NOT IN (SELECT id FROM users);
        ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
        EXECUTE 'ALTER TABLE password_reset_tokens VALIDATE CONSTRAINT password_reset_tokens_user_id_fkey';
    END IF;
END $$;

-- Create indexes for password_reset_tokens
DROP INDEX IF EXISTS idx_password_reset_tokens_user_id;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
DROP INDEX IF EXISTS idx_password_reset_tokens_token;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at;
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Create function to clean up expired sessions (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE expires_at < CURRENT_TIMESTAMP OR revoked = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired password reset tokens (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
