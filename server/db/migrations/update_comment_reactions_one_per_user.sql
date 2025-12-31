-- Update comment_reactions table to allow only one reaction per user per comment
-- and add user details (name, picture)

-- Step 1: Drop the old unique constraint
ALTER TABLE comment_reactions 
DROP CONSTRAINT IF EXISTS comment_reactions_comment_id_user_email_reaction_type_key;

-- Step 2: Add user_name and user_picture columns (nullable for existing data)
ALTER TABLE comment_reactions 
ADD COLUMN IF NOT EXISTS user_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_picture TEXT;

-- Step 3: Handle existing duplicates before creating unique constraint
-- Keep only the most recent reaction for each (comment_id, user_email) pair
DELETE FROM comment_reactions cr1
WHERE EXISTS (
  SELECT 1 FROM comment_reactions cr2
  WHERE cr2.comment_id = cr1.comment_id
    AND cr2.user_email = cr1.user_email
    AND cr2.id > cr1.id
);

-- Step 4: Create new unique constraint for one reaction per user per comment
ALTER TABLE comment_reactions 
ADD CONSTRAINT comment_reactions_comment_id_user_email_unique 
UNIQUE (comment_id, user_email);

-- Step 5: Update existing rows to have user_name and user_picture from comments table
-- (This is optional - only if we want to backfill data)
-- UPDATE comment_reactions cr
-- SET user_name = c.user_name, user_picture = c.user_picture
-- FROM comments c
-- WHERE cr.comment_id = c.id AND cr.user_email = c.user_email;
