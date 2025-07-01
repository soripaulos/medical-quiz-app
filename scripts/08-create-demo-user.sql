-- Create a demo user profile (this would normally be created via the auth trigger)
-- Note: You'll need to create the actual auth user through Supabase Auth UI or API

-- First, let's create some demo profiles for testing
-- (These would normally be created automatically when users sign up)

-- Insert demo student profile
INSERT INTO profiles (id, email, full_name, role) 
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'demo@medicalquiz.com', 
  'Demo Student', 
  'student'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Insert demo admin profile  
INSERT INTO profiles (id, email, full_name, role) 
VALUES (
  '00000000-0000-0000-0000-000000000002', 
  'admin@medicalquiz.com', 
  'Demo Admin', 
  'admin'
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Note: To actually use these demo accounts, you'll need to:
-- 1. Go to your Supabase project's Auth > Users
-- 2. Create users with these exact emails and IDs
-- 3. Set passwords for them
-- Or use the Supabase auth API to create these users programmatically
