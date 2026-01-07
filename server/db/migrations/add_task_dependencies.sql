-- Add depends_on_task_id column to tasks table for dependent task functionality
-- This allows tasks to depend on other tasks and only become active when the parent task is completed

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS depends_on_task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;

-- Create index for better query performance when filtering by dependencies
CREATE INDEX IF NOT EXISTS idx_tasks_depends_on_task_id ON tasks(depends_on_task_id);

-- Add check constraint to prevent self-referencing (a task cannot depend on itself)
ALTER TABLE tasks 
ADD CONSTRAINT check_no_self_dependency 
CHECK (depends_on_task_id IS NULL OR depends_on_task_id != id);
