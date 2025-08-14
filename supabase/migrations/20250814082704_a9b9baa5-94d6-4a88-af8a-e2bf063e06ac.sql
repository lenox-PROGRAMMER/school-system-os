-- Fix the infinite recursion in RLS policies

-- 1. Drop all existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users cannot change their own role" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can assign admin role" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 2. Drop the problematic function and recreate it properly
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- 3. Create a simple, non-recursive function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Create simple, non-recursive policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "Users can update own profile except role" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  (OLD.role = NEW.role OR public.is_admin())
);

CREATE POLICY "Only admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (public.is_admin());

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;