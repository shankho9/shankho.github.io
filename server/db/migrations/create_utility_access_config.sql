-- Utility access: roles_allowed JSON 'visitor'|'admin' per utility_id

CREATE TABLE IF NOT EXISTS utility_access_config (
  utility_id VARCHAR(64) PRIMARY KEY,
  roles_allowed JSONB NOT NULL DEFAULT '["visitor","admin"]',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO utility_access_config (utility_id, roles_allowed) VALUES
  ('visitors', '["admin"]'),
  ('analytics', '["admin"]'),
  ('emails', '["admin"]'),
  ('database', '["visitor","admin"]'),
  ('health', '["visitor","admin"]'),
  ('cache', '["visitor","admin"]'),
  ('content', '["visitor","admin"]'),
  ('car-manager', '["visitor","admin"]'),
  ('locations', '["visitor","admin"]'),
  ('car-lease-calculator', '["visitor","admin"]'),
  ('rent-vs-buy-calculator', '["visitor","admin"]')
ON CONFLICT (utility_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_utility_access_config_utility_id ON utility_access_config(utility_id);
