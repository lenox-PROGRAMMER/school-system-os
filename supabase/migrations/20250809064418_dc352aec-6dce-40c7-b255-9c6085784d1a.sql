-- Fix the admin user's profile to link it to the auth user
UPDATE profiles 
SET user_id = 'a8f4fcd9-524d-4021-9cbc-f69c875e8464'
WHERE email = 'lenox@gmail.com' AND user_id IS NULL;