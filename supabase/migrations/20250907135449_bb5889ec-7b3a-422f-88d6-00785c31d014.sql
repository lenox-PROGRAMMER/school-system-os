-- Add missing foreign key constraints for proper relationships

-- Add foreign key constraints to rooms table
ALTER TABLE public.rooms 
ADD CONSTRAINT rooms_hostel_id_fkey 
FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;

-- Add foreign key constraints to room_bookings table
ALTER TABLE public.room_bookings 
ADD CONSTRAINT room_bookings_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.room_bookings 
ADD CONSTRAINT room_bookings_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;

ALTER TABLE public.room_bookings 
ADD CONSTRAINT room_bookings_responded_by_fkey 
FOREIGN KEY (responded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraints to student_hostel_assignments table
ALTER TABLE public.student_hostel_assignments 
ADD CONSTRAINT student_hostel_assignments_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.student_hostel_assignments 
ADD CONSTRAINT student_hostel_assignments_hostel_id_fkey 
FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;

ALTER TABLE public.student_hostel_assignments 
ADD CONSTRAINT student_hostel_assignments_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;

ALTER TABLE public.student_hostel_assignments 
ADD CONSTRAINT student_hostel_assignments_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints to results table
ALTER TABLE public.results 
ADD CONSTRAINT results_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.results 
ADD CONSTRAINT results_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.results 
ADD CONSTRAINT results_audited_by_fkey 
FOREIGN KEY (audited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.results 
ADD CONSTRAINT results_published_by_fkey 
FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.results 
ADD CONSTRAINT results_forwarded_by_fkey 
FOREIGN KEY (forwarded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraints to assignments table
ALTER TABLE public.assignments 
ADD CONSTRAINT assignments_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.assignments 
ADD CONSTRAINT assignments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints to submissions table
ALTER TABLE public.submissions 
ADD CONSTRAINT submissions_assignment_id_fkey 
FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

ALTER TABLE public.submissions 
ADD CONSTRAINT submissions_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.submissions 
ADD CONSTRAINT submissions_graded_by_fkey 
FOREIGN KEY (graded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraints to enrollments table
ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.enrollments 
ADD CONSTRAINT enrollments_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- Add foreign key constraints to courses table
ALTER TABLE public.courses 
ADD CONSTRAINT courses_lecturer_id_fkey 
FOREIGN KEY (lecturer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add foreign key constraints to academic_calendar table
ALTER TABLE public.academic_calendar 
ADD CONSTRAINT academic_calendar_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints to school_data table
ALTER TABLE public.school_data 
ADD CONSTRAINT school_data_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;