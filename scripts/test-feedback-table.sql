-- Test script to verify question_feedbacks table setup
-- Run this after creating the table to ensure it works correctly

-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'question_feedbacks'
) AS table_exists;

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'question_feedbacks' 
ORDER BY ordinal_position;

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'question_feedbacks';

-- Check specific check constraints
SELECT cc.constraint_name, cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu 
  ON cc.constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'question_feedbacks';

-- Test valid feedback types (these should work)
-- Note: Replace the UUIDs with actual IDs from your database
/*
-- Test 1: Answer correction with suggested answer
INSERT INTO question_feedbacks (user_id, question_id, feedback_type, suggested_correct_answer) 
VALUES ('your-user-id-here', 'your-question-id-here', 'answer_correction', 'B');

-- Test 2: Other feedback type without suggested answer
INSERT INTO question_feedbacks (user_id, question_id, feedback_type) 
VALUES ('your-user-id-here', 'your-question-id-here', 'faulty_question');

-- Test 3: Feedback with session ID
INSERT INTO question_feedbacks (user_id, question_id, session_id, feedback_type) 
VALUES ('your-user-id-here', 'your-question-id-here', 'your-session-id-here', 'typo_grammar');
*/

-- Test invalid feedback type (this should fail)
-- INSERT INTO question_feedbacks (user_id, question_id, feedback_type) 
-- VALUES ('your-user-id-here', 'your-question-id-here', 'invalid_type');

-- Test invalid suggested answer (this should fail)
-- INSERT INTO question_feedbacks (user_id, question_id, feedback_type, suggested_correct_answer) 
-- VALUES ('your-user-id-here', 'your-question-id-here', 'answer_correction', 'Z');

-- View any existing feedback
SELECT * FROM question_feedbacks ORDER BY created_at DESC LIMIT 10;