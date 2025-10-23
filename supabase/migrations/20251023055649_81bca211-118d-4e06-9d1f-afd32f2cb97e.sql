-- Add paybill columns to school_data table
ALTER TABLE public.school_data 
ADD COLUMN IF NOT EXISTS paybill_number TEXT,
ADD COLUMN IF NOT EXISTS paybill_account_number TEXT;