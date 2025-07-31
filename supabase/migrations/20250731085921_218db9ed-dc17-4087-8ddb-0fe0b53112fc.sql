-- Create admin user in auth.users table and profiles
-- Note: In production, you'd typically do this through Supabase Auth Admin API
-- For now, we'll create a profile entry that can be used once the auth user is created

-- Insert admin profile (auth user will need to be created manually in Supabase dashboard)
INSERT INTO profiles (id, user_id, full_name, role, email) 
VALUES (
  gen_random_uuid(),
  NULL, -- Will be updated when auth user is created
  'System Administrator',
  'admin',
  'admin@school.com'
) ON CONFLICT (email) DO NOTHING;

-- Create sample profiles for testing
INSERT INTO profiles (id, user_id, full_name, role, email) 
VALUES 
  (gen_random_uuid(), NULL, 'John Lecturer', 'lecturer', 'lecturer@school.com'),
  (gen_random_uuid(), NULL, 'Jane Student', 'student', 'student@school.com')
ON CONFLICT (email) DO NOTHING;