-- Add active_session_id to profiles table for tracking user's current active session
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS active_session_id UUID REFERENCES user_sessions(id);

-- Add index for better performance when querying active sessions
CREATE INDEX IF NOT EXISTS idx_profiles_active_session ON profiles(active_session_id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.active_session_id IS 'The ID of the user''s currently active test session (for cross-device sync)';

-- Update RLS policies to allow users to read their own active_session_id
-- (This is already covered by existing "Users can view their own profile" policy)

-- Create a function to get user's active session (optional helper)
CREATE OR REPLACE FUNCTION get_user_active_session(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT active_session_id 
    FROM profiles 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_active_session(UUID) TO authenticated; 