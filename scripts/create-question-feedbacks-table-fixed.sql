-- Drop existing table if it exists (for clean setup)
DROP TABLE IF EXISTS question_feedbacks CASCADE;

-- Create question_feedbacks table for collecting user feedback on questions
CREATE TABLE question_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  session_id UUID,
  feedback_type TEXT NOT NULL,
  suggested_correct_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Add foreign key constraints
  CONSTRAINT fk_question_feedbacks_user_id 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_question_feedbacks_question_id 
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_question_feedbacks_session_id 
    FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE SET NULL,
    
  -- Add check constraints
  CONSTRAINT chk_feedback_type CHECK (feedback_type IN (
    'answer_correction',
    'faulty_question',
    'incorrect_explanation', 
    'incomplete_information',
    'typo_grammar',
    'image_issue',
    'source_problem'
  )),
  CONSTRAINT chk_suggested_answer CHECK (
    suggested_correct_answer IS NULL OR 
    suggested_correct_answer IN ('A', 'B', 'C', 'D', 'E', 'F')
  )
);

-- Create indexes for better performance
CREATE INDEX idx_question_feedbacks_user_id ON question_feedbacks(user_id);
CREATE INDEX idx_question_feedbacks_question_id ON question_feedbacks(question_id);
CREATE INDEX idx_question_feedbacks_session_id ON question_feedbacks(session_id);
CREATE INDEX idx_question_feedbacks_feedback_type ON question_feedbacks(feedback_type);
CREATE INDEX idx_question_feedbacks_created_at ON question_feedbacks(created_at DESC);

-- Create composite index for common queries
CREATE INDEX idx_question_feedbacks_question_type ON question_feedbacks(question_id, feedback_type);

-- Enable Row Level Security
ALTER TABLE question_feedbacks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own feedback" ON question_feedbacks;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON question_feedbacks;
DROP POLICY IF EXISTS "Admins can view all feedback" ON question_feedbacks;
DROP POLICY IF EXISTS "Admins can update feedback" ON question_feedbacks;
DROP POLICY IF EXISTS "Admins can delete feedback" ON question_feedbacks;

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

-- Test the constraints by inserting a sample record (remove this after testing)
-- INSERT INTO question_feedbacks (user_id, question_id, feedback_type) 
-- VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'answer_correction');

-- Grant necessary permissions
GRANT ALL ON question_feedbacks TO authenticated;
GRANT ALL ON question_feedbacks TO service_role;