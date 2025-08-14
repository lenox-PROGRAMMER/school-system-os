-- Fix security vulnerabilities

-- 1. Create security definer function to safely check user roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Drop existing problematic policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 3. Create new secure policies using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() = 'admin');

-- 4. Add policy to prevent users from changing their own role
CREATE POLICY "Users cannot change their own role" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  (
    -- Allow self-updates except for role changes
    (OLD.role = NEW.role) OR 
    -- Only admins can change roles
    (public.get_current_user_role() = 'admin')
  )
);

-- 5. Add policy to prevent unauthorized role escalation
CREATE POLICY "Only admins can assign admin role" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  role != 'admin' OR 
  public.get_current_user_role() = 'admin'
);