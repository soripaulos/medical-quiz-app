-- Add updated_at column to user_sessions if it doesn't exist
ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
