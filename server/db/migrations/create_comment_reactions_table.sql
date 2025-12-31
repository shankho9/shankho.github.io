-- Create comment_reactions table for PostgreSQL
-- This table stores user reactions to comments with user details
-- Only one reaction per user per comment is allowed (enforced by unique constraint)
CREATE TABLE IF NOT EXISTS comment_reactions (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('thumbs_up', 'heart', 'party', 'rocket', 'eyes')),
  user_name VARCHAR(255),
  user_picture TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(comment_id, user_email)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_email ON comment_reactions(user_email);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON comment_reactions(reaction_type);
