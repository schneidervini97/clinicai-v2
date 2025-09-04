-- Atualização do sistema de chat para suporte completo de mídia com base64
-- Adiciona campo para armazenar mídia completa em base64
-- Execute este SQL no Supabase após database-migration-chat-media.sql

-- Adicionar campo para mídia completa em base64
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_base64 TEXT;

-- Adicionar campo para status de processamento de mídia
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_processing_status VARCHAR(20) DEFAULT 'pending';

-- Comentários para documentação
COMMENT ON COLUMN messages.media_base64 IS 'Mídia completa em formato base64 (data URL)';
COMMENT ON COLUMN messages.media_processing_status IS 'Status do processamento de mídia: pending, processing, completed, failed';

-- Índice para consultas por status de processamento
CREATE INDEX IF NOT EXISTS idx_messages_media_processing ON messages(media_processing_status) 
WHERE message_type != 'text' AND media_processing_status != 'completed';

-- View para monitoramento de processamento de mídia
CREATE OR REPLACE VIEW media_processing_queue AS
SELECT 
  id,
  conversation_id,
  clinic_id,
  message_type,
  evolution_message_id,
  media_processing_status,
  created_at,
  CASE 
    WHEN media_processing_status = 'pending' AND created_at < NOW() - INTERVAL '1 minute' THEN 'overdue'
    WHEN media_processing_status = 'processing' AND created_at < NOW() - INTERVAL '5 minutes' THEN 'stuck'
    ELSE 'normal'
  END as priority
FROM messages 
WHERE message_type != 'text' 
  AND media_processing_status != 'completed'
ORDER BY created_at ASC;

COMMENT ON VIEW media_processing_queue IS 'Fila de processamento de mídia com prioridades';

-- Função para marcar mídia como processada
CREATE OR REPLACE FUNCTION mark_media_processed(
  message_id UUID, 
  base64_data TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE messages 
  SET 
    media_base64 = base64_data,
    media_processing_status = 'completed'
  WHERE id = message_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar falha no processamento
CREATE OR REPLACE FUNCTION mark_media_failed(
  message_id UUID, 
  error_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE messages 
  SET 
    media_processing_status = 'failed'
  WHERE id = message_id;
  
  -- Log do erro (opcional - pode implementar tabela de logs)
  -- INSERT INTO media_processing_errors (message_id, error_reason, created_at)
  -- VALUES (message_id, error_reason, NOW());
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Atualizar mensagens existentes de mídia para status pending
UPDATE messages 
SET media_processing_status = 'pending'
WHERE message_type != 'text' 
  AND media_processing_status IS NULL;

-- Estatísticas de processamento
CREATE OR REPLACE VIEW media_processing_stats AS
SELECT 
  clinic_id,
  message_type,
  media_processing_status,
  COUNT(*) as total_messages,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds
FROM messages 
WHERE message_type != 'text'
GROUP BY clinic_id, message_type, media_processing_status
ORDER BY clinic_id, message_type, media_processing_status;

COMMENT ON VIEW media_processing_stats IS 'Estatísticas de processamento de mídia por clínica e tipo';