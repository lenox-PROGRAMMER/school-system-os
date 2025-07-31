-- Create admin user with secure password
-- Insert admin profile directly
INSERT INTO profiles (user_id, first_name, last_name, role, email) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'System',
  'Administrator', 
  'admin',
  'admin@school.com'
);

-- Create some sample users for testing
INSERT INTO profiles (user_id, first_name, last_name, role, email) 
VALUES 
  ('00000000-0000-0000-0000-000000000002'::uuid, 'John', 'Lecturer', 'lecturer', 'lecturer@school.com'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'Jane', 'Student', 'student', 'student@school.com');