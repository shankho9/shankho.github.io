-- Add performance indexes for tasks table queries
-- These indexes improve query performance for common operations

-- Index for filtering by deleted_at (used in tasks.get.ts)
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at_status ON tasks(deleted_at, status) 
WHERE deleted_at IS NOT NULL;

-- Composite index for common query patterns (status, planned_date, is_mit)
CREATE INDEX IF NOT EXISTS idx_tasks_status_planned_mit ON tasks(status, planned_date, is_mit);

-- Index for theme filtering and grouping
CREATE INDEX IF NOT EXISTS idx_tasks_theme_status ON tasks(theme, status) 
WHERE theme IS NOT NULL;

-- Index for date-based queries (used in dashboard and daily views)
CREATE INDEX IF NOT EXISTS idx_tasks_planned_date_status ON tasks(planned_date, status) 
WHERE planned_date IS NOT NULL;

-- Index for sorting by priority and MIT
CREATE INDEX IF NOT EXISTS idx_tasks_priority_mit ON tasks(priority, is_mit);
