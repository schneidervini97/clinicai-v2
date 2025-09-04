-- Atualização do sistema de chat para suporte otimizado de mídia
-- Baseado nos payloads reais da Evolution API
-- Execute este SQL no Supabase após database-migration-chat.sql

-- Adicionar campos de metadados de mídia na tabela messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_mime_type TEXT,
ADD COLUMN IF NOT EXISTS media_size INTEGER,
ADD COLUMN IF NOT EXISTS media_width INTEGER,
ADD COLUMN IF NOT EXISTS media_height INTEGER,
ADD COLUMN IF NOT EXISTS media_duration INTEGER, -- duração em segundos para áudio/vídeo
ADD COLUMN IF NOT EXISTS media_thumbnail TEXT, -- base64 do thumbnail
ADD COLUMN IF NOT EXISTS media_waveform TEXT, -- waveform do áudio em base64
ADD COLUMN IF NOT EXISTS is_voice_note BOOLEAN DEFAULT FALSE; -- flag para mensagem de voz (ptt)

-- Índices para performance de consultas de mídia
CREATE INDEX IF NOT EXISTS idx_messages_media_type ON messages(message_type) WHERE message_type != 'text';
CREATE INDEX IF NOT EXISTS idx_messages_media_size ON messages(media_size) WHERE media_size IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_voice_notes ON messages(is_voice_note) WHERE is_voice_note = TRUE;

-- Comentários para documentação
COMMENT ON COLUMN messages.media_mime_type IS 'Tipo MIME do arquivo de mídia (ex: image/jpeg, video/mp4)';
COMMENT ON COLUMN messages.media_size IS 'Tamanho do arquivo de mídia em bytes';
COMMENT ON COLUMN messages.media_width IS 'Largura da imagem/vídeo em pixels';
COMMENT ON COLUMN messages.media_height IS 'Altura da imagem/vídeo em pixels';
COMMENT ON COLUMN messages.media_duration IS 'Duração do áudio/vídeo em segundos';
COMMENT ON COLUMN messages.media_thumbnail IS 'Thumbnail da mídia em formato base64';
COMMENT ON COLUMN messages.media_waveform IS 'Waveform do áudio em formato base64';
COMMENT ON COLUMN messages.is_voice_note IS 'Indica se o áudio é uma nota de voz (ptt=true)';

-- Função para formatar tamanho de arquivo (opcional, para uso futuro)
CREATE OR REPLACE FUNCTION format_file_size(size_bytes INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF size_bytes IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF size_bytes < 1024 THEN
    RETURN size_bytes || ' B';
  ELSIF size_bytes < 1048576 THEN
    RETURN ROUND(size_bytes::NUMERIC / 1024, 1) || ' KB';
  ELSE
    RETURN ROUND(size_bytes::NUMERIC / 1048576, 1) || ' MB';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para formatar duração (opcional, para uso futuro)
CREATE OR REPLACE FUNCTION format_duration(seconds INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF seconds IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN LPAD((seconds / 60)::TEXT, 2, '0') || ':' || LPAD((seconds % 60)::TEXT, 2, '0');
END;
$$ LANGUAGE plpgsql;

-- View para estatísticas de mídia (opcional)
CREATE OR REPLACE VIEW media_stats AS
SELECT 
  c.id as clinic_id,
  COUNT(CASE WHEN m.message_type = 'image' THEN 1 END) as total_images,
  COUNT(CASE WHEN m.message_type = 'video' THEN 1 END) as total_videos,
  COUNT(CASE WHEN m.message_type = 'audio' THEN 1 END) as total_audios,
  COUNT(CASE WHEN m.is_voice_note = TRUE THEN 1 END) as total_voice_notes,
  COUNT(CASE WHEN m.message_type = 'document' THEN 1 END) as total_documents,
  COALESCE(SUM(m.media_size), 0) as total_media_size,
  AVG(m.media_duration) as avg_media_duration
FROM clinics c
LEFT JOIN conversations conv ON c.id = conv.clinic_id
LEFT JOIN messages m ON conv.id = m.conversation_id AND m.message_type != 'text'
GROUP BY c.id;

COMMENT ON VIEW media_stats IS 'Estatísticas de uso de mídia por clínica';