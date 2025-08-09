-- Create edge function for admin user creation since auth.admin requires service role
-- First, let's make sure we have all the necessary roles properly set up

-- Update the role column to use proper enum values
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE text;

-- Add check constraint for valid roles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'student', 'lecturer'));

-- Create a function that admins can call to create new users
-- This will be used via an edge function with service role privileges
CREATE OR REPLACE FUNCTION public.get_user_profile(user_email text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.user_id, p.full_name, p.email, p.role, p.created_at
  FROM public.profiles p
  WHERE p.email = user_email;
END;
$$;