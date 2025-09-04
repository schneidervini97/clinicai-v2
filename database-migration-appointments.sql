-- ========================================================================
-- APPOINTMENTS MODULE - DATABASE MIGRATION
-- ========================================================================
-- Run this after database-migration-patients.sql
-- 
-- This migration creates all tables needed for the appointments/scheduling system
-- ========================================================================

-- ========================================================================
-- 1. PROFESSIONALS TABLE
-- ========================================================================
-- Stores healthcare professionals that can have appointments scheduled

CREATE TABLE IF NOT EXISTS professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id), -- Optional: if professional has system access
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  specialty VARCHAR(100), -- Cardiologia, Pediatria, etc.
  registration_number VARCHAR(50), -- CRM, CRO, etc.
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 2. PROFESSIONAL SCHEDULES TABLE
-- ========================================================================
-- Defines working hours for each professional by day of week

CREATE TABLE IF NOT EXISTS professional_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  lunch_start TIME,
  lunch_end TIME,
  appointment_duration INTEGER DEFAULT 30, -- Duration in minutes
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, weekday)
);

-- ========================================================================
-- 3. SCHEDULE EXCEPTIONS TABLE
-- ========================================================================
-- Handles holidays, vacations, and other schedule exceptions

CREATE TABLE IF NOT EXISTS schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'holiday', 'vacation', 'sick_leave', 'other'
  description TEXT,
  all_day BOOLEAN DEFAULT true,
  start_time TIME, -- If not all day
  end_time TIME,   -- If not all day
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- 4. APPOINTMENTS TABLE
-- ========================================================================
-- Main appointments/consultations table

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
  type VARCHAR(50) DEFAULT 'consultation', -- 'consultation', 'return', 'exam', 'procedure'
  notes TEXT, -- Patient visible notes
  internal_notes TEXT, -- Internal clinic notes
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, date, start_time) -- Prevent double booking
);

-- ========================================================================
-- 5. AVAILABILITY TABLE
-- ========================================================================
-- Professional availability configuration (flexible multi-period per day)

CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, day_of_week, start_time)
);

-- ========================================================================
-- 6. APPOINTMENT HISTORY TABLE
-- ========================================================================
-- Audit trail for all appointment changes

CREATE TABLE IF NOT EXISTS appointment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'cancelled', 'confirmed', 'completed'
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  previous_data JSONB, -- Previous state
  new_data JSONB,      -- New state
  notes TEXT           -- Additional context
);

-- ========================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ========================================================================
-- Multi-tenant security: users only see their clinic's data

-- Enable RLS on all tables
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;

-- Professionals policies
CREATE POLICY "Users can view their clinic's professionals" ON professionals
  FOR SELECT USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their clinic's professionals" ON professionals
  FOR ALL USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

-- Professional schedules policies
CREATE POLICY "Users can view their clinic's professional schedules" ON professional_schedules
  FOR SELECT USING (professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their clinic's professional schedules" ON professional_schedules
  FOR ALL USING (professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

-- Schedule exceptions policies
CREATE POLICY "Users can view their clinic's schedule exceptions" ON schedule_exceptions
  FOR SELECT USING (professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their clinic's schedule exceptions" ON schedule_exceptions
  FOR ALL USING (professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

-- Appointments policies
CREATE POLICY "Users can view their clinic's appointments" ON appointments
  FOR SELECT USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their clinic's appointments" ON appointments
  FOR ALL USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

-- Availability policies
CREATE POLICY "Users can view their clinic's availability" ON availability
  FOR SELECT USING (professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their clinic's availability" ON availability
  FOR ALL USING (professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

-- Appointment history policies
CREATE POLICY "Users can view their clinic's appointment history" ON appointment_history
  FOR SELECT USING (appointment_id IN (
    SELECT a.id FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert appointment history" ON appointment_history
  FOR INSERT WITH CHECK (appointment_id IN (
    SELECT a.id FROM appointments a
    JOIN clinics c ON a.clinic_id = c.id
    WHERE c.user_id = auth.uid()
  ));

-- ========================================================================
-- 8. INDEXES FOR PERFORMANCE
-- ========================================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_professionals_clinic_id ON professionals(clinic_id);
CREATE INDEX IF NOT EXISTS idx_professional_schedules_professional_id ON professional_schedules(professional_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_professional_id ON schedule_exceptions(professional_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON schedule_exceptions(date);
CREATE INDEX IF NOT EXISTS idx_availability_professional_id ON availability(professional_id);
CREATE INDEX IF NOT EXISTS idx_availability_day_of_week ON availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointment_history_appointment_id ON appointment_history(appointment_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date_range ON appointments(date, professional_id) WHERE status != 'cancelled';

-- ========================================================================
-- 8. TRIGGERS FOR AUDIT TRAIL
-- ========================================================================

-- Function to automatically create history records
CREATE OR REPLACE FUNCTION create_appointment_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO appointment_history (appointment_id, action, changed_by, new_data, notes)
    VALUES (NEW.id, 'created', auth.uid(), to_jsonb(NEW), 'Appointment created');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO appointment_history (appointment_id, action, changed_by, previous_data, new_data, notes)
    VALUES (NEW.id, 'updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW), 'Appointment updated');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO appointment_history (appointment_id, action, changed_by, previous_data, notes)
    VALUES (OLD.id, 'deleted', auth.uid(), to_jsonb(OLD), 'Appointment deleted');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_appointment_history
  AFTER INSERT OR UPDATE OR DELETE ON appointments
  FOR EACH ROW EXECUTE FUNCTION create_appointment_history();

-- ========================================================================
-- 9. HELPER FUNCTIONS
-- ========================================================================

-- Function to get available time slots for a professional on a date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_professional_id UUID,
  p_date DATE,
  p_duration INTEGER DEFAULT 30
)
RETURNS TABLE(slot_time TIME) AS $$
DECLARE
  schedule_record RECORD;
  slot_start TIME;
  slot_end TIME;
  current_slot TIME;
BEGIN
  -- Get the professional's schedule for this weekday
  SELECT start_time, end_time, lunch_start, lunch_end, appointment_duration
  INTO schedule_record
  FROM professional_schedules 
  WHERE professional_id = p_professional_id 
    AND weekday = EXTRACT(DOW FROM p_date)::INTEGER
    AND active = true;
  
  IF NOT FOUND THEN
    RETURN; -- No schedule found for this day
  END IF;
  
  -- Generate slots from start_time to lunch_start
  current_slot := schedule_record.start_time;
  WHILE current_slot < COALESCE(schedule_record.lunch_start, schedule_record.end_time) LOOP
    -- Check if this slot is not already booked
    IF NOT EXISTS (
      SELECT 1 FROM appointments 
      WHERE professional_id = p_professional_id 
        AND date = p_date 
        AND start_time = current_slot
        AND status NOT IN ('cancelled')
    ) THEN
      slot_time := current_slot;
      RETURN NEXT;
    END IF;
    
    current_slot := current_slot + (COALESCE(schedule_record.appointment_duration, p_duration) || ' minutes')::INTERVAL;
  END LOOP;
  
  -- Generate slots from lunch_end to end_time (if lunch exists)
  IF schedule_record.lunch_end IS NOT NULL THEN
    current_slot := schedule_record.lunch_end;
    WHILE current_slot < schedule_record.end_time LOOP
      -- Check if this slot is not already booked
      IF NOT EXISTS (
        SELECT 1 FROM appointments 
        WHERE professional_id = p_professional_id 
          AND date = p_date 
          AND start_time = current_slot
          AND status NOT IN ('cancelled')
      ) THEN
        slot_time := current_slot;
        RETURN NEXT;
      END IF;
      
      current_slot := current_slot + (COALESCE(schedule_record.appointment_duration, p_duration) || ' minutes')::INTERVAL;
    END LOOP;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- MIGRATION COMPLETE
-- ========================================================================
-- 
-- Next steps:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. Create some sample professionals and schedules
-- 3. Test the get_available_slots function
-- 4. Begin implementing the appointments module
-- ========================================================================