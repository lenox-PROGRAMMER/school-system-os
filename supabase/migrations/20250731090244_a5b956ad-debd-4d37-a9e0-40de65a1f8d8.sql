-- Update the admin profile to allow login
UPDATE profiles 
SET user_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE email = 'admin@school.com';