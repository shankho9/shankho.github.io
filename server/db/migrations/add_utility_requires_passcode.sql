ALTER TABLE utility_access_config
  ADD COLUMN IF NOT EXISTS requires_passcode BOOLEAN NOT NULL DEFAULT false;
UPDATE utility_access_config SET requires_passcode = true
WHERE utility_id IN ('car-lease-calculator', 'rent-vs-buy-calculator');
