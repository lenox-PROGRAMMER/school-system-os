-- Fix search_path security issue for the get_current_user_profile_id function
CREATE OR REPLACE FUNCTION get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;