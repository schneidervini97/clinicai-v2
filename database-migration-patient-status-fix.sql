-- Migration para corrigir status de pacientes existentes
-- Execute este SQL no Supabase SQL Editor

-- Definir status padrão 'active' para todos os pacientes que não têm status definido
UPDATE patients 
SET status = 'active' 
WHERE status IS NULL;

-- Adicionar comentário para documentar a mudança
COMMENT ON COLUMN patients.status IS 'Status do paciente: active (ativo), inactive (inativo), archived (arquivado). Padrão: active';

-- Verificar se há registros que ainda precisam ser corrigidos
-- (Execute este SELECT após o UPDATE para confirmar que todos os registros foram atualizados)
-- SELECT COUNT(*) as pacientes_sem_status FROM patients WHERE status IS NULL;