-- ========================================================================
-- DEBUG QUERIES PARA SUPABASE - RESOLVER ERRO 406
-- ========================================================================
-- Execute essas queries no Supabase SQL Editor para diagnosticar o problema

-- 1. VERIFICAR SE AS TABELAS EXISTEM E STATUS DO RLS
-- ========================================================================
SELECT tablename, tableowner, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('professional_schedules', 'schedule_exceptions', 'professionals', 'appointments');

-- 2. VERIFICAR POLÍTICAS RLS
-- ========================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('professional_schedules', 'schedule_exceptions');

-- 3. TESTAR ACESSO DIRETO ÀS TABELAS (ESSENCIAL)
-- ========================================================================
-- Teste 1: professional_schedules
SELECT COUNT(*) as total_schedules FROM professional_schedules;

-- Teste 2: schedule_exceptions  
SELECT COUNT(*) as total_exceptions FROM schedule_exceptions;

-- Teste 3: Verificar se conseguimos fazer SELECT básico
SELECT * FROM professional_schedules LIMIT 1;
SELECT * FROM schedule_exceptions LIMIT 1;

-- Teste 4: QUERY SIMPLES PARA TESTAR PERMISSÕES
-- Se essas queries funcionarem, o problema não é de permissão básica
SELECT 'professional_schedules OK' as test_result;
SELECT 'schedule_exceptions OK' as test_result;

-- 4. VERIFICAR ESTRUTURA DAS TABELAS
-- ========================================================================
-- professional_schedules
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'professional_schedules' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- schedule_exceptions
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'schedule_exceptions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. TESTAR QUERY ESPECÍFICA QUE ESTÁ FALHANDO
-- ========================================================================
-- Substitua o UUID pelo ID real do profissional que está nos logs
SELECT * 
FROM professional_schedules 
WHERE professional_id = '3d0d56db-d1d8-4ed7-a68c-94267f112191'
AND weekday = 4 
AND active = true;

SELECT * 
FROM schedule_exceptions 
WHERE professional_id = '3d0d56db-d1d8-4ed7-a68c-94267f112191'
AND date = '2025-09-04';

-- ========================================================================
-- SOLUÇÕES POTENCIAIS (EXECUTE APENAS SE NECESSÁRIO)
-- ========================================================================

-- OPÇÃO A: Se RLS estiver ativo mas sem políticas adequadas
-- Remover RLS temporariamente para teste
-- ALTER TABLE professional_schedules DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE schedule_exceptions DISABLE ROW LEVEL SECURITY;

-- OPÇÃO B: Adicionar políticas temporárias mais permissivas
-- CREATE POLICY "temp_allow_all" ON professional_schedules FOR ALL USING (true);
-- CREATE POLICY "temp_allow_all" ON schedule_exceptions FOR ALL USING (true);

-- OPÇÃO C: Verificar se as políticas existem mas estão muito restritivas
-- DROP POLICY IF EXISTS "Users can view their clinic's professional schedules" ON professional_schedules;
-- DROP POLICY IF EXISTS "Users can view their clinic's schedule exceptions" ON schedule_exceptions;

-- Recriar políticas corretamente
-- CREATE POLICY "Users can view their clinic's professional schedules" ON professional_schedules
--   FOR SELECT USING (professional_id IN (
--     SELECT p.id FROM professionals p 
--     JOIN clinics c ON p.clinic_id = c.id 
--     WHERE c.user_id = auth.uid()
--   ));

-- CREATE POLICY "Users can view their clinic's schedule exceptions" ON schedule_exceptions
--   FOR SELECT USING (professional_id IN (
--     SELECT p.id FROM professionals p 
--     JOIN clinics c ON p.clinic_id = c.id 
--     WHERE c.user_id = auth.uid()
--   ));

-- ========================================================================
-- SOLUÇÃO 1: DESABILITAR RLS TEMPORARIAMENTE (RÁPIDO)
-- ========================================================================
-- Execute APENAS se os testes acima confirmarem que o problema é RLS

ALTER TABLE professional_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions DISABLE ROW LEVEL SECURITY;

-- ========================================================================
-- SOLUÇÃO 2: CRIAR POLÍTICAS RLS CORRETAS (RECOMENDADO)
-- ========================================================================
-- Execute esta seção para manter RLS mas com políticas adequadas

-- REABILITAR RLS SE DESABILITADO ACIMA
-- ALTER TABLE professional_schedules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;

-- Políticas para professional_schedules
CREATE POLICY "Users can view their clinic's professional schedules" 
ON professional_schedules FOR SELECT 
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their clinic's professional schedules" 
ON professional_schedules FOR ALL 
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);

-- Políticas para schedule_exceptions
CREATE POLICY "Users can view their clinic's schedule exceptions" 
ON schedule_exceptions FOR SELECT 
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their clinic's schedule exceptions" 
ON schedule_exceptions FOR ALL 
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM professionals p 
    JOIN clinics c ON p.clinic_id = c.id 
    WHERE c.user_id = auth.uid()
  )
);

-- ========================================================================
-- INSTRUÇÕES DE USO:
-- ========================================================================
-- 
-- PASSO 1: Execute as queries de diagnóstico (seções 1-4)
-- PASSO 2: Se COUNT(*) falhar, confirma que é problema de RLS
-- PASSO 3: Escolha uma das soluções:
--   - SOLUÇÃO 1: Rápida (desabilita RLS) para teste imediato
--   - SOLUÇÃO 2: Recomendada (cria políticas corretas)
-- PASSO 4: Teste a aplicação em http://localhost:3001/dashboard/agenda
-- PASSO 5: Se usar SOLUÇÃO 1, migre para SOLUÇÃO 2 depois
-- 
-- ========================================================================