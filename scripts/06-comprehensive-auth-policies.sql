-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Everyone can view questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Everyone can view answer choices" ON answer_choices;
DROP POLICY IF EXISTS "Admins can manage answer choices" ON answer_choices;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view session questions for their sessions" ON session_questions;
DROP POLICY IF EXISTS "Users can manage their own answers" ON user_answers;
DROP POLICY IF EXISTS "Users can manage their own progress" ON user_question_progress;
DROP POLICY IF EXISTS "Users can manage their own notes" ON user_notes;
DROP POLICY IF EXISTS "Users can manage their own statistics" ON user_statistics;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin(auth.uid()));

-- Specialties policies (read-only for users, manage for admins)
CREATE POLICY "Authenticated users can view specialties" ON specialties
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage specialties" ON specialties
  FOR ALL USING (is_admin(auth.uid()));

-- Exam types policies (read-only for users, manage for admins)
CREATE POLICY "Authenticated users can view exam types" ON exam_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage exam types" ON exam_types
  FOR ALL USING (is_admin(auth.uid()));

-- Questions policies
CREATE POLICY "Authenticated users can view questions" ON questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage questions" ON questions
  FOR ALL USING (is_admin(auth.uid()));

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON user_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR SELECT USING (is_admin(auth.uid()));

-- Session questions policies
CREATE POLICY "Users can view session questions for their sessions" ON session_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage session questions for their sessions" ON session_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_sessions 
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all session questions" ON session_questions
  FOR ALL USING (is_admin(auth.uid()));

-- User answers policies
CREATE POLICY "Users can view their own answers" ON user_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own answers" ON user_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers" ON user_answers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own answers" ON user_answers
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all answers" ON user_answers
  FOR SELECT USING (is_admin(auth.uid()));

-- User question progress policies
CREATE POLICY "Users can view their own progress" ON user_question_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" ON user_question_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON user_question_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON user_question_progress
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress" ON user_question_progress
  FOR SELECT USING (is_admin(auth.uid()));

-- User notes policies
CREATE POLICY "Users can view their own notes" ON user_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" ON user_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON user_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON user_notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notes" ON user_notes
  FOR SELECT USING (is_admin(auth.uid()));

-- User statistics policies
CREATE POLICY "Users can view their own statistics" ON user_statistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own statistics" ON user_statistics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statistics" ON user_statistics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statistics" ON user_statistics
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all statistics" ON user_statistics
  FOR SELECT USING (is_admin(auth.uid()));

-- Lab values policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view lab values" ON lab_values
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage lab values" ON lab_values
  FOR ALL USING (is_admin(auth.uid()));

-- Enable RLS on all tables that don't have it yet
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_values ENABLE ROW LEVEL SECURITY;

-- Create a function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
