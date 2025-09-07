-- Add missing foreign key constraints (checking if they don't already exist)

-- Add foreign key constraints to rooms table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'rooms_hostel_id_fkey' 
        AND table_name = 'rooms'
    ) THEN
        ALTER TABLE public.rooms 
        ADD CONSTRAINT rooms_hostel_id_fkey 
        FOREIGN KEY (hostel_id) REFERENCES public.hostels(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints to room_bookings table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'room_bookings_student_id_fkey' 
        AND table_name = 'room_bookings'
    ) THEN
        ALTER TABLE public.room_bookings 
        ADD CONSTRAINT room_bookings_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'room_bookings_room_id_fkey' 
        AND table_name = 'room_bookings'
    ) THEN
        ALTER TABLE public.room_bookings 
        ADD CONSTRAINT room_bookings_room_id_fkey 
        FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints to results table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'results_student_id_fkey' 
        AND table_name = 'results'
    ) THEN
        ALTER TABLE public.results 
        ADD CONSTRAINT results_student_id_fkey 
        FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'results_course_id_fkey' 
        AND table_name = 'results'
    ) THEN
        ALTER TABLE public.results 
        ADD CONSTRAINT results_course_id_fkey 
        FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;
    END IF;
END $$;