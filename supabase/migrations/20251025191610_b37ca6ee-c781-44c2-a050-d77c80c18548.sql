-- Create optimized function to get current user's profile id
CREATE OR REPLACE FUNCTION get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Drop existing RLS policies for fee_accounts
DROP POLICY IF EXISTS "Students can view their own fee account" ON fee_accounts;
DROP POLICY IF EXISTS "Admins can manage fee accounts" ON fee_accounts;

-- Create optimized RLS policies for fee_accounts
CREATE POLICY "Students can view their own fee account"
ON fee_accounts
FOR SELECT
USING (
  student_id = get_current_user_profile_id()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'lecturer')
  )
);

CREATE POLICY "Admins can manage fee accounts"
ON fee_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Drop existing RLS policies for fee_payments
DROP POLICY IF EXISTS "Students can view their own payments" ON fee_payments;
DROP POLICY IF EXISTS "Students can submit payments" ON fee_payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON fee_payments;

-- Create optimized RLS policies for fee_payments
CREATE POLICY "Students can view their own payments"
ON fee_payments
FOR SELECT
USING (
  student_id = get_current_user_profile_id()
  OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Students can submit payments"
ON fee_payments
FOR INSERT
WITH CHECK (student_id = get_current_user_profile_id());

CREATE POLICY "Admins can manage all payments"
ON fee_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Add additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_status ON fee_payments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_submitted_at ON fee_payments(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_role ON profiles(user_id, role);

-- Add index on school_data for faster paybill lookup
CREATE INDEX IF NOT EXISTS idx_school_data_id ON school_data(id);