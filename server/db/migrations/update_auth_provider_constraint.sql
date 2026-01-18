-- Migration: Update auth_provider check constraint to include all OAuth providers
-- This allows 'email', 'google', 'apple', 'outlook', and 'github' as valid auth_provider values

-- Drop the existing constraint if it exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_provider_check;

-- Add the updated constraint with all OAuth providers
ALTER TABLE users ADD CONSTRAINT users_auth_provider_check 
  CHECK (auth_provider IN ('email', 'google', 'apple', 'outlook', 'github'));

-- Verify the constraint was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_auth_provider_check'
  ) THEN
    RAISE NOTICE '✅ Constraint users_auth_provider_check updated successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create constraint users_auth_provider_check';
  END IF;
END $$;
