-- Add indexes to improve query performance for fee-related tables
CREATE INDEX IF NOT EXISTS idx_fee_accounts_student_id ON public.fee_accounts(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON public.fee_payments(status);

-- Create attendance tracking table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance approval table
CREATE TABLE public.attendance_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_ids UUID[] NOT NULL,
  lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for attendance tables
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_lecturer_id ON public.attendance(lecturer_id);
CREATE INDEX idx_attendance_course_id ON public.attendance(course_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_attendance_approvals_lecturer_id ON public.attendance_approvals(lecturer_id);
CREATE INDEX idx_attendance_approvals_status ON public.attendance_approvals(status);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_approvals ENABLE ROW LEVEL SECURITY;

-- RLS policies for attendance
CREATE POLICY "Lecturers can manage attendance for their courses"
ON public.attendance
FOR ALL
USING (
  lecturer_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Students can view their own attendance"
ON public.attendance
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'lecturer')
  )
);

-- RLS policies for attendance approvals
CREATE POLICY "Lecturers can submit and view their approvals"
ON public.attendance_approvals
FOR ALL
USING (
  lecturer_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage all approvals"
ON public.attendance_approvals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();