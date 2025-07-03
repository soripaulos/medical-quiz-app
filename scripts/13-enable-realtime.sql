-- Enable Realtime for tables (standard method - no replication needed)
-- This works with all Supabase plans

-- Enable realtime for user_answers table
ALTER PUBLICATION supabase_realtime ADD TABLE user_answers;

-- Enable realtime for user_question_progress table  
ALTER PUBLICATION supabase_realtime ADD TABLE user_question_progress;

-- Enable realtime for user_sessions table (optional - for session status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE user_sessions;

-- Verify which tables are enabled for realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'; 