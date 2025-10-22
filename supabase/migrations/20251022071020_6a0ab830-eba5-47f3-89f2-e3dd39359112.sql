-- Add status field to submissions table for approval workflow
ALTER TABLE public.submissions 
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Add check constraint for valid status values
ALTER TABLE public.submissions 
ADD CONSTRAINT submissions_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create index for better query performance
CREATE INDEX idx_submissions_status ON public.submissions(status);