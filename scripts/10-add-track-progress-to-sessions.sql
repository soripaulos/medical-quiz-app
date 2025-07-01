-- Add track_progress column to user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN track_progress BOOLEAN DEFAULT true;

-- Update existing sessions to have track_progress enabled by default
UPDATE user_sessions 
SET track_progress = true 
WHERE track_progress IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_sessions.track_progress IS 'Whether to track user progress for this session (practice mode only)';
