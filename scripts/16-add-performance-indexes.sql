-- Add performance indexes for better question filtering and loading

-- Index for specialty filtering
CREATE INDEX IF NOT EXISTS idx_questions_specialty_id ON questions(specialty_id);

-- Index for exam type filtering  
CREATE INDEX IF NOT EXISTS idx_questions_exam_type_id ON questions(exam_type_id);

-- Index for difficulty filtering
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_questions_filters ON questions(specialty_id, exam_type_id, year, difficulty);

-- Index for created_at for better ordering/pagination
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);

-- Index for random sampling (using id for randomization)
CREATE INDEX IF NOT EXISTS idx_questions_id ON questions(id);

-- Indexes for user progress queries
CREATE INDEX IF NOT EXISTS idx_user_question_progress_user_question ON user_question_progress(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_question ON user_answers(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_answered_at ON user_answers(answered_at DESC);

-- Index for session questions
CREATE INDEX IF NOT EXISTS idx_session_questions_session_id ON session_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_questions_question_order ON session_questions(session_id, question_order);

-- Analyze tables to update statistics for better query planning
ANALYZE questions;
ANALYZE user_question_progress;
ANALYZE user_answers;
ANALYZE session_questions;