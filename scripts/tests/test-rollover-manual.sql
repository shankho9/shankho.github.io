-- Manual SQL Script to Test Rollover Count Feature
-- Run this SQL directly in your database client (e.g., pgAdmin, psql, DBeaver, etc.)

-- ============================================
-- OPTION 1: Set rollover_count for a test task
-- ============================================
-- First, find a task ID to test with:
-- SELECT id, title, status, planned_date, COALESCE(rollover_count, 0) as rollover_count 
-- FROM tasks 
-- WHERE status = 'doing' 
--   AND (deleted_at IS NULL OR deleted_at > CURRENT_TIMESTAMP - INTERVAL '1 day')
-- LIMIT 5;

-- Then set rollover_count for that task (replace <taskId> with actual ID):
-- UPDATE tasks 
-- SET rollover_count = 3, updated_at = CURRENT_TIMESTAMP 
-- WHERE id = <taskId>;

-- Verify it was updated:
-- SELECT id, title, rollover_count, planned_date, status 
-- FROM tasks 
-- WHERE id = <taskId>;

-- ============================================
-- OPTION 2: Set planned_date to yesterday to test actual rollover
-- ============================================
-- This simulates a task that needs to be rolled over on next page refresh
-- (Replace <taskId> with actual task ID)

-- First, check current state:
-- SELECT id, title, status, planned_date, COALESCE(rollover_count, 0) as rollover_count 
-- FROM tasks 
-- WHERE id = <taskId>;

-- Set planned_date to yesterday:
-- UPDATE tasks 
-- SET planned_date = CURRENT_DATE - INTERVAL '1 day', updated_at = CURRENT_TIMESTAMP 
-- WHERE id = <taskId> AND status = 'doing';

-- Verify:
-- SELECT id, title, status, planned_date, COALESCE(rollover_count, 0) as rollover_count 
-- FROM tasks 
-- WHERE id = <taskId>;

-- Now refresh the planner tasks page, and the rollover_count should increment by 1

-- ============================================
-- OPTION 3: List all tasks with rollover_count
-- ============================================
SELECT 
  id, 
  title, 
  status, 
  planned_date, 
  COALESCE(rollover_count, 0) as rollover_count,
  created_at
FROM tasks 
WHERE (deleted_at IS NULL OR deleted_at > CURRENT_TIMESTAMP - INTERVAL '1 day')
  AND (is_archived IS NULL OR is_archived = false)
ORDER BY rollover_count DESC, id ASC
LIMIT 20;
