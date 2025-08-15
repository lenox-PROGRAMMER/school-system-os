-- Add student-lecturer assignments and hostel assignments

-- 1. Add lecturer_id to profiles for student-lecturer assignment
ALTER TABLE public.profiles ADD COLUMN lecturer_id uuid REFERENCES public.profiles(id);

-- 2. Create student_hostel_assignments table
CREATE TABLE public.student_hostel_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hostel_id uuid NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  assigned_by uuid NOT NULL REFERENCES public.profiles(id),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'assigned',
  notes text,
  UNIQUE(student_id, hostel_id)
);

-- 3. Add status and forwarded fields to results table for result forwarding
ALTER TABLE public.results ADD COLUMN forwarded_at timestamp with time zone;
ALTER TABLE public.results ADD COLUMN forwarded_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.results ADD COLUMN student_notified boolean DEFAULT false;

-- 4. Enable RLS on student_hostel_assignments
ALTER TABLE public.student_hostel_assignments ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for student_hostel_assignments
CREATE POLICY "Admins can manage hostel assignments" 
ON public.student_hostel_assignments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Students can view their hostel assignments" 
ON public.student_hostel_assignments 
FOR SELECT 
USING (
  student_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Lecturers can view their assigned students hostel assignments" 
ON public.student_hostel_assignments 
FOR SELECT 
USING (
  student_id IN (
    SELECT id FROM public.profiles 
    WHERE lecturer_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'lecturer'
    )
  )
);

-- 6. Create indexes for better performance
CREATE INDEX idx_student_hostel_assignments_student_id ON public.student_hostel_assignments(student_id);
CREATE INDEX idx_student_hostel_assignments_hostel_id ON public.student_hostel_assignments(hostel_id);
CREATE INDEX idx_profiles_lecturer_id ON public.profiles(lecturer_id);

-- 7. Create trigger for updated_at on student_hostel_assignments
CREATE TRIGGER update_student_hostel_assignments_updated_at
  BEFORE UPDATE ON public.student_hostel_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();