-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Specialties
CREATE TABLE specialties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exam types
CREATE TABLE exam_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions
CREATE TABLE questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  explanation TEXT NOT NULL,
  explanation_image_url TEXT,
  sources TEXT,
  year INTEGER,
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  specialty_id UUID REFERENCES specialties(id),
  exam_type_id UUID REFERENCES exam_types(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answer choices
CREATE TABLE answer_choices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  choice_letter TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions
CREATE TABLE user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  session_name TEXT NOT NULL,
  session_type TEXT CHECK (session_type IN ('practice', 'exam')),
  is_active BOOLEAN DEFAULT TRUE,
  is_paused BOOLEAN DEFAULT FALSE,
  track_progress BOOLEAN DEFAULT TRUE,
  total_questions INTEGER DEFAULT 0,
  current_question_index INTEGER DEFAULT 0,
  time_limit INTEGER, -- in minutes
  time_remaining INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Session questions (questions in a specific session)
CREATE TABLE session_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  question_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User answers
CREATE TABLE user_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  question_id UUID REFERENCES questions(id),
  session_id UUID REFERENCES user_sessions(id),
  selected_choice_id UUID REFERENCES answer_choices(id),
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id, session_id)
);

-- User question progress (overall progress per question)
CREATE TABLE user_question_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  question_id UUID REFERENCES questions(id),
  times_attempted INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT FALSE,
  last_attempted TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- User notes
CREATE TABLE user_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  question_id UUID REFERENCES questions(id),
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, question_id)
);

-- Lab values
CREATE TABLE lab_values (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL,
  test_name TEXT NOT NULL,
  reference_range TEXT NOT NULL,
  units TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_questions_specialty ON questions(specialty_id);
CREATE INDEX idx_questions_exam_type ON questions(exam_type_id);
CREATE INDEX idx_questions_year ON questions(year);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_user_answers_user_question ON user_answers(user_id, question_id);
CREATE INDEX idx_user_question_progress_user ON user_question_progress(user_id);
CREATE INDEX idx_session_questions_session ON session_questions(session_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Everyone can view questions" ON questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage questions" ON questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Everyone can view answer choices" ON answer_choices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage answer choices" ON answer_choices FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can manage their own sessions" ON user_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view session questions for their sessions" ON session_questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_sessions WHERE id = session_id AND user_id = auth.uid())
);

CREATE POLICY "Users can manage their own answers" ON user_answers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own progress" ON user_question_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON user_notes FOR ALL USING (auth.uid() = user_id);
