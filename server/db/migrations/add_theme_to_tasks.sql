-- Add theme field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS theme VARCHAR(200);

-- Create index for theme filtering
CREATE INDEX IF NOT EXISTS idx_tasks_theme ON tasks(theme);
