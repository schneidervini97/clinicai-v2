-- Migration para sistema de relatórios de marketing
-- Rastreamento de origem de leads do Meta Ads e Google Ads
-- Execute este SQL no Supabase após as outras migrations

-- 1. Tabela para rastrear campanhas de marketing
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Informações básicas da campanha
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('meta', 'google', 'whatsapp')),
  campaign_id VARCHAR(255), -- ID da campanha na plataforma
  
  -- Meta Ads específico
  meta_campaign_id VARCHAR(255),
  meta_adset_id VARCHAR(255),
  meta_ad_id VARCHAR(255),
  meta_campaign_name TEXT,
  
  -- Google Ads específico
  google_campaign_id VARCHAR(255),
  google_adgroup_id VARCHAR(255),
  google_keyword TEXT,
  google_utm_source VARCHAR(255),
  google_utm_medium VARCHAR(255),
  google_utm_campaign VARCHAR(255),
  google_utm_content VARCHAR(255),
  google_utm_term VARCHAR(255),
  
  -- Status e datas
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  start_date DATE,
  end_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Índices únicos por plataforma
  UNIQUE(clinic_id, platform, campaign_id)
);

-- 2. Tabela para rastrear leads de marketing
CREATE TABLE IF NOT EXISTS marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  
  -- Identificação do lead
  phone VARCHAR(20) NOT NULL, -- Telefone do WhatsApp
  name VARCHAR(255),
  
  -- Relacionamento com conversa e paciente (opcional)
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  
  -- Dados da origem
  source VARCHAR(50) NOT NULL CHECK (source IN ('meta', 'google', 'whatsapp', 'organic')),
  
  -- Meta Ads dados
  meta_campaign_id VARCHAR(255),
  meta_adset_id VARCHAR(255),
  meta_ad_id VARCHAR(255),
  meta_campaign_name TEXT,
  meta_message_id VARCHAR(255), -- ID da mensagem no Evolution API
  
  -- Google Ads dados
  google_utm_source VARCHAR(255),
  google_utm_medium VARCHAR(255),
  google_utm_campaign VARCHAR(255),
  google_utm_content VARCHAR(255),
  google_utm_term VARCHAR(255),
  google_tracking_id VARCHAR(255), -- Protocolo GA-XXXXXXXXX
  
  -- Dados adicionais do Evolution webhook
  evolution_message_data JSONB, -- Payload completo do webhook
  
  -- Status do lead
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN (
    'new',           -- Lead recém chegado
    'contacted',     -- Primeiro contato realizado
    'qualified',     -- Lead qualificado
    'appointment',   -- Agendamento realizado
    'converted',     -- Convertido em paciente
    'lost'          -- Lead perdido
  )),
  
  -- Funil de conversão
  first_message_at TIMESTAMP,
  first_response_at TIMESTAMP,
  appointment_scheduled_at TIMESTAMP,
  converted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Tabela para eventos de conversão
CREATE TABLE IF NOT EXISTS marketing_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES marketing_leads(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  
  -- Tipo de conversão
  conversion_type VARCHAR(50) NOT NULL CHECK (conversion_type IN (
    'first_message',    -- Primeira mensagem recebida
    'first_response',   -- Primeira resposta da clínica
    'appointment',      -- Agendamento realizado
    'patient_created',  -- Paciente cadastrado
    'first_visit'       -- Primeira consulta realizada
  )),
  
  -- Valor da conversão (opcional)
  conversion_value DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'BRL',
  
  -- Dados adicionais
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. View para relatórios de campanhas
CREATE VIEW marketing_campaign_stats AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.platform,
  c.clinic_id,
  c.status as campaign_status,
  
  -- Contadores de leads
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'new' THEN l.id END) as new_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'contacted' THEN l.id END) as contacted_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) as qualified_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'appointment' THEN l.id END) as appointment_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END) as converted_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'lost' THEN l.id END) as lost_leads,
  
  -- Taxas de conversão
  ROUND(
    (COUNT(DISTINCT CASE WHEN l.status = 'converted' THEN l.id END)::NUMERIC / 
     NULLIF(COUNT(DISTINCT l.id), 0) * 100), 2
  ) as conversion_rate,
  
  -- Estatísticas de tempo
  AVG(EXTRACT(EPOCH FROM (l.first_response_at - l.first_message_at))) as avg_response_time_seconds,
  AVG(EXTRACT(EPOCH FROM (l.converted_at - l.first_message_at))) as avg_conversion_time_seconds,
  
  -- Valor total de conversões
  COALESCE(SUM(conv.conversion_value), 0) as total_conversion_value,
  
  -- Datas
  MIN(l.created_at) as first_lead_at,
  MAX(l.created_at) as last_lead_at,
  c.created_at as campaign_created_at

FROM marketing_campaigns c
LEFT JOIN marketing_leads l ON c.id = l.campaign_id
LEFT JOIN marketing_conversions conv ON l.id = conv.lead_id
GROUP BY c.id, c.name, c.platform, c.clinic_id, c.status, c.created_at;

-- 5. View para relatórios diários
CREATE VIEW marketing_daily_stats AS
SELECT 
  clinic_id,
  DATE(created_at) as report_date,
  source,
  
  -- Contadores por fonte
  COUNT(*) as total_leads,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
  
  -- Taxa de conversão diária
  ROUND(
    (COUNT(CASE WHEN status = 'converted' THEN 1 END)::NUMERIC / 
     COUNT(*)::NUMERIC * 100), 2
  ) as daily_conversion_rate

FROM marketing_leads
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY clinic_id, DATE(created_at), source
ORDER BY clinic_id, report_date DESC, source;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_marketing_leads_clinic_id ON marketing_leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_phone ON marketing_leads(phone);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_source ON marketing_leads(source);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON marketing_leads(status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign_id ON marketing_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created_at ON marketing_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_conversation_id ON marketing_leads(conversation_id);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_clinic_id ON marketing_campaigns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_platform ON marketing_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);

CREATE INDEX IF NOT EXISTS idx_marketing_conversions_lead_id ON marketing_conversions(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketing_conversions_type ON marketing_conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_marketing_conversions_created_at ON marketing_conversions(created_at);

-- 7. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_marketing_campaigns_updated_at 
  BEFORE UPDATE ON marketing_campaigns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_leads_updated_at 
  BEFORE UPDATE ON marketing_leads 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. RLS Policies
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_conversions ENABLE ROW LEVEL SECURITY;

-- Política para marketing_campaigns
CREATE POLICY "Users can manage their clinic's marketing campaigns"
  ON marketing_campaigns
  FOR ALL
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Política para marketing_leads
CREATE POLICY "Users can manage their clinic's marketing leads"
  ON marketing_leads
  FOR ALL
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- Política para marketing_conversions
CREATE POLICY "Users can manage their clinic's marketing conversions"
  ON marketing_conversions
  FOR ALL
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE user_id = auth.uid()
    )
  );

-- 9. Funções auxiliares para relatórios

-- Função para criar lead automaticamente
CREATE OR REPLACE FUNCTION create_marketing_lead_from_message(
  p_clinic_id UUID,
  p_phone VARCHAR,
  p_conversation_id UUID,
  p_source VARCHAR,
  p_meta_data JSONB DEFAULT NULL,
  p_google_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  lead_id UUID;
  campaign_id UUID;
BEGIN
  -- Tentar encontrar campanha existente baseada nos dados
  IF p_source = 'meta' AND p_meta_data IS NOT NULL THEN
    SELECT id INTO campaign_id 
    FROM marketing_campaigns 
    WHERE clinic_id = p_clinic_id 
      AND platform = 'meta'
      AND meta_campaign_id = (p_meta_data->>'campaign_id')
    LIMIT 1;
  ELSIF p_source = 'google' AND p_google_data IS NOT NULL THEN
    SELECT id INTO campaign_id 
    FROM marketing_campaigns 
    WHERE clinic_id = p_clinic_id 
      AND platform = 'google'
      AND google_utm_campaign = (p_google_data->>'utm_campaign')
    LIMIT 1;
  END IF;

  -- Inserir lead
  INSERT INTO marketing_leads (
    clinic_id,
    phone,
    conversation_id,
    source,
    campaign_id,
    meta_campaign_id,
    meta_adset_id,
    meta_ad_id,
    meta_campaign_name,
    google_utm_source,
    google_utm_medium,
    google_utm_campaign,
    google_utm_content,
    google_utm_term,
    evolution_message_data,
    first_message_at
  ) VALUES (
    p_clinic_id,
    p_phone,
    p_conversation_id,
    p_source,
    campaign_id,
    CASE WHEN p_source = 'meta' THEN (p_meta_data->>'campaign_id') END,
    CASE WHEN p_source = 'meta' THEN (p_meta_data->>'adset_id') END,
    CASE WHEN p_source = 'meta' THEN (p_meta_data->>'ad_id') END,
    CASE WHEN p_source = 'meta' THEN (p_meta_data->>'campaign_name') END,
    CASE WHEN p_source = 'google' THEN (p_google_data->>'utm_source') END,
    CASE WHEN p_source = 'google' THEN (p_google_data->>'utm_medium') END,
    CASE WHEN p_source = 'google' THEN (p_google_data->>'utm_campaign') END,
    CASE WHEN p_source = 'google' THEN (p_google_data->>'utm_content') END,
    CASE WHEN p_source = 'google' THEN (p_google_data->>'utm_term') END,
    COALESCE(p_meta_data, p_google_data),
    NOW()
  )
  RETURNING id INTO lead_id;

  -- Criar evento de conversão para primeira mensagem
  INSERT INTO marketing_conversions (
    clinic_id,
    lead_id,
    campaign_id,
    conversion_type
  ) VALUES (
    p_clinic_id,
    lead_id,
    campaign_id,
    'first_message'
  );

  RETURN lead_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Comentários para documentação
COMMENT ON TABLE marketing_campaigns IS 'Campanhas de marketing do Meta Ads e Google Ads por clínica';
COMMENT ON TABLE marketing_leads IS 'Leads originados de campanhas de marketing com rastreamento de conversão';
COMMENT ON TABLE marketing_conversions IS 'Eventos de conversão ao longo do funil de marketing';

COMMENT ON COLUMN marketing_leads.evolution_message_data IS 'Payload completo do webhook Evolution API para auditoria';
COMMENT ON COLUMN marketing_leads.google_tracking_id IS 'Protocolo do Google Ads no formato GA-XXXXXXXXX extraído da mensagem';
COMMENT ON COLUMN marketing_campaigns.platform IS 'Plataforma de origem: meta (Facebook/Instagram), google (Google Ads), whatsapp (orgânico)';

-- 11. Views para dashboard de relatórios
CREATE VIEW marketing_funnel_summary AS
SELECT 
  clinic_id,
  source,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN first_response_at IS NOT NULL THEN 1 END) as responded_leads,
  COUNT(CASE WHEN status = 'appointment' THEN 1 END) as appointment_leads,
  COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
  
  -- Taxas de conversão do funil
  ROUND(COUNT(CASE WHEN first_response_at IS NOT NULL THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 1) as response_rate,
  ROUND(COUNT(CASE WHEN status = 'appointment' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 1) as appointment_rate,
  ROUND(COUNT(CASE WHEN status = 'converted' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100, 1) as conversion_rate,
  
  -- Tempos médios
  ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at - first_message_at))/3600)::NUMERIC, 1) as avg_response_hours,
  ROUND(AVG(EXTRACT(EPOCH FROM (converted_at - first_message_at))/86400)::NUMERIC, 1) as avg_conversion_days

FROM marketing_leads 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY clinic_id, source;