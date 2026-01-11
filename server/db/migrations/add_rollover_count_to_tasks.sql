-- Add rollover_count field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rollover_count INTEGER DEFAULT 0;

-- Create index for rollover_count filtering
CREATE INDEX IF NOT EXISTS idx_tasks_rollover_count ON tasks(rollover_count);
