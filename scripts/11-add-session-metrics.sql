-- Add new columns to user_sessions table for storing calculated metrics
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS incorrect_answers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unanswered_questions INTEGER DEFAULT 0;

-- Create index for better performance on session queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_metrics ON user_sessions(user_id, completed_at);

-- Update existing sessions with calculated metrics
UPDATE user_sessions 
SET 
  correct_answers = COALESCE((
    SELECT COUNT(*) 
    FROM user_answers 
    WHERE user_answers.session_id = user_sessions.id 
    AND user_answers.is_correct = true
  ), 0),
  incorrect_answers = COALESCE((
    SELECT COUNT(*) 
    FROM user_answers 
    WHERE user_answers.session_id = user_sessions.id 
    AND user_answers.is_correct = false
  ), 0),
  unanswered_questions = GREATEST(0, total_questions - COALESCE((
    SELECT COUNT(*) 
    FROM user_answers 
    WHERE user_answers.session_id = user_sessions.id
  ), 0)),
  total_time_spent = CASE 
    WHEN time_limit IS NOT NULL AND time_remaining IS NOT NULL 
    THEN (time_limit * 60) - time_remaining
    WHEN completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - created_at))::INTEGER
    ELSE 0
  END
WHERE completed_at IS NOT NULL;
