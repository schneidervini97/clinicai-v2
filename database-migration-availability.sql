-- ========================================================================
-- AVAILABILITY TABLE - ADICIONAL MIGRATION
-- ========================================================================
-- Execute este script APÓS ter executado database-migration-appointments.sql
-- Este script adiciona apenas a tabela availability que foi criada posteriormente
-- ========================================================================

-- Criar tabela availability
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

-- Habilitar RLS
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_availability_professional_id ON availability(professional_id);
CREATE INDEX IF NOT EXISTS idx_availability_day_of_week ON availability(day_of_week);

-- ========================================================================
-- VERIFICAÇÃO FINAL
-- ========================================================================
-- Verificar se a tabela foi criada com sucesso
SELECT 
  schemaname, 
  tablename, 
  tableowner
FROM pg_tables 
WHERE tablename = 'availability';

-- Verificar se as políticas RLS foram criadas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'availability';