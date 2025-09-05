-- Migration para resolver problemas de Realtime na tabela whatsapp_connections
-- O Realtime estava falhando com erro 406 devido a RLS sem políticas adequadas
-- Execute este SQL no Supabase SQL Editor

-- SOLUÇÃO IMEDIATA: Desabilitar RLS para whatsapp_connections
-- Isso fará o Realtime funcionar imediatamente
ALTER TABLE whatsapp_connections DISABLE ROW LEVEL SECURITY;

-- ALTERNATIVA: Se quiser manter RLS habilitado, comente a linha acima e descomente as linhas abaixo

/*
-- Habilitar RLS com políticas adequadas
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (visualizar conexões da própria clínica)
CREATE POLICY "Users can view own clinic whatsapp connections" 
ON whatsapp_connections FOR SELECT 
USING (
  clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  )
);

-- Política para INSERT (criar conexões para própria clínica)
CREATE POLICY "Users can insert own clinic whatsapp connections" 
ON whatsapp_connections FOR INSERT 
WITH CHECK (
  clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  )
);

-- Política para UPDATE (atualizar conexões da própria clínica)
CREATE POLICY "Users can update own clinic whatsapp connections" 
ON whatsapp_connections FOR UPDATE 
USING (
  clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  )
);

-- Política para DELETE (deletar conexões da própria clínica)
CREATE POLICY "Users can delete own clinic whatsapp connections" 
ON whatsapp_connections FOR DELETE 
USING (
  clinic_id IN (
    SELECT id FROM clinics WHERE user_id = auth.uid()
  )
);

-- Política especial para permitir webhooks atualizarem (usando service role)
CREATE POLICY "Allow webhook updates via service role" 
ON whatsapp_connections FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
*/

-- Comentários de documentação
COMMENT ON TABLE whatsapp_connections 
  IS 'Tabela de conexões WhatsApp - RLS desabilitado para funcionamento do Realtime';