-- Migration: Add OAuth provider columns for Apple, Outlook, and GitHub
-- Run this migration to add support for additional OAuth providers

-- Add new OAuth provider columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS apple_sub TEXT,
ADD COLUMN IF NOT EXISTS outlook_id TEXT,
ADD COLUMN IF NOT EXISTS github_id TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub) WHERE apple_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_outlook_id ON users(outlook_id) WHERE outlook_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id) WHERE github_id IS NOT NULL;

-- Note: The auth_provider column should already support text values
-- If it's an enum, you may need to alter it:
-- ALTER TABLE users ALTER COLUMN auth_provider TYPE TEXT;
-- Or add the new values to the enum if using PostgreSQL enum type

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('apple_sub', 'outlook_id', 'github_id', 'auth_provider');
