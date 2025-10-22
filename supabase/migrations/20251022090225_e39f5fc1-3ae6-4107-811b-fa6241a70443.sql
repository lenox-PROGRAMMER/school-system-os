-- Create storage bucket for payment slips
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-slips', 'payment-slips', false);

-- Create fee_accounts table to track student balances
CREATE TABLE public.fee_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE,
  total_fees NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (total_fees - amount_paid) STORED,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create fee_payments table for payment submissions
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_slip_url TEXT,
  transaction_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  admin_notes TEXT,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Enable RLS
ALTER TABLE public.fee_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fee_accounts
CREATE POLICY "Students can view their own fee account"
ON public.fee_accounts FOR SELECT
USING (
  student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'lecturer'))
);

CREATE POLICY "Admins can manage fee accounts"
ON public.fee_accounts FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for fee_payments
CREATE POLICY "Students can view their own payments"
ON public.fee_payments FOR SELECT
USING (
  student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Students can submit payments"
ON public.fee_payments FOR INSERT
WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all payments"
ON public.fee_payments FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Storage policies for payment slips
CREATE POLICY "Students can upload their payment slips"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-slips' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view their own payment slips"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-slips' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payment slips"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-slips'
  AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Trigger for updating fee_accounts timestamp
CREATE TRIGGER update_fee_accounts_updated_at
BEFORE UPDATE ON public.fee_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_fee_accounts_student_id ON public.fee_accounts(student_id);
CREATE INDEX idx_fee_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX idx_fee_payments_status ON public.fee_payments(status);