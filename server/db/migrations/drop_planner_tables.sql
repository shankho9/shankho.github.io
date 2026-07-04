-- Remove personal planner utility and database objects

DELETE FROM utility_access_config WHERE utility_id = 'planner';

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_weekly_reviews_updated_at ON weekly_reviews;

DROP TABLE IF EXISTS tasks_archive CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS weekly_reviews CASCADE;
