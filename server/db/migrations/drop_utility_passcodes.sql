-- Set all utilities to admin-only; disable utility passcodes
UPDATE utility_access_config
SET roles_allowed = '["admin"]'::jsonb,
    requires_passcode = false,
    updated_at = CURRENT_TIMESTAMP
WHERE utility_id IS NOT NULL;

-- Drop utility passcode tables (replaced by login + admin passcode for /dev)
DROP TABLE IF EXISTS utility_passcode_reset_tokens CASCADE;
DROP TABLE IF EXISTS utility_passcodes CASCADE;
