-- Add session activity tracking fields to user_sessions table
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS session_paused_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_active_time INTEGER DEFAULT 0, -- Total time spent actively in session (seconds)
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for better performance on session activity queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_sessions(user_id, session_started_at, session_paused_at);

-- Create a function to calculate total active time for a session
CREATE OR REPLACE FUNCTION calculate_session_active_time(
  session_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  total_time INTEGER := 0;
  session_record RECORD;
BEGIN
  -- Get session details
  SELECT 
    total_active_time,
    session_started_at,
    session_paused_at,
    is_paused,
    is_active
  INTO session_record
  FROM user_sessions 
  WHERE id = session_id;
  
  -- If session is currently active and not paused, add current session time
  IF session_record.is_active AND NOT session_record.is_paused AND session_record.session_started_at IS NOT NULL THEN
    total_time := session_record.total_active_time + 
                  EXTRACT(EPOCH FROM (NOW() - session_record.session_started_at))::INTEGER;
  ELSE
    total_time := session_record.total_active_time;
  END IF;
  
  RETURN total_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_session_active_time(UUID) TO authenticated;

-- Create a function to start session activity tracking
CREATE OR REPLACE FUNCTION start_session_activity(
  session_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions 
  SET 
    session_started_at = NOW(),
    session_paused_at = NULL,
    last_activity_at = NOW(),
    is_paused = FALSE
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to pause session activity tracking
CREATE OR REPLACE FUNCTION pause_session_activity(
  session_id UUID
)
RETURNS VOID AS $$
DECLARE
  session_record RECORD;
  current_active_time INTEGER := 0;
BEGIN
  -- Get current session details
  SELECT 
    total_active_time,
    session_started_at,
    is_paused
  INTO session_record
  FROM user_sessions 
  WHERE id = session_id;
  
  -- Only pause if not already paused and session was started
  IF NOT session_record.is_paused AND session_record.session_started_at IS NOT NULL THEN
    -- Calculate current active time
    current_active_time := session_record.total_active_time + 
                          EXTRACT(EPOCH FROM (NOW() - session_record.session_started_at))::INTEGER;
    
    -- Update session with paused state and accumulated time
    UPDATE user_sessions 
    SET 
      session_paused_at = NOW(),
      total_active_time = current_active_time,
      last_activity_at = NOW(),
      is_paused = TRUE
    WHERE id = session_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to resume session activity tracking
CREATE OR REPLACE FUNCTION resume_session_activity(
  session_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_sessions 
  SET 
    session_started_at = NOW(),
    session_paused_at = NULL,
    last_activity_at = NOW(),
    is_paused = FALSE
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to end session activity tracking
CREATE OR REPLACE FUNCTION end_session_activity(
  session_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  final_active_time INTEGER := 0;
  session_record RECORD;
BEGIN
  -- Get current session details
  SELECT 
    total_active_time,
    session_started_at,
    is_paused
  INTO session_record
  FROM user_sessions 
  WHERE id = session_id;
  
  -- Calculate final active time
  IF session_record.session_started_at IS NOT NULL AND NOT session_record.is_paused THEN
    final_active_time := session_record.total_active_time + 
                        EXTRACT(EPOCH FROM (NOW() - session_record.session_started_at))::INTEGER;
  ELSE
    final_active_time := session_record.total_active_time;
  END IF;
  
  -- Update session with final time and completed state
  UPDATE user_sessions 
  SET 
    total_active_time = final_active_time,
    completed_at = NOW(),
    is_active = FALSE,
    is_paused = FALSE,
    last_activity_at = NOW()
  WHERE id = session_id;
  
  RETURN final_active_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION start_session_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pause_session_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION resume_session_activity(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_session_activity(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN user_sessions.session_started_at IS 'Timestamp when the user last started/resumed the session';
COMMENT ON COLUMN user_sessions.session_paused_at IS 'Timestamp when the session was last paused';
COMMENT ON COLUMN user_sessions.total_active_time IS 'Total time spent actively in the session (seconds)';
COMMENT ON COLUMN user_sessions.last_activity_at IS 'Last time the session was updated'; 