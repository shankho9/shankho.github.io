INSERT INTO utility_access_config (utility_id, roles_allowed, requires_passcode)
VALUES ('locations-list', '["visitor","admin"]', false)
ON CONFLICT (utility_id) DO NOTHING;
