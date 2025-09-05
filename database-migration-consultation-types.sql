-- ========================================================================
-- CONSULTATION TYPES MODULE - DATABASE MIGRATION
-- ========================================================================
-- Run this after database-migration-appointments.sql
-- 
-- This migration creates tables for managing different types of consultations
-- with pricing, duration, and professional associations
-- ========================================================================

-- ========================================================================
-- 1. CONSULTATION TYPES TABLE
-- ========================================================================
-- Stores different types of consultations/appointments available at the clinic

CREATE TABLE IF NOT EXISTS consultation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30, -- Duration in minutes
  price DECIMAL(10, 2), -- Price per consultation
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for calendar display
  active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Mark one as default for quick selection
  requires_preparation BOOLEAN DEFAULT false, -- If patient needs special preparation
  preparation_instructions TEXT, -- Instructions for patient preparation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, name) -- Prevent duplicate names per clinic
);

-- ========================================================================
-- 2. PROFESSIONAL CONSULTATION TYPES TABLE
-- ========================================================================
-- Links professionals to the consultation types they can perform

CREATE TABLE IF NOT EXISTS professional_consultation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  consultation_type_id UUID NOT NULL REFERENCES consultation_types(id) ON DELETE CASCADE,
  custom_duration INTEGER, -- Override default duration for this professional
  custom_price DECIMAL(10, 2), -- Override default price for this professional
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(professional_id, consultation_type_id)
);

-- ========================================================================
-- 3. UPDATE APPOINTMENTS TABLE
-- ========================================================================
-- Add foreign key reference to consultation types

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS consultation_type_id UUID REFERENCES consultation_types(id);

-- Update existing appointments to use a default consultation type if needed
-- This will be done after consultation types are created

-- ========================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ========================================================================

-- Enable RLS on new tables
ALTER TABLE consultation_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_consultation_types ENABLE ROW LEVEL SECURITY;

-- Consultation types policies
CREATE POLICY "Users can view their clinic's consultation types" ON consultation_types
  FOR SELECT USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their clinic's consultation types" ON consultation_types
  FOR ALL USING (clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  ));

-- Professional consultation types policies
CREATE POLICY "Users can view their clinic's professional consultation types" ON professional_consultation_types
  FOR SELECT USING (professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage their clinic's professional consultation types" ON professional_consultation_types
  FOR ALL USING (professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  ));

-- ========================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ========================================================================

CREATE INDEX IF NOT EXISTS idx_consultation_types_clinic_id ON consultation_types(clinic_id);
CREATE INDEX IF NOT EXISTS idx_consultation_types_active ON consultation_types(active);
CREATE INDEX IF NOT EXISTS idx_professional_consultation_types_professional ON professional_consultation_types(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_consultation_types_type ON professional_consultation_types(consultation_type_id);
CREATE INDEX IF NOT EXISTS idx_appointments_consultation_type ON appointments(consultation_type_id);

-- ========================================================================
-- 6. DEFAULT CONSULTATION TYPES
-- ========================================================================
-- Function to create default consultation types for new clinics

CREATE OR REPLACE FUNCTION create_default_consultation_types(p_clinic_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO consultation_types (clinic_id, name, description, duration, price, color, is_default)
  VALUES 
    (p_clinic_id, 'Consulta', 'Consulta médica padrão', 30, NULL, '#3B82F6', true),
    (p_clinic_id, 'Retorno', 'Consulta de retorno', 30, NULL, '#10B981', false),
    (p_clinic_id, 'Exame', 'Realização de exames', 45, NULL, '#F59E0B', false),
    (p_clinic_id, 'Procedimento', 'Procedimento médico', 60, NULL, '#EF4444', false),
    (p_clinic_id, 'Primeira Consulta', 'Primeira consulta com anamnese completa', 60, NULL, '#8B5CF6', false)
  ON CONFLICT (clinic_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 7. TRIGGER FOR AUTOMATIC DEFAULT TYPES
-- ========================================================================
-- Automatically create default consultation types when a new clinic is created

CREATE OR REPLACE FUNCTION trigger_create_default_consultation_types()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_consultation_types(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_consultation_types_on_clinic_creation
  AFTER INSERT ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_consultation_types();

-- ========================================================================
-- 8. HELPER FUNCTIONS
-- ========================================================================

-- Function to get consultation types for a professional
CREATE OR REPLACE FUNCTION get_professional_consultation_types(
  p_professional_id UUID
)
RETURNS TABLE(
  consultation_type_id UUID,
  name VARCHAR(100),
  description TEXT,
  duration INTEGER,
  price DECIMAL(10, 2),
  color VARCHAR(7),
  custom_duration INTEGER,
  custom_price DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.id as consultation_type_id,
    ct.name,
    ct.description,
    COALESCE(pct.custom_duration, ct.duration) as duration,
    COALESCE(pct.custom_price, ct.price) as price,
    ct.color,
    pct.custom_duration,
    pct.custom_price
  FROM consultation_types ct
  LEFT JOIN professional_consultation_types pct 
    ON ct.id = pct.consultation_type_id 
    AND pct.professional_id = p_professional_id
  WHERE ct.active = true
    AND (pct.available = true OR pct.available IS NULL)
  ORDER BY ct.is_default DESC, ct.name;
END;
$$ LANGUAGE plpgsql;

-- ========================================================================
-- 9. MIGRATION FOR EXISTING DATA
-- ========================================================================
-- Create default consultation types for existing clinics

DO $$
DECLARE
  clinic_record RECORD;
BEGIN
  FOR clinic_record IN SELECT id FROM clinics LOOP
    PERFORM create_default_consultation_types(clinic_record.id);
  END LOOP;
END $$;

-- ========================================================================
-- MIGRATION COMPLETE
-- ========================================================================
-- 
-- Next steps:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. Default consultation types will be created automatically
-- 3. Implement the consultation types management interface
-- 4. Update appointment booking to use consultation types
-- ========================================================================