-- Update user_answers table to use choice letters instead of IDs
ALTER TABLE user_answers DROP COLUMN IF EXISTS selected_choice_id;
ALTER TABLE user_answers ADD COLUMN IF NOT EXISTS selected_choice_letter TEXT;

-- Add session mode to user_sessions
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS session_mode TEXT CHECK (session_mode IN ('practice', 'exam')) DEFAULT 'practice';

-- Add more detailed session tracking
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS filters JSONB;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS questions_order JSONB;

-- Create user statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  specialty_id UUID REFERENCES specialties(id),
  total_questions_attempted INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_incorrect INTEGER DEFAULT 0,
  average_difficulty DECIMAL(3,2),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, specialty_id)
);

-- RLS for user statistics
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own statistics" ON user_statistics FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_answers_user_session ON user_answers(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_user_question_progress_flagged ON user_question_progress(user_id, is_flagged);
CREATE INDEX IF NOT EXISTS idx_questions_filters ON questions(specialty_id, year, difficulty);
