-- Create question_feedbacks table for collecting user feedback on questions
CREATE TABLE IF NOT EXISTS question_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'answer_correction',
    'faulty_question', 
    'incorrect_explanation',
    'incomplete_information',
    'typo_grammar',
    'image_issue',
    'source_problem'
  )),
  suggested_correct_answer TEXT CHECK (suggested_correct_answer IN ('A', 'B', 'C', 'D', 'E', 'F')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_question_feedbacks_user_id ON question_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_question_feedbacks_question_id ON question_feedbacks(question_id);
CREATE INDEX IF NOT EXISTS idx_question_feedbacks_session_id ON question_feedbacks(session_id);
CREATE INDEX IF NOT EXISTS idx_question_feedbacks_feedback_type ON question_feedbacks(feedback_type);
CREATE INDEX IF NOT EXISTS idx_question_feedbacks_created_at ON question_feedbacks(created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_question_feedbacks_question_type ON question_feedbacks(question_id, feedback_type);

-- Enable Row Level Security
ALTER TABLE question_feedbacks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users can view their own feedback submissions
CREATE POLICY "Users can view their own feedback" ON question_feedbacks
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON question_feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON question_feedbacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can update feedback (for moderation)
CREATE POLICY "Admins can update feedback" ON question_feedbacks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete feedback (for moderation)
CREATE POLICY "Admins can delete feedback" ON question_feedbacks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create a function to get feedback statistics for questions
CREATE OR REPLACE FUNCTION get_question_feedback_stats(question_uuid UUID)
RETURNS TABLE (
  feedback_type TEXT,
  count BIGINT,
  suggested_answers JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qf.feedback_type,
    COUNT(*) as count,
    CASE 
      WHEN qf.feedback_type = 'answer_correction' THEN
        jsonb_agg(
          jsonb_build_object(
            'answer', qf.suggested_correct_answer,
            'count', 1
          )
        )
      ELSE NULL
    END as suggested_answers
  FROM question_feedbacks qf
  WHERE qf.question_id = question_uuid
  GROUP BY qf.feedback_type
  ORDER BY count DESC;
END;
$$;

-- Create a function to check if user has already provided feedback for a question
CREATE OR REPLACE FUNCTION user_has_feedback_for_question(question_uuid UUID, feedback_type_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM question_feedbacks
    WHERE question_id = question_uuid
    AND user_id = auth.uid()
    AND feedback_type = feedback_type_param
  );
END;
$$;