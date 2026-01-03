-- Add archival support to tasks table
-- This migration adds:
-- 1. deleted_at column to track when tasks are marked for deletion
-- 2. is_archived column to track if task was closed and archived
-- 3. tasks_archive table to store archived tasks for statistics

-- Add columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create index for deleted_at to help with cleanup queries
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;

-- Create tasks_archive table to store archived tasks for statistics
CREATE TABLE IF NOT EXISTS tasks_archive (
  id SERIAL PRIMARY KEY,
  original_task_id INTEGER, -- Reference to original task ID (if needed)
  title VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL,
  is_mit BOOLEAN DEFAULT false,
  priority VARCHAR(20) DEFAULT 'medium',
  planned_date DATE,
  notes TEXT,
  theme VARCHAR(200),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When task was completed/closed
  archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When task was archived
  created_at TIMESTAMP, -- Original creation timestamp
  updated_at TIMESTAMP -- Last update before archival
);

-- Create indexes for tasks_archive table
CREATE INDEX IF NOT EXISTS idx_tasks_archive_completed_at ON tasks_archive(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_archive_archived_at ON tasks_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_archive_status ON tasks_archive(status);
CREATE INDEX IF NOT EXISTS idx_tasks_archive_is_mit ON tasks_archive(is_mit);
CREATE INDEX IF NOT EXISTS idx_tasks_archive_theme ON tasks_archive(theme);
