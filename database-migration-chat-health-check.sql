-- Migration para sistema de health check do WhatsApp
-- Adiciona campos para monitoramento automático de conectividade
-- Execute este SQL no Supabase após database-migration-chat.sql

-- 1. Adicionar campos de health check na tabela whatsapp_connections
ALTER TABLE whatsapp_connections 
ADD COLUMN IF NOT EXISTS last_health_check_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS health_check_status VARCHAR(20) DEFAULT 'unknown' 
    CHECK (health_check_status IN ('unknown', 'healthy', 'unhealthy', 'stale', 'not_found')),
ADD COLUMN IF NOT EXISTS health_check_error TEXT,
ADD COLUMN IF NOT EXISTS health_check_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMP WITH TIME ZONE;

-- 2. Função para verificar saúde das conexões WhatsApp
CREATE OR REPLACE FUNCTION check_whatsapp_connections_health()
RETURNS void AS $$
BEGIN
  -- Marca conexões conectadas há mais de 5 minutos sem health check como stale
  UPDATE whatsapp_connections
  SET status = 'disconnected',
      health_check_status = 'stale',
      health_check_error = 'No health check received in 5 minutes',
      updated_at = NOW()
  WHERE status = 'connected'
    AND (last_health_check_at IS NULL OR last_health_check_at < NOW() - INTERVAL '5 minutes');

  -- Marca conexões com QR Code há mais de 10 minutos como expiradas
  UPDATE whatsapp_connections
  SET status = 'disconnected',
      health_check_status = 'stale',
      health_check_error = 'QR Code expired - no connection in 10 minutes',
      qr_code = NULL,
      updated_at = NOW()
  WHERE status = 'qr_code'
    AND updated_at < NOW() - INTERVAL '10 minutes';

  -- Log da execução
  RAISE NOTICE 'WhatsApp connections health check completed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função para atualizar health check de uma conexão específica
CREATE OR REPLACE FUNCTION update_whatsapp_health_check(
  connection_id UUID,
  new_status VARCHAR(20),
  error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_connections
  SET last_health_check_at = NOW(),
      health_check_status = new_status,
      health_check_error = error_message,
      health_check_count = health_check_count + 1,
      updated_at = NOW()
  WHERE id = connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para marcar última atividade (ping) de uma conexão
CREATE OR REPLACE FUNCTION ping_whatsapp_connection(
  connection_instance_name TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_connections
  SET last_ping_at = NOW(),
      health_check_status = 'healthy',
      updated_at = NOW()
  WHERE instance_name = connection_instance_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. View para monitoramento de conexões
CREATE OR REPLACE VIEW whatsapp_connection_health AS
SELECT 
  wc.id,
  wc.clinic_id,
  wc.instance_name,
  wc.status,
  wc.health_check_status,
  wc.phone_number,
  wc.created_at,
  wc.updated_at,
  wc.last_health_check_at,
  wc.last_ping_at,
  wc.health_check_count,
  wc.health_check_error,
  
  -- Calculado: há quanto tempo foi o último health check
  CASE 
    WHEN wc.last_health_check_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (NOW() - wc.last_health_check_at))
  END as seconds_since_last_health_check,
  
  -- Calculado: há quanto tempo foi o último ping
  CASE 
    WHEN wc.last_ping_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (NOW() - wc.last_ping_at))
  END as seconds_since_last_ping,
  
  -- Status consolidado baseado em múltiplos fatores
  CASE 
    WHEN wc.status = 'connected' AND wc.health_check_status = 'healthy' 
      AND wc.last_health_check_at > NOW() - INTERVAL '2 minutes' THEN 'online'
    WHEN wc.status = 'qr_code' AND wc.updated_at > NOW() - INTERVAL '10 minutes' THEN 'waiting_connection'
    WHEN wc.status = 'connected' AND (wc.last_health_check_at IS NULL 
      OR wc.last_health_check_at < NOW() - INTERVAL '5 minutes') THEN 'stale'
    WHEN wc.health_check_status = 'not_found' THEN 'instance_deleted'
    WHEN wc.status = 'disconnected' THEN 'offline'
    ELSE 'unknown'
  END as consolidated_status

FROM whatsapp_connections wc;

-- 6. Função para obter status consolidado de uma clínica
CREATE OR REPLACE FUNCTION get_clinic_whatsapp_status(clinic_uuid UUID)
RETURNS TABLE (
  connection_id UUID,
  instance_name TEXT,
  status TEXT,
  health_status VARCHAR(20),
  consolidated_status TEXT,
  last_check_seconds BIGINT,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wch.id,
    wch.instance_name,
    wch.status,
    wch.health_check_status,
    wch.consolidated_status,
    CASE 
      WHEN wch.last_health_check_at IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (NOW() - wch.last_health_check_at))::BIGINT
    END,
    wch.health_check_error
  FROM whatsapp_connection_health wch
  WHERE wch.clinic_id = clinic_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger para atualizar automatically last_ping_at quando há atividade
CREATE OR REPLACE FUNCTION trigger_ping_on_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para connected ou qr_code, atualizar ping
  IF (NEW.status != OLD.status AND NEW.status IN ('connected', 'qr_code')) THEN
    NEW.last_ping_at = NOW();
    NEW.health_check_status = 'healthy';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela whatsapp_connections
DROP TRIGGER IF EXISTS trigger_whatsapp_ping_on_activity ON whatsapp_connections;
CREATE TRIGGER trigger_whatsapp_ping_on_activity
  BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ping_on_activity();

-- 8. Scheduling do health check (opcional - requer pg_cron extension)
-- Para ativar verificação automática via cron job a cada 2 minutos, execute:
-- SELECT cron.schedule('whatsapp-health-check', '0,2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52,54,56,58 * * * *', 'SELECT check_whatsapp_connections_health();');

-- 9. Índices para performance das consultas de health check
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_health_check 
  ON whatsapp_connections(last_health_check_at, health_check_status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_ping 
  ON whatsapp_connections(last_ping_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status_updated 
  ON whatsapp_connections(status, updated_at);

-- 10. Comentários para documentação
COMMENT ON COLUMN whatsapp_connections.last_health_check_at 
  IS 'Timestamp da última verificação de saúde da instância';

COMMENT ON COLUMN whatsapp_connections.health_check_status 
  IS 'Status da verificação: unknown, healthy, unhealthy, stale, not_found';

COMMENT ON COLUMN whatsapp_connections.health_check_error 
  IS 'Mensagem de erro da última verificação, se houver';

COMMENT ON COLUMN whatsapp_connections.health_check_count 
  IS 'Contador de verificações realizadas';

COMMENT ON COLUMN whatsapp_connections.last_ping_at 
  IS 'Timestamp da última atividade/ping da conexão';

COMMENT ON FUNCTION check_whatsapp_connections_health() 
  IS 'Função para verificação automática da saúde das conexões WhatsApp';

COMMENT ON VIEW whatsapp_connection_health 
  IS 'View consolidada com informações de saúde das conexões WhatsApp';

-- 11. Dados iniciais - marcar conexões existentes para verificação
UPDATE whatsapp_connections 
SET health_check_status = 'unknown',
    health_check_count = 0
WHERE health_check_status IS NULL;