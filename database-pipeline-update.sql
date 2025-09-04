-- Pipeline feature: Add pipeline columns to patients table
-- Run this in Supabase SQL Editor after the existing migrations

-- Add pipeline columns to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'LEAD' CHECK (
  pipeline_stage IN ('LEAD', 'CONTATO_INICIAL', 'AGENDAMENTO', 'COMPARECIMENTO', 'FECHAMENTO', 'DESISTENCIA')
),
ADD COLUMN IF NOT EXISTS pipeline_entered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_patients_pipeline_stage ON patients(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_patients_pipeline_entered_at ON patients(pipeline_entered_at);

-- Update existing patients to have default pipeline stage
UPDATE patients 
SET pipeline_stage = 'FECHAMENTO', pipeline_entered_at = created_at 
WHERE pipeline_stage IS NULL;

-- Comment: Existing patients are set to FECHAMENTO since they are already active patients