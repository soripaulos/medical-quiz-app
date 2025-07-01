-- Add new metrics columns to user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS total_time_spent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_answers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS incorrect_answers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unanswered_questions INTEGER DEFAULT 0;

-- Create index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_metrics ON user_sessions(user_id, completed_at);

-- Update existing sessions with calculated metrics
UPDATE user_sessions 
SET 
  total_time_spent = CASE 
    WHEN completed_at IS NOT NULL AND created_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - created_at))::INTEGER
    ELSE 0 
  END,
  correct_answers = (
    SELECT COUNT(*) 
    FROM user_answers 
    WHERE user_answers.session_id = user_sessions.id 
    AND user_answers.is_correct = true
  ),
  incorrect_answers = (
    SELECT COUNT(*) 
    FROM user_answers 
    WHERE user_answers.session_id = user_sessions.id 
    AND user_answers.is_correct = false
  ),
  unanswered_questions = GREATEST(0, total_questions - (
    SELECT COUNT(*) 
    FROM user_answers 
    WHERE user_answers.session_id = user_sessions.id
  ))
WHERE completed_at IS NOT NULL;
