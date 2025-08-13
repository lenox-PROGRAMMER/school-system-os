-- Create hostels table
CREATE TABLE public.hostels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  total_rooms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_id UUID NOT NULL,
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  occupied INTEGER NOT NULL DEFAULT 0,
  price NUMERIC,
  amenities TEXT[],
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, room_number)
);

-- Create room bookings table
CREATE TABLE public.room_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  room_id UUID NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  admin_response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  academic_year TEXT,
  semester TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create academic calendar table
CREATE TABLE public.academic_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('semester_start', 'semester_end', 'exam', 'holiday', 'registration', 'other')),
  start_date DATE NOT NULL,
  end_date DATE,
  academic_year TEXT NOT NULL,
  semester TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create results table
CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  course_id UUID NOT NULL,
  grade TEXT,
  points NUMERIC,
  gpa NUMERIC,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  audited_by UUID,
  audited_at TIMESTAMP WITH TIME ZONE,
  published_by UUID,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id, academic_year, semester)
);

-- Enable RLS on all tables
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hostels
CREATE POLICY "Everyone can view hostels" ON public.hostels FOR SELECT USING (true);
CREATE POLICY "Only admins can manage hostels" ON public.hostels FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for rooms
CREATE POLICY "Everyone can view available rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Only admins can manage rooms" ON public.rooms FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for room bookings
CREATE POLICY "Students can view their bookings" ON public.room_bookings FOR SELECT USING (
  student_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'lecturer'))
);
CREATE POLICY "Students can create bookings" ON public.room_bookings FOR INSERT WITH CHECK (
  student_id = auth.uid()
);
CREATE POLICY "Students can update their pending bookings" ON public.room_bookings FOR UPDATE USING (
  student_id = auth.uid() AND status = 'pending'
);
CREATE POLICY "Admins can manage all bookings" ON public.room_bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for academic calendar
CREATE POLICY "Everyone can view calendar" ON public.academic_calendar FOR SELECT USING (true);
CREATE POLICY "Only admins can manage calendar" ON public.academic_calendar FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for results
CREATE POLICY "Students can view their published results" ON public.results FOR SELECT USING (
  (student_id = auth.uid() AND status = 'published') OR
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'lecturer'))
);
CREATE POLICY "Only admins can manage results" ON public.results FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create triggers for updated_at
CREATE TRIGGER update_hostels_updated_at BEFORE UPDATE ON public.hostels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_room_bookings_updated_at BEFORE UPDATE ON public.room_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_academic_calendar_updated_at BEFORE UPDATE ON public.academic_calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON public.results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();