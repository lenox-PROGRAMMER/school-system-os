-- Create enrollment_requests table for students to request course enrollment
CREATE TABLE public.enrollment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES public.profiles(id),
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);

-- Enable RLS
ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

-- Students can create enrollment requests
CREATE POLICY "Students can create enrollment requests"
ON public.enrollment_requests
FOR INSERT
TO authenticated
WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Students can view their own requests
CREATE POLICY "Students can view their own requests"
ON public.enrollment_requests
FOR SELECT
TO authenticated
USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
       EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can manage all enrollment requests
CREATE POLICY "Admins can manage enrollment requests"
ON public.enrollment_requests
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'));